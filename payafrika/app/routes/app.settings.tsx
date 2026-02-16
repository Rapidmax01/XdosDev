import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Select,
  Button,
  Banner,
  InlineStack,
  DropZone,
  Thumbnail,
  TextField,
  Checkbox,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { getShopDomain } from "../utils/auth";
import { getOrCreateShop, updatePaystackKeys, updateShopSettings, updateWhatsAppSettings, updatePortalSettings } from "../models/shop.server";
import { PaystackSetup } from "../components/PaystackSetup";

const CURRENCIES = [
  { label: "Nigerian Naira (NGN)", value: "NGN" },
  { label: "Ghanaian Cedi (GHS)", value: "GHS" },
  { label: "South African Rand (ZAR)", value: "ZAR" },
  { label: "Kenyan Shilling (KES)", value: "KES" },
  { label: "US Dollar (USD)", value: "USD" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  return json({
    shop: {
      currency: shop.currency,
      hasPaystackKeys: !!(shop.paystackSecretKey && shop.paystackPublicKey),
      plan: shop.plan,
      hasLogo: !!shop.invoiceLogo,
      whatsappPhoneId: shop.whatsappPhoneId || "",
      whatsappEnabled: shop.whatsappEnabled,
      portalEnabled: shop.portalEnabled,
      portalUrl: `https://${shop.shopDomain}/apps/payafrika/plans`,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = await getShopDomain(request);

  const contentType = request.headers.get("content-type") || "";
  let formData: FormData;

  if (contentType.includes("multipart/form-data")) {
    const uploadHandler = unstable_createMemoryUploadHandler({ maxPartSize: 2_000_000 });
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
  } else {
    formData = await request.formData();
  }

  const intent = formData.get("intent") as string;

  if (intent === "paystack-keys") {
    const secretKey = formData.get("secretKey") as string;
    const publicKey = formData.get("publicKey") as string;

    if (!secretKey?.startsWith("sk_") || !publicKey?.startsWith("pk_")) {
      return json({ error: "Invalid Paystack keys format" }, { status: 400 });
    }

    await updatePaystackKeys(shopDomain, secretKey, publicKey);
    return json({ success: "Paystack keys saved successfully" });
  }

  if (intent === "currency") {
    const currency = formData.get("currency") as string;
    await updateShopSettings(shopDomain, { currency });
    return json({ success: "Currency updated" });
  }

  if (intent === "upload-logo") {
    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) {
      return json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > 2_000_000) {
      return json({ error: "Logo must be under 2MB" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    await updateShopSettings(shopDomain, { invoiceLogo: base64 });
    return json({ success: "Logo uploaded successfully" });
  }

  if (intent === "remove-logo") {
    await updateShopSettings(shopDomain, { invoiceLogo: null as any });
    return json({ success: "Logo removed" });
  }

  if (intent === "whatsapp-config") {
    const apiKey = formData.get("whatsappApiKey") as string;
    const phoneId = formData.get("whatsappPhoneId") as string;
    const enabled = formData.get("whatsappEnabled") === "true";
    await updateWhatsAppSettings(shopDomain, { apiKey, phoneId, enabled });
    return json({ success: "WhatsApp settings saved" });
  }

  if (intent === "portal-toggle") {
    const enabled = formData.get("portalEnabled") === "true";
    await updatePortalSettings(shopDomain, enabled);
    return json({ success: `Customer portal ${enabled ? "enabled" : "disabled"}` });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as { success?: string; error?: string } | undefined;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(shop.whatsappPhoneId);
  const [whatsappEnabled, setWhatsappEnabled] = useState(shop.whatsappEnabled);

  const handleLogoUpload = useCallback(
    (_files: File[], accepted: File[]) => {
      if (accepted.length === 0) return;
      const formData = new FormData();
      formData.append("intent", "upload-logo");
      formData.append("logo", accepted[0]);
      submit(formData, { method: "post", encType: "multipart/form-data" });
    },
    [submit],
  );

  return (
    <Page title="Settings">
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

            <PaystackSetup
              hasKeys={shop.hasPaystackKeys}
              onSubmit={(formData) => submit(formData, { method: "post" })}
              isSubmitting={isSubmitting}
            />

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Default Currency
                </Text>
                <Select
                  label="Currency"
                  options={CURRENCIES}
                  value={shop.currency}
                  onChange={(value) => {
                    const formData = new FormData();
                    formData.append("currency", value);
                    formData.append("intent", "currency");
                    submit(formData, { method: "post" });
                  }}
                />
              </BlockStack>
            </Card>

            {/* Branded Invoices - Logo Upload */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Invoice Logo
                </Text>
                <Text as="p" tone="subdued">
                  Upload your logo to appear on PDF invoices. Max 2MB, PNG or JPG.
                </Text>
                {shop.hasLogo ? (
                  <InlineStack gap="300" align="start" blockAlign="center">
                    <Banner tone="success">Logo uploaded</Banner>
                    <Button
                      tone="critical"
                      variant="plain"
                      onClick={() => {
                        const formData = new FormData();
                        formData.append("intent", "remove-logo");
                        submit(formData, { method: "post" });
                      }}
                    >
                      Remove logo
                    </Button>
                  </InlineStack>
                ) : (
                  <DropZone
                    accept="image/png,image/jpeg"
                    type="image"
                    onDrop={handleLogoUpload}
                    allowMultiple={false}
                  >
                    <DropZone.FileUpload actionHint="Accepts PNG and JPG" />
                  </DropZone>
                )}
              </BlockStack>
            </Card>

            {/* Customer Portal */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Customer Self-Service Portal
                </Text>
                <Text as="p" tone="subdued">
                  Let customers view plans, manage subscriptions, and download invoices from your storefront.
                </Text>
                <Checkbox
                  label="Enable customer portal"
                  checked={shop.portalEnabled}
                  onChange={(checked) => {
                    const formData = new FormData();
                    formData.append("intent", "portal-toggle");
                    formData.append("portalEnabled", String(checked));
                    submit(formData, { method: "post" });
                  }}
                />
                {shop.portalEnabled && (
                  <Banner tone="info">
                    Portal URL: {shop.portalUrl}
                  </Banner>
                )}
              </BlockStack>
            </Card>

            {/* WhatsApp Config */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  WhatsApp Payment Reminders
                </Text>
                <Text as="p" tone="subdued">
                  Send payment confirmations and reminders via WhatsApp using Meta Cloud API.
                </Text>
                <TextField
                  label="WhatsApp API Key"
                  type="password"
                  value={whatsappApiKey}
                  onChange={setWhatsappApiKey}
                  autoComplete="off"
                  placeholder="EAAxxxxxxxx..."
                />
                <TextField
                  label="Phone Number ID"
                  value={whatsappPhoneId}
                  onChange={setWhatsappPhoneId}
                  autoComplete="off"
                  placeholder="1234567890"
                />
                <Checkbox
                  label="Enable WhatsApp notifications"
                  checked={whatsappEnabled}
                  onChange={setWhatsappEnabled}
                />
                <Button
                  variant="primary"
                  loading={isSubmitting}
                  onClick={() => {
                    const formData = new FormData();
                    formData.append("intent", "whatsapp-config");
                    formData.append("whatsappApiKey", whatsappApiKey);
                    formData.append("whatsappPhoneId", whatsappPhoneId);
                    formData.append("whatsappEnabled", String(whatsappEnabled));
                    submit(formData, { method: "post" });
                  }}
                >
                  Save WhatsApp Settings
                </Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Current Plan
                </Text>
                <Text as="p">
                  You are on the <strong>{shop.plan.toUpperCase()}</strong> plan.
                </Text>
                {shop.plan === "free" && (
                  <Text as="p" tone="subdued">
                    Upgrade to Pro for unlimited subscription plans and invoices.
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
