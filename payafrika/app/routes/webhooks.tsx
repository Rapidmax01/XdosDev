import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createHmac } from "node:crypto";
import prisma from "../db.server";
import { decrypt } from "../utils/encryption";
import { createSubscriber, updateSubscriberByPaystackCode } from "../models/subscriber.server";
import { createInvoice, updateInvoiceByRef } from "../models/invoice.server";

function verifySignature(body: string, signature: string, secretKey: string): boolean {
  const hash = createHmac("sha512", secretKey).update(body).digest("hex");
  return hash === signature;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");

  if (source === "paystack") {
    return handlePaystackWebhook(request);
  }

  // Shopify webhooks handled by shopify-app-remix automatically
  return json({ ok: true });
};

async function handlePaystackWebhook(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";

  // Parse the event
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("Paystack webhook:", event.event);

  // Find the shop that owns this Paystack account
  // We verify the signature against each shop's key
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
    return json({ error: "Invalid signature" }, { status: 401 });
  }

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
      await handleSubscriptionDisable(data);
      break;

    case "invoice.update":
      await handleInvoiceUpdate(data);
      break;

    default:
      console.log(`Unhandled Paystack event: ${eventType}`);
  }

  return json({ ok: true });
}

async function handleChargeSuccess(shopId: string, data: any) {
  const { reference, amount, currency, customer, plan: planData } = data;

  // If this charge is for a subscription plan
  if (planData?.plan_code) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { paystackPlanCode: planData.plan_code, shopId },
    });

    if (plan) {
      // Find or create subscriber
      let subscriber = await prisma.subscriber.findFirst({
        where: {
          email: customer.email,
          planId: plan.id,
        },
      });

      if (!subscriber) {
        subscriber = await createSubscriber({
          planId: plan.id,
          shopifyCustomerId: data.metadata?.shopify_customer_id || "",
          email: customer.email,
          paystackCustomerCode: customer.customer_code,
        });
      }

      // Create paid invoice
      await createInvoice({
        subscriberId: subscriber.id,
        amount,
        currency: currency || plan.currency,
        status: "paid",
        paystackRef: reference,
        paidAt: new Date(),
      });
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

  // Update existing subscriber or create new one
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
}

async function handleSubscriptionDisable(data: any) {
  const { subscription_code } = data;
  if (!subscription_code) return;

  await updateSubscriberByPaystackCode(subscription_code, {
    status: "cancelled",
  });
}

async function handleInvoiceUpdate(data: any) {
  const { reference, paid } = data;
  if (!reference) return;

  await updateInvoiceByRef(reference, {
    status: paid ? "paid" : "failed",
    paidAt: paid ? new Date() : undefined,
  });
}
