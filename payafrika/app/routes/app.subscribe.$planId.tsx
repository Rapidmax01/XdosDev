import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  Banner,
  InlineStack,
  Badge,
  Checkbox,
} from "@shopify/polaris";
import { useState } from "react";
import { getShopDomain } from "../utils/auth";
import { getOrCreateShop, getDecryptedPaystackKeys } from "../models/shop.server";
import { getPlan } from "../models/plan.server";
import { PaystackClient } from "../utils/paystack";
import { validatePromoCode, applyDiscount, incrementPromoUsage } from "../models/promo.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const plan = await getPlan(params.planId!);
  if (!plan) throw new Response("Plan not found", { status: 404 });

  return json({
    plan: {
      id: plan.id,
      name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      paystackPlanCode: plan.paystackPlanCode,
      trialDays: plan.trialDays,
    },
    shopId: shop.id,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const plan = await getPlan(params.planId!);

  if (!plan || !plan.paystackPlanCode) {
    return json({ error: "Plan not found or not synced to Paystack" }, { status: 400 });
  }

  const keys = await getDecryptedPaystackKeys(shopDomain);
  if (!keys) {
    return json({ error: "Paystack keys not configured" }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Validate promo code (AJAX)
  if (intent === "validate-promo") {
    const code = formData.get("promoCode") as string;
    if (!code) return json({ promoError: "Enter a promo code" });
    const result = await validatePromoCode(shop.id, code);
    if (!result.valid) return json({ promoError: result.error });

    const discountedAmount = applyDiscount(
      plan.amount,
      result.promoCode.discountType,
      result.promoCode.discountValue,
    );

    return json({
      promoValid: true,
      promoId: result.promoCode.id,
      discountType: result.promoCode.discountType,
      discountValue: result.promoCode.discountValue,
      originalAmount: plan.amount,
      discountedAmount,
    });
  }

  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const whatsappOptIn = formData.get("whatsappOptIn") === "true";
  const promoCode = formData.get("promoCode") as string;

  if (!email) {
    return json({ error: "Customer email is required" }, { status: 400 });
  }

  let finalAmount = plan.amount;
  let promoId: string | undefined;

  // Apply promo code
  if (promoCode) {
    const result = await validatePromoCode(shop.id, promoCode);
    if (result.valid) {
      finalAmount = applyDiscount(
        plan.amount,
        result.promoCode.discountType,
        result.promoCode.discountValue,
      );
      promoId = result.promoCode.id;
    }
  }

  // Calculate trial start_date
  let startDate: string | undefined;
  if (plan.trialDays > 0) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    startDate = trialEnd.toISOString();
  }

  try {
    const paystack = new PaystackClient(keys.secretKey);
    const result = await paystack.initializeTransaction({
      email,
      amount: finalAmount,
      currency: plan.currency,
      plan: plan.paystackPlanCode,
      ...(startDate ? { start_date: startDate } : {}),
      callback_url: `${process.env.SHOPIFY_APP_URL || process.env.HOST}/app/plans/${plan.id}`,
      metadata: {
        plan_id: plan.id,
        shop_domain: shopDomain,
        promo_code_id: promoId,
        phone,
        whatsapp_opt_in: whatsappOptIn,
        trial_days: plan.trialDays,
      },
    });

    // Increment promo usage
    if (promoId) {
      await incrementPromoUsage(promoId);
    }

    return json({
      success: true,
      paymentUrl: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Failed to initialize transaction" },
      { status: 500 },
    );
  }
};

export default function SubscribeToPlan() {
  const { plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as any;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const currencySymbols: Record<string, string> = {
    NGN: "\u20A6",
    GHS: "GH\u20B5",
    ZAR: "R",
    KES: "KSh",
    USD: "$",
  };
  const symbol = currencySymbols[plan.currency] || plan.currency;

  const displayAmount = actionData?.discountedAmount ?? plan.amount;

  return (
    <Page
      title={`Subscribe to ${plan.name}`}
      backAction={{ url: `/app/plans/${plan.id}` }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.error && (
              <Banner tone="critical">{actionData.error}</Banner>
            )}

            {actionData?.paymentUrl && (
              <Banner tone="success">
                Payment link generated!{" "}
                <a href={actionData.paymentUrl} target="_blank" rel="noopener noreferrer">
                  Open Paystack Checkout
                </a>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Generate Payment Link
                </Text>
                <Text as="p" tone="subdued">
                  Enter a customer's email to generate a Paystack subscription checkout link.
                </Text>
                <InlineStack gap="200" align="start">
                  <Text as="p">
                    Plan: {plan.name} — {symbol} {(plan.amount / 100).toLocaleString()} / {plan.interval}
                  </Text>
                  {plan.trialDays > 0 && (
                    <Badge tone="info">{`${plan.trialDays}-day free trial`}</Badge>
                  )}
                </InlineStack>

                {actionData?.promoValid && (
                  <Banner tone="success">
                    Discount applied! New price: {symbol} {(actionData.discountedAmount / 100).toLocaleString()}
                  </Banner>
                )}
                {actionData?.promoError && (
                  <Banner tone="warning">{actionData.promoError}</Banner>
                )}

                <TextField
                  label="Customer Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  placeholder="customer@example.com"
                />
                <TextField
                  label="Phone Number (optional)"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                  placeholder="+234..."
                />
                <Checkbox
                  label="Customer opts in to WhatsApp notifications"
                  checked={whatsappOptIn}
                  onChange={setWhatsappOptIn}
                />

                <InlineStack gap="200" align="start" blockAlign="end">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Promo Code (optional)"
                      value={promoCode}
                      onChange={setPromoCode}
                      autoComplete="off"
                      placeholder="SAVE20"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const formData = new FormData();
                      formData.append("intent", "validate-promo");
                      formData.append("promoCode", promoCode);
                      submit(formData, { method: "post" });
                    }}
                    disabled={!promoCode}
                  >
                    Apply
                  </Button>
                </InlineStack>

                <Button
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!email}
                  onClick={() => {
                    const formData = new FormData();
                    formData.append("email", email);
                    formData.append("phone", phone);
                    formData.append("whatsappOptIn", String(whatsappOptIn));
                    if (promoCode) formData.append("promoCode", promoCode);
                    submit(formData, { method: "post" });
                  }}
                >
                  Generate Payment Link
                </Button>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
