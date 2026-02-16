import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createHmac } from "node:crypto";
import prisma from "../db.server";
import { decrypt } from "../utils/encryption";
import { createSubscriber, updateSubscriberByPaystackCode } from "../models/subscriber.server";
import { createInvoice, updateInvoiceByRef } from "../models/invoice.server";
import { sendWhatsAppNotification } from "../models/whatsapp.server";
import { initiateDunning, cancelDunning } from "../models/dunning.server";

function verifySignature(body: string, signature: string, secretKey: string): boolean {
  const hash = createHmac("sha512", secretKey).update(body).digest("hex");
  return hash === signature;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  return handlePaystackWebhook(request);
};

async function handlePaystackWebhook(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("=== PAYSTACK WEBHOOK ===", event.event);

  const shops = await prisma.shop.findMany({
    where: { paystackSecretKey: { not: null } },
  });

  let verifiedShop = null;
  for (const shop of shops) {
    try {
      const secretKey = decrypt(shop.paystackSecretKey!);
      if (verifySignature(body, signature, secretKey)) {
        verifiedShop = shop;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!verifiedShop) {
    console.log("Webhook signature verification failed");
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log("Webhook verified for shop:", verifiedShop.shopDomain);

  const { event: eventType, data } = event;

  switch (eventType) {
    case "charge.success":
      await handleChargeSuccess(verifiedShop.id, data);
      break;

    case "subscription.create":
      await handleSubscriptionCreate(verifiedShop.id, data);
      break;

    case "subscription.not_renew":
    case "subscription.disable":
      await handleSubscriptionDisable(verifiedShop.id, data);
      break;

    case "invoice.update":
      await handleInvoiceUpdate(data);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(verifiedShop.id, data);
      break;

    default:
      console.log(`Unhandled Paystack event: ${eventType}`);
  }

  return json({ ok: true });
}

async function handleChargeSuccess(shopId: string, data: any) {
  const { reference, amount, currency, customer, plan: planData, metadata } = data;

  if (planData?.plan_code) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { paystackPlanCode: planData.plan_code, shopId },
    });

    if (plan) {
      let subscriber = await prisma.subscriber.findFirst({
        where: {
          email: customer.email,
          planId: plan.id,
        },
      });

      if (!subscriber) {
        subscriber = await createSubscriber({
          planId: plan.id,
          shopifyCustomerId: metadata?.shopify_customer_id || "",
          email: customer.email,
          paystackCustomerCode: customer.customer_code,
          phone: metadata?.phone,
          whatsappOptIn: metadata?.whatsapp_opt_in === true,
          promoCodeId: metadata?.promo_code_id,
          trialEndsAt: metadata?.trial_days > 0
            ? new Date(Date.now() + metadata.trial_days * 86400000)
            : undefined,
        });
      } else if (metadata?.phone && !subscriber.phone) {
        await prisma.subscriber.update({
          where: { id: subscriber.id },
          data: {
            phone: metadata.phone,
            whatsappOptIn: metadata.whatsapp_opt_in === true,
          },
        });
      }

      await createInvoice({
        subscriberId: subscriber.id,
        amount,
        currency: currency || plan.currency,
        status: "paid",
        paystackRef: reference,
        paidAt: new Date(),
      });

      // Cancel any active dunning
      await cancelDunning(subscriber.id);

      // Send WhatsApp notification
      if (subscriber.whatsappOptIn && subscriber.phone) {
        await sendWhatsAppNotification(
          shopId,
          subscriber.id,
          subscriber.phone,
          "payment_confirmation",
          `Payment of ${(amount / 100).toLocaleString()} ${currency || plan.currency} received for ${plan.name}. Thank you!`,
        );
      }

      console.log("Created subscriber + invoice for", customer.email);
    } else {
      console.log("No matching plan found for", planData.plan_code);
    }
  }
}

async function handleSubscriptionCreate(shopId: string, data: any) {
  const { subscription_code, plan: planData, customer, next_payment_date } = data;

  if (!planData?.plan_code) return;

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { paystackPlanCode: planData.plan_code, shopId },
  });

  if (!plan) return;

  const existing = await prisma.subscriber.findFirst({
    where: { email: customer.email, planId: plan.id },
  });

  if (existing) {
    await prisma.subscriber.update({
      where: { id: existing.id },
      data: {
        paystackSubscriptionCode: subscription_code,
        paystackCustomerCode: customer.customer_code,
        status: "active",
        nextBillingDate: next_payment_date ? new Date(next_payment_date) : null,
      },
    });
  } else {
    await createSubscriber({
      planId: plan.id,
      shopifyCustomerId: "",
      email: customer.email,
      paystackCustomerCode: customer.customer_code,
      paystackSubscriptionCode: subscription_code,
      nextBillingDate: next_payment_date ? new Date(next_payment_date) : undefined,
    });
  }

  console.log("Subscription created/updated for", customer.email);
}

async function handleSubscriptionDisable(shopId: string, data: any) {
  const { subscription_code } = data;
  if (!subscription_code) return;

  const subscriber = await updateSubscriberByPaystackCode(subscription_code, {
    status: "cancelled",
  });

  // Send WhatsApp notification
  if (subscriber?.whatsappOptIn && subscriber.phone) {
    await sendWhatsAppNotification(
      shopId,
      subscriber.id,
      subscriber.phone,
      "subscription_cancelled",
      `Your subscription has been cancelled. We're sorry to see you go. Visit your portal to resubscribe anytime.`,
    );
  }
}

async function handlePaymentFailed(shopId: string, data: any) {
  const { subscription, customer } = data;
  if (!subscription?.subscription_code) return;

  const subscriber = await prisma.subscriber.findFirst({
    where: { paystackSubscriptionCode: subscription.subscription_code },
  });

  if (subscriber) {
    await initiateDunning(subscriber.id);

    if (subscriber.whatsappOptIn && subscriber.phone) {
      await sendWhatsAppNotification(
        shopId,
        subscriber.id,
        subscriber.phone,
        "payment_failed",
        `Your payment failed. Please update your payment method to keep your subscription active.`,
      );
    }
  }
}

async function handleInvoiceUpdate(data: any) {
  const { reference, paid } = data;
  if (!reference) return;

  await updateInvoiceByRef(reference, {
    status: paid ? "paid" : "failed",
    paidAt: paid ? new Date() : undefined,
  });
}
