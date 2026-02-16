import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { getShopFromProxy } from "../utils/proxy-auth";
import { getDecryptedPaystackKeys } from "../models/shop.server";
import { PaystackClient } from "../utils/paystack";
import { portalLayout } from "../utils/portal-html";

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const subscriber = await prisma.subscriber.findFirst({
    where: {
      portalToken: token,
      portalTokenExp: { gt: new Date() },
    },
    include: { plan: { include: { shop: true } } },
  });

  if (!subscriber) return new Response("Session expired", { status: 401 });

  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  const keys = await getDecryptedPaystackKeys(shopDomain);
  let message = "";

  try {
    if (actionType === "pause" && subscriber.paystackSubscriptionCode) {
      if (keys) {
        const paystack = new PaystackClient(keys.secretKey);
        const sub = await paystack.getSubscription(subscriber.paystackSubscriptionCode);
        const emailToken = (sub.data as any)?.email_token;
        if (emailToken) {
          await paystack.disableSubscription({
            code: subscriber.paystackSubscriptionCode,
            token: emailToken,
          });
        }
      }
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "paused" },
      });
      message = "Subscription paused successfully.";
    } else if (actionType === "reactivate" && subscriber.paystackSubscriptionCode) {
      if (keys) {
        const paystack = new PaystackClient(keys.secretKey);
        const sub = await paystack.getSubscription(subscriber.paystackSubscriptionCode);
        const emailToken = (sub.data as any)?.email_token;
        if (emailToken) {
          await paystack.enableSubscription({
            code: subscriber.paystackSubscriptionCode,
            token: emailToken,
          });
        }
      }
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "active" },
      });
      message = "Subscription reactivated!";
    } else if (actionType === "cancel" && subscriber.paystackSubscriptionCode) {
      if (keys) {
        const paystack = new PaystackClient(keys.secretKey);
        const sub = await paystack.getSubscription(subscriber.paystackSubscriptionCode);
        const emailToken = (sub.data as any)?.email_token;
        if (emailToken) {
          await paystack.disableSubscription({
            code: subscriber.paystackSubscriptionCode,
            token: emailToken,
          });
        }
      }
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "cancelled" },
      });
      message = "Subscription cancelled.";
    } else {
      message = "Invalid action.";
    }
  } catch (error) {
    message = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }

  const html = portalLayout(
    "Action Completed",
    `<div class="alert alert-info">${message}</div>
     <a href="/apps/payafrika/portal?shop=${encodeURIComponent(shopDomain)}&token=${token}" class="btn btn-primary">Back to Portal</a>`,
    shopDomain,
  );

  return new Response(html, { headers: { "Content-Type": "text/html" } });
};
