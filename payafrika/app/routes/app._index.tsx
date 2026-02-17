import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  InlineGrid,
  Card,
  Text,
  Banner,
  DataTable,
  Badge,
  Link,
} from "@shopify/polaris";
import { authenticateAdmin, getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import { getActiveSubscriberCount, getChurnedCount } from "../models/subscriber.server";
import { getMonthlyRevenue, getInvoices } from "../models/invoice.server";
import { countPlans } from "../models/plan.server";
import { StatsCard } from "../components/StatsCard";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "\u20A6",
  GHS: "GH\u20B5",
  ZAR: "R",
  KES: "KSh",
  USD: "$",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activeSubscribers, mrr, churnedCount, planCount, recentInvoices] =
    await Promise.all([
      getActiveSubscriberCount(shop.id),
      getMonthlyRevenue(shop.id),
      getChurnedCount(shop.id, thirtyDaysAgo),
      countPlans(shop.id),
      getInvoices(shop.id, 10),
    ]);

  const totalSubscribers = activeSubscribers + churnedCount;
  const churnRate =
    totalSubscribers > 0
      ? ((churnedCount / totalSubscribers) * 100).toFixed(1)
      : "0";

  return json({
    stats: {
      activeSubscribers,
      mrr,
      churnRate,
      planCount,
    },
    currency: shop.currency,
    recentInvoices,
    hasPaystackKeys: !!(shop.paystackSecretKey && shop.paystackPublicKey),
    shopPlan: shop.plan,
  });
};

export default function Dashboard() {
  const { stats, currency, recentInvoices, hasPaystackKeys, shopPlan } =
    useLoaderData<typeof loader>();

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const mrrDisplay = `${symbol} ${(stats.mrr / 100).toLocaleString()}`;

  const invoiceRows = recentInvoices.map((inv: any) => [
    inv.id.slice(0, 8).toUpperCase(),
    inv.subscriber.email,
    `${symbol} ${(inv.amount / 100).toLocaleString()}`,
    <Badge
      key={inv.id}
      tone={
        inv.status === "paid"
          ? "success"
          : inv.status === "failed"
            ? "critical"
            : "attention"
      }
    >
      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
    </Badge>,
    new Date(inv.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {!hasPaystackKeys && (
              <Banner
                tone="warning"
                action={{ content: "Go to Settings", url: "/app/settings" }}
              >
                Connect your Paystack account to start accepting payments.
              </Banner>
            )}

            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
              <StatsCard
                title="Active Subscribers"
                value={stats.activeSubscribers.toString()}
              />
              <StatsCard
                title="Monthly Recurring Revenue"
                value={mrrDisplay}
                subtitle="This month"
              />
              <StatsCard
                title="Churn Rate"
                value={`${stats.churnRate}%`}
                subtitle="Last 30 days"
              />
              <StatsCard
                title="Active Plans"
                value={stats.planCount.toString()}
                subtitle={
                  shopPlan === "free" ? `${stats.planCount}/3 (Free)` : "Unlimited"
                }
              />
            </InlineGrid>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Recent Transactions
                </Text>
                {invoiceRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "numeric",
                      "text",
                      "text",
                    ]}
                    headings={[
                      "Invoice #",
                      "Customer",
                      "Amount",
                      "Status",
                      "Date",
                    ]}
                    rows={invoiceRows}
                  />
                ) : (
                  <Text as="p" tone="subdued">
                    No transactions yet. They'll appear here once customers subscribe.
                  </Text>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
