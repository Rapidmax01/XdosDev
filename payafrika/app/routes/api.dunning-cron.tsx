import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { getDueAttempts, markAttemptExecuted, cancelDunning } from "../models/dunning.server";
import { sendWhatsAppNotification } from "../models/whatsapp.server";
import { getDecryptedPaystackKeys } from "../models/shop.server";
import { PaystackClient } from "../utils/paystack";
import { getDunningActionMessage } from "../utils/dunning";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate via secret header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempts = await getDueAttempts();
  const results: { id: string; action: string; result: string }[] = [];

  for (const attempt of attempts) {
    const { subscriber } = attempt;
    const shop = subscriber.plan.shop;
    const planName = subscriber.plan.name;

    try {
      if (attempt.action === "retry") {
        // Try to charge the customer
        const keys = await getDecryptedPaystackKeys(shop.shopDomain);
        if (keys && subscriber.paystackCustomerCode) {
          try {
            const paystack = new PaystackClient(keys.secretKey);
            const customerData = await paystack.getCustomer(subscriber.paystackCustomerCode);
            const authCode = (customerData.data as any)?.authorizations?.[0]?.authorization_code;

            if (authCode) {
              await paystack.chargeAuthorization({
                email: subscriber.email,
                amount: subscriber.plan.amount,
                authorization_code: authCode,
                currency: subscriber.plan.currency,
                metadata: {
                  plan_id: subscriber.plan.id,
                  shop_domain: shop.shopDomain,
                  dunning_retry: true,
                },
              });
              await markAttemptExecuted(attempt.id, "success");
              results.push({ id: attempt.id, action: attempt.action, result: "success" });
              continue;
            }
          } catch (error) {
            console.log("[Dunning] Retry charge failed:", error);
          }
        }
        await markAttemptExecuted(attempt.id, "failed");
        results.push({ id: attempt.id, action: attempt.action, result: "failed" });
      } else if (attempt.action === "cancel") {
        // Cancel the subscription
        const keys = await getDecryptedPaystackKeys(shop.shopDomain);
        if (keys && subscriber.paystackSubscriptionCode) {
          try {
            const paystack = new PaystackClient(keys.secretKey);
            const sub = await paystack.getSubscription(subscriber.paystackSubscriptionCode);
            const emailToken = (sub.data as any)?.email_token;
            if (emailToken) {
              await paystack.disableSubscription({
                code: subscriber.paystackSubscriptionCode,
                token: emailToken,
              });
            }
          } catch (error) {
            console.log("[Dunning] Paystack disable failed:", error);
          }
        }

        await prisma.subscriber.update({
          where: { id: subscriber.id },
          data: { status: "cancelled", dunningStartedAt: null },
        });

        await markAttemptExecuted(attempt.id, "success");
        results.push({ id: attempt.id, action: attempt.action, result: "cancelled" });
      } else {
        // notify, remind, final_warning - just send notifications
        await markAttemptExecuted(attempt.id, "success");
        results.push({ id: attempt.id, action: attempt.action, result: "notified" });
      }

      // Send WhatsApp for all actions
      if (subscriber.whatsappOptIn && subscriber.phone) {
        const message = getDunningActionMessage(attempt.action as any, planName);
        await sendWhatsAppNotification(
          shop.id,
          subscriber.id,
          subscriber.phone,
          `dunning_${attempt.action}`,
          message,
        );
      }
    } catch (error) {
      console.error(`[Dunning] Error processing attempt ${attempt.id}:`, error);
      await markAttemptExecuted(attempt.id, "failed");
      results.push({ id: attempt.id, action: attempt.action, result: "error" });
    }
  }

  return json({ processed: results.length, results });
};
