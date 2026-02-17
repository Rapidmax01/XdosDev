import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineGrid,
  Badge,
  Divider,
  List,
} from "@shopify/polaris";
import { authenticateAdmin, getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import { createSubscriptionCharge, PLANS } from "../models/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  return json({ currentPlan: shop.plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticateAdmin(request) as any;
  const formData = await request.formData();
  const planName = formData.get("plan") as "pro" | "plus";

  if (!["pro", "plus"].includes(planName)) {
    return json({ error: "Invalid plan" }, { status: 400 });
  }

  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing/callback?plan=${planName}`;

  try {
    const { confirmationUrl } = await createSubscriptionCharge(
      admin,
      session.shop,
      planName,
      returnUrl,
    );

    if (confirmationUrl) {
      return redirect(confirmationUrl);
    }
    return json({ error: "Failed to create charge" }, { status: 500 });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Billing error" },
      { status: 500 },
    );
  }
};

export default function Billing() {
  const { currentPlan } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const plans = [
    {
      key: "free",
      name: "Free",
      price: "$0/mo",
      features: [
        "3 subscription plans",
        "10 invoices per month",
        "Basic dashboard",
        "Paystack integration",
      ],
    },
    {
      key: "pro",
      name: "Pro",
      price: "$19/mo",
      features: [
        "Unlimited subscription plans",
        "Unlimited invoices",
        "Advanced analytics",
        "Remove PayAfrika branding",
        "Email support",
      ],
    },
    {
      key: "plus",
      name: "Plus",
      price: "$49/mo",
      features: [
        "Everything in Pro",
        "Multi-currency support",
        "Custom invoice branding",
        "Priority support",
        "API access",
      ],
    },
  ];

  return (
    <Page title="Upgrade Your Plan" backAction={{ url: "/app/settings" }}>
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
            {plans.map((plan) => (
              <Card key={plan.key}>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">
                      {plan.name}
                      {currentPlan === plan.key && (
                        <>
                          {" "}
                          <Badge tone="info">Current</Badge>
                        </>
                      )}
                    </Text>
                    <Text variant="headingXl" as="p">
                      {plan.price}
                    </Text>
                  </BlockStack>
                  <Divider />
                  <List>
                    {plan.features.map((f) => (
                      <List.Item key={f}>{f}</List.Item>
                    ))}
                  </List>
                  {plan.key !== "free" && currentPlan !== plan.key && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        const formData = new FormData();
                        formData.append("plan", plan.key);
                        submit(formData, { method: "post" });
                      }}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
