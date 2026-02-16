import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Banner,
  EmptyState,
  DataTable,
  Badge,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { getShopDomain } from "../utils/auth";
import { getOrCreateShop } from "../models/shop.server";
import { getDunningSubscribers, cancelDunning, initiateDunning } from "../models/dunning.server";
import { DUNNING_SCHEDULE } from "../utils/dunning";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const shop = await getOrCreateShop(shopDomain);
  const subscribers = await getDunningSubscribers(shop.id);

  return json({
    subscribers: subscribers.map((s) => ({
      id: s.id,
      email: s.email,
      planName: s.plan.name,
      status: s.status,
      dunningStartedAt: s.dunningStartedAt?.toISOString(),
      attempts: s.dunningAttempts.map((a) => ({
        id: a.id,
        action: a.action,
        scheduledFor: a.scheduledFor.toISOString(),
        executedAt: a.executedAt?.toISOString(),
        result: a.result,
      })),
    })),
    schedule: DUNNING_SCHEDULE,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = await getShopDomain(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const subscriberId = formData.get("subscriberId") as string;

  if (intent === "cancel-dunning") {
    await cancelDunning(subscriberId);
    return json({ success: "Dunning cancelled for subscriber" });
  }

  if (intent === "manual-retry") {
    await cancelDunning(subscriberId);
    await initiateDunning(subscriberId);
    return json({ success: "Dunning restarted — retry will be attempted" });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function Dunning() {
  const { subscribers, schedule } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as any;
  const submit = useSubmit();
  const navigation = useNavigation();

  const rows = subscribers.map((s: any) => {
    const lastAttempt = s.attempts.filter((a: any) => a.executedAt).pop();
    const nextAttempt = s.attempts.find((a: any) => !a.executedAt);

    return [
      s.email,
      s.planName,
      <Badge
        key={s.id}
        tone={s.status === "active" ? "warning" : "critical"}
      >{`${s.status} (dunning)`}</Badge>,
      s.dunningStartedAt
        ? new Date(s.dunningStartedAt).toLocaleDateString()
        : "-",
      lastAttempt
        ? `${lastAttempt.action} (${lastAttempt.result})`
        : "Pending",
      nextAttempt
        ? `${nextAttempt.action} on ${new Date(nextAttempt.scheduledFor).toLocaleDateString()}`
        : "Complete",
      <InlineStack gap="200" key={`actions-${s.id}`}>
        <Button
          size="slim"
          onClick={() => {
            const formData = new FormData();
            formData.append("intent", "manual-retry");
            formData.append("subscriberId", s.id);
            submit(formData, { method: "post" });
          }}
        >
          Retry Now
        </Button>
        <Button
          size="slim"
          tone="critical"
          variant="plain"
          onClick={() => {
            const formData = new FormData();
            formData.append("intent", "cancel-dunning");
            formData.append("subscriberId", s.id);
            submit(formData, { method: "post" });
          }}
        >
          Cancel Dunning
        </Button>
      </InlineStack>,
    ];
  });

  return (
    <Page title="Dunning Management">
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
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Recovery Schedule
                </Text>
                <Text as="p" tone="subdued">
                  When a payment fails, PayAfrika automatically attempts recovery:
                </Text>
                <BlockStack gap="100">
                  {schedule.map((step: any, i: number) => (
                    <Text as="p" key={i}>
                      Day {step.day}: <strong>{step.description}</strong>
                    </Text>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>

            {subscribers.length === 0 ? (
              <Card>
                <EmptyState
                  heading="No active dunning"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    When a subscriber's payment fails, they'll appear here with
                    automated recovery in progress.
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <Text variant="headingMd" as="h2">
                  Subscribers in Dunning ({subscribers.length})
                </Text>
                <DataTable
                  columnContentTypes={[
                    "text", "text", "text", "text", "text", "text", "text",
                  ]}
                  headings={[
                    "Email", "Plan", "Status", "Started", "Last Action", "Next Action", "Actions",
                  ]}
                  rows={rows}
                />
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
