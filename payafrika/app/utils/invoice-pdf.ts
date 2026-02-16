import PDFDocument from "pdfkit";

interface InvoiceData {
  invoiceId: string;
  merchantName: string;
  merchantLogo?: string | null;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  showBranding: boolean; // "Powered by PayAfrika" for free tier
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "NGN",
  GHS: "GHS",
  ZAR: "R",
  KES: "KSh",
  USD: "$",
};

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const symbol = CURRENCY_SYMBOLS[data.currency] || data.currency;
    const amountDisplay = `${symbol} ${(data.amount / 100).toLocaleString()}`;

    // Logo
    if (data.merchantLogo) {
      try {
        const logoBuffer = Buffer.from(data.merchantLogo, "base64");
        doc.image(logoBuffer, 50, 50, { width: 80, height: 80, fit: [80, 80] });
        doc.moveDown(0.5);
        doc.y = Math.max(doc.y, 140); // ensure text starts below logo
      } catch {
        // Skip logo if invalid
      }
    }

    // Header
    doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", { align: "right" });
    doc.moveDown(0.5);

    // Merchant info
    doc.fontSize(14).font("Helvetica-Bold").text(data.merchantName);
    doc.moveDown(2);

    // Invoice details
    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice #: ${data.invoiceId.slice(0, 8).toUpperCase()}`);
    doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`);
    doc.text(
      `Status: ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
    );
    if (data.paidAt) {
      doc.text(`Paid: ${new Date(data.paidAt).toLocaleDateString()}`);
    }
    doc.moveDown(1);

    // Bill to
    doc.font("Helvetica-Bold").text("Bill To:");
    doc.font("Helvetica").text(data.customerEmail);
    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Description", 50, tableTop);
    doc.text("Amount", 400, tableTop, { align: "right" });

    // Divider
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table row
    doc.font("Helvetica");
    doc.text(`${data.planName} - Subscription`, 50, tableTop + 25);
    doc.text(amountDisplay, 400, tableTop + 25, { align: "right" });

    // Total divider
    doc
      .moveTo(350, tableTop + 45)
      .lineTo(550, tableTop + 45)
      .stroke();

    // Total
    doc.font("Helvetica-Bold");
    doc.text("Total:", 350, tableTop + 55);
    doc.text(amountDisplay, 400, tableTop + 55, { align: "right" });

    // Footer branding
    if (data.showBranding) {
      doc.moveDown(8);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#888")
        .text("Powered by PayAfrika - Subscription billing for Africa", {
          align: "center",
        });
    }

    doc.end();
  });
}
