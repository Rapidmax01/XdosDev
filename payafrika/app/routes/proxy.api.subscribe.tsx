import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopFromProxy } from "../utils/proxy-auth";
import { getOrCreateShop, getDecryptedPaystackKeys } from "../models/shop.server";
import { getPlan } from "../models/plan.server";
import { PaystackClient } from "../utils/paystack";
import { validatePromoCode, applyDiscount, incrementPromoUsage } from "../models/promo.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return json({ error: "Missing shop" }, { status: 400 });

  const body = await request.json();
  const { planId, email, phone, promoCode } = body;

  if (!planId || !email) {
    return json({ error: "Plan and email are required" }, { status: 400 });
  }

  const shop = await getOrCreateShop(shopDomain);
  const plan = await getPlan(planId);
  if (!plan || !plan.paystackPlanCode) {
    return json({ error: "Plan not available" }, { status: 400 });
  }

  const keys = await getDecryptedPaystackKeys(shopDomain);
  if (!keys) return json({ error: "Payment not configured" }, { status: 500 });

  let finalAmount = plan.amount;
  let promoId: string | undefined;

  if (promoCode) {
    const result = await validatePromoCode(shop.id, promoCode);
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
        trial_days: plan.trialDays,
        source: "widget",
      },
    });

    if (promoId) await incrementPromoUsage(promoId);

    return json(
      { paymentUrl: result.data.authorization_url, reference: result.data.reference },
      { headers: { "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Payment failed" },
      { status: 500 },
    );
  }
};

// Handle CORS preflight
export const loader = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
