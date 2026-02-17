import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticateAdmin, getShopDomain } from "../utils/auth";
import { handleBillingCallback } from "../models/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  const chargeId = url.searchParams.get("charge_id");

  if (plan && chargeId) {
    await handleBillingCallback(shopDomain, chargeId, plan);
  }

  return redirect("/app/settings");
};
