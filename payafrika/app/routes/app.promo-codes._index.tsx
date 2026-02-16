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
  DataTable,
  Badge,
  Modal,
  FormLayout,
  InlineStack,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import { getPromoCodes, createPromoCode, togglePromoCode, deletePromoCode } from "../models/promo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const promoCodes = await getPromoCodes(shop.id);

  return json({
    promoCodes: promoCodes.map((p) => ({
      ...p,
      usageCount: p._count.subscribers,
    })),
    currency: shop.currency,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const code = formData.get("code") as string;
    const discountType = formData.get("discountType") as string;
    const discountValue = parseInt(formData.get("discountValue") as string, 10);
    const expiresAt = formData.get("expiresAt") as string;
    const maxUses = formData.get("maxUses") as string;

    if (!code || !discountType || isNaN(discountValue)) {
      return json({ error: "Code, discount type, and value are required" }, { status: 400 });
    }

    if (discountType === "percentage" && (discountValue < 1 || discountValue > 100)) {
      return json({ error: "Percentage must be between 1 and 100" }, { status: 400 });
    }

    try {
      await createPromoCode(shop.id, {
        code,
        discountType,
        discountValue: discountType === "fixed" ? discountValue * 100 : discountValue,
        currency: shop.currency,
        expiresAt: expiresAt || undefined,
        maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      });
      return json({ success: "Promo code created" });
    } catch (error: any) {
      if (error.code === "P2002") {
        return json({ error: "A promo code with this name already exists" }, { status: 400 });
      }
      return json({ error: "Failed to create promo code" }, { status: 500 });
    }
  }

  if (intent === "toggle") {
    const id = formData.get("id") as string;
    const active = formData.get("active") === "true";
    await togglePromoCode(id, active);
    return json({ success: `Promo code ${active ? "activated" : "deactivated"}` });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await deletePromoCode(id);
    return json({ success: "Promo code deleted" });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function PromoCodes() {
  const { promoCodes, currency } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as any;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const handleCreate = useCallback(() => {
    const formData = new FormData();
    formData.append("intent", "create");
    formData.append("code", code);
    formData.append("discountType", discountType);
    formData.append("discountValue", discountValue);
    if (expiresAt) formData.append("expiresAt", expiresAt);
    if (maxUses) formData.append("maxUses", maxUses);
    submit(formData, { method: "post" });
    setShowModal(false);
    setCode("");
    setDiscountValue("");
    setExpiresAt("");
    setMaxUses("");
  }, [code, discountType, discountValue, expiresAt, maxUses, submit]);

  const rows = promoCodes.map((p: any) => [
    p.code,
    p.discountType === "percentage"
      ? `${p.discountValue}%`
      : `${currency} ${(p.discountValue / 100).toLocaleString()}`,
    p.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>,
    `${p.usedCount}${p.maxUses ? ` / ${p.maxUses}` : ""}`,
    p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "Never",
    <InlineStack gap="200" key={p.id}>
      <Button
        size="slim"
        onClick={() => {
          const formData = new FormData();
          formData.append("intent", "toggle");
          formData.append("id", p.id);
          formData.append("active", String(!p.active));
          submit(formData, { method: "post" });
        }}
      >
        {p.active ? "Disable" : "Enable"}
      </Button>
      <Button
        size="slim"
        tone="critical"
        variant="plain"
        onClick={() => {
          const formData = new FormData();
          formData.append("intent", "delete");
          formData.append("id", p.id);
          submit(formData, { method: "post" });
        }}
      >
        Delete
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page
      title="Promo Codes"
      primaryAction={{
        content: "Create Promo Code",
        onAction: () => setShowModal(true),
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.success && (
              <Banner tone="success" onDismiss={() => {}}>{actionData.success}</Banner>
            )}
            {actionData?.error && (
              <Banner tone="critical" onDismiss={() => {}}>{actionData.error}</Banner>
            )}

            {promoCodes.length === 0 ? (
              <Card>
                <EmptyState
                  heading="Create your first promo code"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Offer discounts and free trials to attract new subscribers.</p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                  headings={["Code", "Discount", "Status", "Used", "Expires", "Actions"]}
                  rows={rows}
                />
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Promo Code"
        primaryAction={{
          content: "Create",
          onAction: handleCreate,
          loading: isSubmitting,
          disabled: !code || !discountValue,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setShowModal(false) }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Code"
              value={code}
              onChange={setCode}
              autoComplete="off"
              placeholder="SAVE20"
              helpText="Will be uppercased automatically"
            />
            <Select
              label="Discount Type"
              options={[
                { label: "Percentage (%)", value: "percentage" },
                { label: `Fixed Amount (${currency})`, value: "fixed" },
              ]}
              value={discountType}
              onChange={setDiscountType}
            />
            <TextField
              label={discountType === "percentage" ? "Discount (%)" : `Discount Amount (${currency})`}
              type="number"
              value={discountValue}
              onChange={setDiscountValue}
              autoComplete="off"
            />
            <TextField
              label="Expiry Date (optional)"
              type="date"
              value={expiresAt}
              onChange={setExpiresAt}
              autoComplete="off"
            />
            <TextField
              label="Max Uses (optional)"
              type="number"
              value={maxUses}
              onChange={setMaxUses}
              autoComplete="off"
              helpText="Leave empty for unlimited"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
