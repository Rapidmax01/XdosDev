import type { LoaderFunctionArgs } from "@remix-run/node";
import { getShopDomain } from "../utils/auth";
import { getInvoice } from "../models/invoice.server";
import { getOrCreateShop } from "../models/shop.server";
import { generateInvoicePDF } from "../utils/invoice-pdf";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const invoice = await getInvoice(params.id!);

  if (!invoice) {
    throw new Response("Invoice not found", { status: 404 });
  }

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
