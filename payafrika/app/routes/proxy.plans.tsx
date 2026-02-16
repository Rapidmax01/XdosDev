import type { LoaderFunctionArgs } from "@remix-run/node";
import { verifyAppProxySignature, getShopFromProxy } from "../utils/proxy-auth";
import { getOrCreateShop } from "../models/shop.server";
import { getPlans } from "../models/plan.server";
import { portalLayout, formatCurrency, escapeHtml } from "../utils/portal-html";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = getShopFromProxy(request);

  if (!shopDomain) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  const shop = await getOrCreateShop(shopDomain);
  if (!shop.portalEnabled) {
    return new Response(
      portalLayout("Portal Disabled", '<div class="card text-center"><p>The customer portal is not enabled for this store.</p></div>', shopDomain),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const plans = await getPlans(shop.id);
  const activePlans = plans.filter((p) => p.active);

  const planCards = activePlans.map((plan) => `
    <div class="card">
      <h3>${escapeHtml(plan.name)}</h3>
      ${plan.description ? `<p class="text-muted mb-2">${escapeHtml(plan.description)}</p>` : ""}
      <div class="price">${formatCurrency(plan.amount, plan.currency)}</div>
      <div class="interval">per ${plan.interval}</div>
      ${plan.trialDays > 0 ? `<div class="mt-2"><span class="badge badge-trial">${plan.trialDays}-day free trial</span></div>` : ""}
      <div class="mt-4">
        <a href="/apps/payafrika/subscribe/${plan.id}?shop=${encodeURIComponent(shopDomain)}" class="btn btn-primary">Subscribe</a>
      </div>
    </div>
  `).join("");

  const html = portalLayout(
    "Subscription Plans",
    `<div class="grid">${planCards}</div>
     <div class="text-center mt-4">
       <a href="/apps/payafrika/login?shop=${encodeURIComponent(shopDomain)}" class="btn btn-secondary">Already subscribed? Sign in</a>
     </div>`,
    shopDomain,
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};
