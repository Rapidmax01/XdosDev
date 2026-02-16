import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text } from "@shopify/polaris";
import { getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import {
  getMrrOverTime,
  getSubscriberGrowth,
  getChurnData,
  getRevenueByPlan,
} from "../models/analytics.server";
import { AnalyticsChart } from "../components/AnalyticsChart";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);

  const [mrr, growth, churn, revenueByPlan] = await Promise.all([
    getMrrOverTime(shop.id),
    getSubscriberGrowth(shop.id),
    getChurnData(shop.id),
    getRevenueByPlan(shop.id),
  ]);

  return json({ mrr, growth, churn, revenueByPlan, currency: shop.currency });
};

export default function Analytics() {
  const { mrr, growth, churn, revenueByPlan, currency } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Revenue Analytics">
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Monthly Recurring Revenue ({currency})
              </Text>
              <AnalyticsChart
                data={mrr}
                type="line"
                dataKeys={[{ key: "mrr", color: "#2563eb", name: "MRR" }]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Subscriber Growth
              </Text>
              <AnalyticsChart
                data={growth}
                type="bar"
                dataKeys={[
                  { key: "total", color: "#2563eb", name: "Total Active" },
                  { key: "new", color: "#10b981", name: "New" },
                ]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Churn Rate
              </Text>
              <AnalyticsChart
                data={churn}
                type="line"
                dataKeys={[
                  { key: "churned", color: "#ef4444", name: "Churned" },
                  { key: "rate", color: "#f97316", name: "Churn %" },
                ]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Revenue by Plan ({currency})
              </Text>
              <AnalyticsChart
                data={revenueByPlan}
                type="bar"
                xKey="name"
                dataKeys={[
                  { key: "revenue", color: "#2563eb", name: "Revenue" },
                  { key: "subscribers", color: "#10b981", name: "Subscribers" },
                ]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
