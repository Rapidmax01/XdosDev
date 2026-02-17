import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import { authenticateAdmin, getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import { getInvoices, getInvoiceCount } from "../models/invoice.server";
import { InvoiceTable } from "../components/InvoiceTable";

const FREE_INVOICE_LIMIT = 10;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const invoices = await getInvoices(shop.id);
  const monthlyCount = await getInvoiceCount(shop.id);

  return json({
    invoices,
    shopDomain,
    monthlyCount,
    isFreePlan: shop.plan === "free",
    limitReached: shop.plan === "free" && monthlyCount >= FREE_INVOICE_LIMIT,
  });
};

export default function Invoices() {
  const { invoices, shopDomain, monthlyCount, isFreePlan, limitReached } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Invoices">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {isFreePlan && (
              <Banner tone={limitReached ? "warning" : "info"}>
                {limitReached
                  ? `You've reached the free plan limit of ${FREE_INVOICE_LIMIT} invoices this month. Upgrade to Pro for unlimited.`
                  : `${monthlyCount}/${FREE_INVOICE_LIMIT} invoices used this month (Free plan).`}
              </Banner>
            )}

            {invoices.length === 0 ? (
              <Card>
                <EmptyState
                  heading="No invoices yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Invoices are automatically generated when customers are charged
                    for their subscriptions.
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <InvoiceTable invoices={invoices} shopDomain={shopDomain} />
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
