import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { getShopFromProxy } from "../utils/proxy-auth";
import { portalLayout, formatCurrency, escapeHtml } from "../utils/portal-html";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return Response.redirect(`https://${shopDomain}/apps/payafrika/login?shop=${shopDomain}`, 302);
  }

  const subscriber = await prisma.subscriber.findFirst({
    where: {
      portalToken: token,
      portalTokenExp: { gt: new Date() },
    },
    include: {
      plan: { include: { shop: true } },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!subscriber) {
    const html = portalLayout(
      "Session Expired",
      `<div class="alert alert-error">Your session has expired.</div>
       <a href="/apps/payafrika/login?shop=${encodeURIComponent(shopDomain)}" class="btn btn-primary">Sign in again</a>`,
      shopDomain,
    );
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  const statusBadgeClass = {
    active: "badge-active",
    trial: "badge-trial",
    paused: "badge-paused",
    cancelled: "badge-cancelled",
  }[subscriber.status] || "badge-active";

  const invoiceRows = subscriber.invoices.map((inv) => `
    <tr>
      <td>${inv.id.slice(0, 8).toUpperCase()}</td>
      <td>${formatCurrency(inv.amount, inv.currency)}</td>
      <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
      <td>${new Date(inv.createdAt).toLocaleDateString()}</td>
      <td><a href="/apps/payafrika/invoice-pdf/${inv.id}?shop=${encodeURIComponent(shopDomain)}&token=${token}">PDF</a></td>
    </tr>
  `).join("");

  const canPause = subscriber.status === "active";
  const canCancel = subscriber.status === "active" || subscriber.status === "paused";
  const canReactivate = subscriber.status === "paused";

  const actions = [];
  if (canPause) {
    actions.push(`<form method="POST" action="/apps/payafrika/portal/action?shop=${encodeURIComponent(shopDomain)}&token=${token}" style="display:inline;">
      <input type="hidden" name="action" value="pause" />
      <button type="submit" class="btn btn-secondary">Pause Subscription</button>
    </form>`);
  }
  if (canReactivate) {
    actions.push(`<form method="POST" action="/apps/payafrika/portal/action?shop=${encodeURIComponent(shopDomain)}&token=${token}" style="display:inline;">
      <input type="hidden" name="action" value="reactivate" />
      <button type="submit" class="btn btn-primary">Reactivate</button>
    </form>`);
  }
  if (canCancel) {
    actions.push(`<form method="POST" action="/apps/payafrika/portal/action?shop=${encodeURIComponent(shopDomain)}&token=${token}" style="display:inline;" onsubmit="return confirm('Are you sure you want to cancel?')">
      <input type="hidden" name="action" value="cancel" />
      <button type="submit" class="btn btn-danger">Cancel Subscription</button>
    </form>`);
  }

  const html = portalLayout(
    "My Subscription",
    `<div class="card">
      <div class="flex-between">
        <div>
          <h2>${escapeHtml(subscriber.plan.name)}</h2>
          <div class="price">${formatCurrency(subscriber.plan.amount, subscriber.plan.currency)}</div>
          <div class="interval">per ${subscriber.plan.interval}</div>
        </div>
        <span class="badge ${statusBadgeClass}">${subscriber.status}</span>
      </div>
      ${subscriber.nextBillingDate ? `<p class="text-muted mt-2">Next billing: ${new Date(subscriber.nextBillingDate).toLocaleDateString()}</p>` : ""}
      ${subscriber.trialEndsAt ? `<p class="text-muted">Trial ends: ${new Date(subscriber.trialEndsAt).toLocaleDateString()}</p>` : ""}
      <div class="flex mt-4">${actions.join(" ")}</div>
    </div>

    <div class="card">
      <h2>Invoices</h2>
      ${subscriber.invoices.length === 0
        ? '<p class="text-muted">No invoices yet.</p>'
        : `<table>
          <thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>${invoiceRows}</tbody>
        </table>`}
    </div>`,
    shopDomain,
  );

  return new Response(html, { headers: { "Content-Type": "text/html" } });
};
