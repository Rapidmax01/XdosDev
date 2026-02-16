import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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
  EmptyState,
  InlineGrid,
  Modal,
  FormLayout,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import { getPlans, createPlan, countPlans } from "../models/plan.server";
import { PlanCard } from "../components/PlanCard";

const INTERVALS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

const CURRENCIES = [
  { label: "NGN", value: "NGN" },
  { label: "GHS", value: "GHS" },
  { label: "ZAR", value: "ZAR" },
  { label: "KES", value: "KES" },
  { label: "USD", value: "USD" },
];

const FREE_PLAN_LIMIT = 3;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const plans = await getPlans(shop.id);
  const activePlanCount = await countPlans(shop.id);

  return json({
    plans: plans.map((p) => ({
      ...p,
      subscriberCount: p._count.subscribers,
    })),
    shopPlan: shop.plan,
    activePlanCount,
    canCreateMore: shop.plan !== "free" || activePlanCount < FREE_PLAN_LIMIT,
    hasPaystackKeys: !!(shop.paystackSecretKey && shop.paystackPublicKey),
    defaultCurrency: shop.currency,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const amountStr = formData.get("amount") as string;
  const currency = formData.get("currency") as string;
  const interval = formData.get("interval") as string;
  const description = formData.get("description") as string;
  const trialDaysStr = formData.get("trialDays") as string;

  if (!name || !amountStr || !currency || !interval) {
    return json({ error: "All fields are required" }, { status: 400 });
  }

  // Check free tier limit
  if (shop.plan === "free") {
    const count = await countPlans(shop.id);
    if (count >= FREE_PLAN_LIMIT) {
      return json(
        { error: "Free plan allows only 3 subscription plans. Upgrade to Pro for unlimited." },
        { status: 403 },
      );
    }
  }

  const amount = Math.round(parseFloat(amountStr) * 100); // Convert to kobo/cents

  try {
    await createPlan(shopDomain, shop.id, {
      name,
      amount,
      currency,
      interval,
      description: description || undefined,
      trialDays: trialDaysStr ? parseInt(trialDaysStr, 10) : 0,
    });
    return json({ success: "Plan created successfully" });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Failed to create plan" },
      { status: 500 },
    );
  }
};

export default function Plans() {
  const { plans, canCreateMore, hasPaystackKeys, defaultCurrency } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { success?: string; error?: string } | undefined;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [interval, setInterval] = useState("monthly");
  const [description, setDescription] = useState("");
  const [trialDays, setTrialDays] = useState("");

  const handleCreate = useCallback(() => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("amount", amount);
    formData.append("currency", currency);
    formData.append("interval", interval);
    formData.append("description", description);
    if (trialDays) formData.append("trialDays", trialDays);
    submit(formData, { method: "post" });
    setShowModal(false);
    setName("");
    setAmount("");
    setDescription("");
    setTrialDays("");
  }, [name, amount, currency, interval, description, trialDays, submit]);

  return (
    <Page
      title="Subscription Plans"
      primaryAction={{
        content: "Create Plan",
        onAction: () => setShowModal(true),
        disabled: !canCreateMore || !hasPaystackKeys,
      }}
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

            {!hasPaystackKeys && (
              <Banner tone="warning">
                Connect your Paystack account in Settings before creating plans.
              </Banner>
            )}

            {!canCreateMore && (
              <Banner tone="info">
                You've reached the free plan limit of 3 plans. Upgrade to Pro for unlimited plans.
              </Banner>
            )}

            {plans.length === 0 ? (
              <Card>
                <EmptyState
                  heading="Create your first subscription plan"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Set up recurring billing plans for your customers powered by Paystack.
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    id={plan.id}
                    name={plan.name}
                    amount={plan.amount}
                    currency={plan.currency}
                    interval={plan.interval}
                    active={plan.active}
                    subscriberCount={plan.subscriberCount}
                  />
                ))}
              </InlineGrid>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Subscription Plan"
        primaryAction={{
          content: "Create",
          onAction: handleCreate,
          loading: isSubmitting,
          disabled: !name || !amount,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setShowModal(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label="Plan Name" value={name} onChange={setName} autoComplete="off" />
            <TextField
              label="Price"
              type="number"
              value={amount}
              onChange={setAmount}
              autoComplete="off"
              prefix={currency}
              helpText="Amount customers will be charged each billing cycle"
            />
            <Select label="Currency" options={CURRENCIES} value={currency} onChange={setCurrency} />
            <Select
              label="Billing Interval"
              options={INTERVALS}
              value={interval}
              onChange={setInterval}
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChange={setDescription}
              multiline={3}
              autoComplete="off"
            />
            <TextField
              label="Free Trial Days (optional)"
              type="number"
              value={trialDays}
              onChange={setTrialDays}
              autoComplete="off"
              helpText="Number of free days before first charge. 0 = no trial."
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
