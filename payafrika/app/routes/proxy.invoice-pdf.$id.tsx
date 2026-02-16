import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { getShopFromProxy } from "../utils/proxy-auth";
import { getInvoice } from "../models/invoice.server";
import { getOrCreateShop } from "../models/shop.server";
import { generateInvoicePDF } from "../utils/invoice-pdf";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("Unauthorized", { status: 401 });

  // Verify token belongs to a valid subscriber
  const subscriber = await prisma.subscriber.findFirst({
    where: {
      portalToken: token,
      portalTokenExp: { gt: new Date() },
    },
  });

  if (!subscriber) return new Response("Session expired", { status: 401 });

  const invoice = await getInvoice(params.id!);
  if (!invoice || invoice.subscriberId !== subscriber.id) {
    return new Response("Invoice not found", { status: 404 });
  }

  const shop = await getOrCreateShop(shopDomain);

  const pdf = await generateInvoicePDF({
    invoiceId: invoice.id,
    merchantName: shop.shopDomain,
    merchantLogo: shop.invoiceLogo,
    customerEmail: invoice.subscriber.email,
    planName: invoice.subscriber.plan.name,
    amount: invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    createdAt: invoice.createdAt.toString(),
    paidAt: invoice.paidAt?.toString(),
    showBranding: shop.plan === "free",
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.id.slice(0, 8)}.pdf"`,
    },
  });
};
