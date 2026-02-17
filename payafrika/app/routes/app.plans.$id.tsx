import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Select,
  Button,
  Banner,
  Badge,
  DataTable,
  InlineStack,
} from "@shopify/polaris";
import { useState } from "react";
import { useRouteError } from "@remix-run/react";
import { getShopDomain } from "../utils/auth";
import { getPlan, updatePlan, deletePlan } from "../models/plan.server";

const INTERVALS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  console.log("=== PLAN DETAIL LOADER ===", params.id);

  try {
    const shopDomain = await getShopDomain(request);
    console.log("Shop domain:", shopDomain);
  } catch (e) {
    console.log("getShopDomain error:", e);
  }

  const plan = await getPlan(params.id!);
  console.log("Plan found:", !!plan);

  if (!plan) {
    return json({ plan: null });
  }

  return json({
    plan: {
      id: plan.id,
      name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      description: plan.description,
      active: plan.active,
      paystackPlanCode: plan.paystackPlanCode,
      subscriberCount: plan._count.subscribers,
      amountDisplay: (plan.amount / 100).toString(),
      subscribers: plan.subscribers.map((s) => ({
        email: s.email,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
    },
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    await deletePlan(params.id!);
    return redirect("/app/plans");
  }

  if (intent === "update") {
    const name = formData.get("name") as string;
    const amountStr = formData.get("amount") as string;
    const interval = formData.get("interval") as string;
    const description = formData.get("description") as string;

    try {
      await updatePlan(params.id!, shopDomain, {
        name: name || undefined,
        amount: amountStr ? Math.round(parseFloat(amountStr) * 100) : undefined,
        interval: interval || undefined,
        description: description || undefined,
      });
      return json({ success: "Plan updated successfully" });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Failed to update plan" },
        { status: 500 },
      );
    }
  }

  if (intent === "toggle") {
    const plan = await getPlan(params.id!);
    if (!plan) return json({ error: "Plan not found" }, { status: 404 });
    await updatePlan(params.id!, shopDomain, { active: !plan.active });
    return json({ success: `Plan ${plan.active ? "deactivated" : "activated"}` });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function EditPlan() {
  const { plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { success?: string; error?: string } | undefined;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // All hooks MUST be called before any conditional returns (React rules of hooks)
  const [name, setName] = useState(plan?.name ?? "");
  const [amount, setAmount] = useState(plan?.amountDisplay ?? "");
  const [interval, setInterval] = useState(plan?.interval ?? "monthly");
  const [description, setDescription] = useState(plan?.description ?? "");

  if (!plan) {
    return (
      <Page title="Plan Not Found" backAction={{ url: "/app/plans" }}>
        <Card><Text as="p">This plan was not found.</Text></Card>
      </Page>
    );
  }

  const subscriberRows = plan.subscribers.map((sub) => [
    sub.email,
    sub.status,
    new Date(sub.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page
      title={plan.name}
      backAction={{ url: "/app/plans" }}
      titleMetadata={
        <Badge tone={plan.active ? "success" : undefined}>
          {plan.active ? "Active" : "Inactive"}
        </Badge>
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.success && (
              <Banner tone="success" onDismiss={() => {}}>
                {actionData.success}
              </Banner>
            )}
            {actionData?.error && (
              <Banner tone="critical" onDismiss={() => {}}>
                {actionData.error}
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Plan Details</Text>
                <TextField label="Name" value={name} onChange={setName} autoComplete="off" />
                <TextField
                  label="Price"
                  type="number"
                  value={amount}
                  onChange={setAmount}
                  prefix={plan.currency}
                  autoComplete="off"
                />
                <Select
                  label="Billing Interval"
                  options={INTERVALS}
                  value={interval}
                  onChange={setInterval}
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline={3}
                  autoComplete="off"
                />

                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    loading={isSubmitting}
                    onClick={() => {
                      const formData = new FormData();
                      formData.append("intent", "update");
                      formData.append("name", name);
                      formData.append("amount", amount);
                      formData.append("interval", interval);
                      formData.append("description", description);
                      submit(formData, { method: "post" });
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      const formData = new FormData();
                      formData.append("intent", "toggle");
                      submit(formData, { method: "post" });
                    }}
                  >
                    {plan.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button url={`/app/subscribe/${plan.id}`}>
                    Generate Payment Link
                  </Button>
                  <Button
                    tone="critical"
                    onClick={() => {
                      if (confirm("Are you sure? This will deactivate the plan.")) {
                        const formData = new FormData();
                        formData.append("intent", "delete");
                        submit(formData, { method: "post" });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {subscriberRows.length > 0 && (
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Subscribers ({plan.subscriberCount})
                  </Text>
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Email", "Status", "Subscribed"]}
                    rows={subscriberRows}
                  />
                </BlockStack>
              </Card>
            )}

            {plan.paystackPlanCode && (
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Paystack Details</Text>
                  <Text as="p" tone="subdued">
                    Plan Code: {plan.paystackPlanCode}
                  </Text>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("EditPlan ErrorBoundary:", error);
  return (
    <Page title="Error" backAction={{ url: "/app/plans" }}>
      <Card>
        <BlockStack gap="300">
          <Text as="p" tone="critical">
            Something went wrong loading this plan.
          </Text>
          <Text as="p" tone="subdued">
            {error instanceof Error ? error.message : "Unknown error"}
          </Text>
        </BlockStack>
      </Card>
    </Page>
  );
}
