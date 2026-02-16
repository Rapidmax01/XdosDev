import prisma from "../db.server";

export async function getInvoices(shopId: string, limit = 50) {
  return prisma.invoice.findMany({
    where: { subscriber: { plan: { shopId } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      subscriber: {
        include: { plan: true },
      },
    },
  });
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      subscriber: {
        include: { plan: { include: { shop: true } } },
      },
    },
  });
}

export async function createInvoice(data: {
  subscriberId: string;
  amount: number;
  currency: string;
  status?: string;
  paystackRef?: string;
  paidAt?: Date;
}) {
  return prisma.invoice.create({ data });
}

export async function updateInvoiceByRef(
  paystackRef: string,
  data: { status: string; paidAt?: Date },
) {
  const invoice = await prisma.invoice.findFirst({
    where: { paystackRef },
  });
  if (!invoice) return null;
  return prisma.invoice.update({
    where: { id: invoice.id },
    data,
  });
}

export async function getMonthlyRevenue(shopId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const invoices = await prisma.invoice.findMany({
    where: {
      subscriber: { plan: { shopId } },
      status: "paid",
      paidAt: { gte: startOfMonth },
    },
  });

  return invoices.reduce((sum, inv) => sum + inv.amount, 0);
}

export async function getInvoiceCount(shopId: string, month?: Date) {
  const start = month || new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return prisma.invoice.count({
    where: {
      subscriber: { plan: { shopId } },
      createdAt: { gte: start, lt: end },
    },
  });
}
