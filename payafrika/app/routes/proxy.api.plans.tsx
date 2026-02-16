import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopFromProxy } from "../utils/proxy-auth";
import { getOrCreateShop } from "../models/shop.server";
import { getPlans } from "../models/plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return json({ error: "Missing shop" }, { status: 400 });

  const shop = await getOrCreateShop(shopDomain);
  const plans = await getPlans(shop.id);

  const activePlans = plans
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
      description: p.description,
      trialDays: p.trialDays,
    }));

  return json(
    { plans: activePlans },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
};
