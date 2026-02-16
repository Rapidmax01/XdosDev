import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { getShopFromProxy } from "../utils/proxy-auth";
import { getOrCreateShop, getDecryptedPaystackKeys } from "../models/shop.server";
import { getPlan } from "../models/plan.server";
import { PaystackClient } from "../utils/paystack";
import { validatePromoCode, applyDiscount, incrementPromoUsage } from "../models/promo.server";
import { portalLayout, formatCurrency, escapeHtml } from "../utils/portal-html";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  const shop = await getOrCreateShop(shopDomain);
  const plan = await getPlan(params.planId!);
  if (!plan) return new Response("Plan not found", { status: 404 });

  const html = portalLayout(
    `Subscribe to ${plan.name}`,
    `<div class="card">
      <h2>${escapeHtml(plan.name)}</h2>
      <div class="price">${formatCurrency(plan.amount, plan.currency)}</div>
      <div class="interval mb-2">per ${plan.interval}</div>
      ${plan.trialDays > 0 ? `<div class="mb-2"><span class="badge badge-trial">${plan.trialDays}-day free trial</span></div>` : ""}
      ${plan.description ? `<p class="text-muted mb-2">${escapeHtml(plan.description)}</p>` : ""}

      <form method="POST" action="/apps/payafrika/subscribe/${plan.id}?shop=${encodeURIComponent(shopDomain)}">
        <label>Email *</label>
        <input type="email" name="email" required placeholder="your@email.com" />

        <label>Phone (optional)</label>
        <input type="tel" name="phone" placeholder="+234..." />

        <div class="flex mb-2" style="align-items: center; gap: 8px;">
          <input type="checkbox" name="whatsappOptIn" value="true" id="wa" style="width: auto; margin: 0;" />
          <label for="wa" style="margin: 0; font-weight: normal;">Receive WhatsApp payment notifications</label>
        </div>

        <label>Promo Code (optional)</label>
        <input type="text" name="promoCode" placeholder="SAVE20" />

        <button type="submit" class="btn btn-primary" style="width: 100%;">Subscribe Now</button>
      </form>
    </div>
    <div class="text-center mt-2">
      <a href="/apps/payafrika/plans?shop=${encodeURIComponent(shopDomain)}">&larr; Back to plans</a>
    </div>`,
    shopDomain,
  );

  return new Response(html, { headers: { "Content-Type": "text/html" } });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  const shop = await getOrCreateShop(shopDomain);
  const plan = await getPlan(params.planId!);
  if (!plan || !plan.paystackPlanCode) {
    return new Response("Plan not available", { status: 400 });
  }

  const keys = await getDecryptedPaystackKeys(shopDomain);
  if (!keys) return new Response("Payment not configured", { status: 500 });

  const formData = await request.formData();
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const whatsappOptIn = formData.get("whatsappOptIn") === "true";
  const promoCodeStr = formData.get("promoCode") as string;

  if (!email) return new Response("Email required", { status: 400 });

  let finalAmount = plan.amount;
  let promoId: string | undefined;

  if (promoCodeStr) {
    const result = await validatePromoCode(shop.id, promoCodeStr);
    if (result.valid) {
      finalAmount = applyDiscount(plan.amount, result.promoCode.discountType, result.promoCode.discountValue);
      promoId = result.promoCode.id;
    }
  }

  let startDate: string | undefined;
  if (plan.trialDays > 0) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    startDate = trialEnd.toISOString();
  }

  try {
    const paystack = new PaystackClient(keys.secretKey);
    const result = await paystack.initializeTransaction({
      email,
      amount: finalAmount,
      currency: plan.currency,
      plan: plan.paystackPlanCode,
      ...(startDate ? { start_date: startDate } : {}),
      callback_url: `https://${shopDomain}/apps/payafrika/plans?shop=${shopDomain}`,
      metadata: {
        plan_id: plan.id,
        shop_domain: shopDomain,
        promo_code_id: promoId,
        phone,
        whatsapp_opt_in: whatsappOptIn,
        trial_days: plan.trialDays,
        source: "portal",
      },
    });

    if (promoId) await incrementPromoUsage(promoId);

    return Response.redirect(result.data.authorization_url, 302);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Payment initialization failed";
    const html = portalLayout(
      "Error",
      `<div class="alert alert-error">${escapeHtml(msg)}</div>
       <a href="/apps/payafrika/subscribe/${plan.id}?shop=${encodeURIComponent(shopDomain)}" class="btn btn-secondary">Try again</a>`,
      shopDomain,
    );
    return new Response(html, { status: 500, headers: { "Content-Type": "text/html" } });
  }
};
