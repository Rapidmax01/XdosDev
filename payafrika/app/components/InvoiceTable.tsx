import { Badge, Button, DataTable } from "@shopify/polaris";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paystackRef?: string | null;
  createdAt: string;
  paidAt?: string | null;
  subscriber: {
    email: string;
    plan: {
      name: string;
    };
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "\u20A6",
  GHS: "GH\u20B5",
  ZAR: "R",
  KES: "KSh",
  USD: "$",
};

function statusBadge(status: string) {
  const toneMap: Record<string, "success" | "critical" | "attention"> = {
    paid: "success",
    failed: "critical",
    pending: "attention",
  };
  return (
    <Badge tone={toneMap[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function InvoiceTable({ invoices, shopDomain }: { invoices: Invoice[]; shopDomain?: string }) {
  const rows = invoices.map((inv) => {
    const symbol = CURRENCY_SYMBOLS[inv.currency] || inv.currency;
    return [
      inv.id.slice(0, 8).toUpperCase(),
      inv.subscriber.email,
      inv.subscriber.plan.name,
      `${symbol} ${(inv.amount / 100).toLocaleString()}`,
      statusBadge(inv.status),
      new Date(inv.createdAt).toLocaleDateString(),
      <Button
        size="slim"
        onClick={() => {
          const url = `/invoice-pdf/${inv.id}${shopDomain ? `?shop=${shopDomain}` : ''}`;
          window.open(url, '_blank');
        }}
      >
        PDF
      </Button>,
    ];
  });

  return (
    <DataTable
      columnContentTypes={["text", "text", "text", "numeric", "text", "text", "text"]}
      headings={["Invoice #", "Customer", "Plan", "Amount", "Status", "Date", ""]}
      rows={rows}
    />
  );
}
