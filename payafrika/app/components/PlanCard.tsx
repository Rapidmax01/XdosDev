import { Badge, BlockStack, Button, Card, InlineStack, Text } from "@shopify/polaris";

interface PlanCardProps {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  active: boolean;
  subscriberCount: number;
}

function formatAmount(amount: number, currency: string): string {
  const majorAmount = amount / 100;
  const symbols: Record<string, string> = {
    NGN: "\u20A6",
    GHS: "GH\u20B5",
    ZAR: "R",
    KES: "KSh",
    USD: "$",
  };
  return `${symbols[currency] || currency} ${majorAmount.toLocaleString()}`;
}

export function PlanCard({
  id,
  name,
  amount,
  currency,
  interval,
  active,
  subscriberCount,
}: PlanCardProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h3">
            {name}
          </Text>
          <Badge tone={active ? "success" : undefined}>
            {active ? "Active" : "Inactive"}
          </Badge>
        </InlineStack>

        <Text variant="headingLg" as="p">
          {formatAmount(amount, currency)}
          <Text as="span" tone="subdued">
            {" "}/ {interval}
          </Text>
        </Text>

        <Text as="p" tone="subdued">
          {subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}
        </Text>

        <InlineStack gap="200">
          <Button url={`/app/plans/${id}`}>Edit</Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
