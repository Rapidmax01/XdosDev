import prisma from "../db.server";

export async function getMrrOverTime(shopId: string, months = 12) {
  const results: { month: string; mrr: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const invoices = await prisma.invoice.findMany({
      where: {
        subscriber: { plan: { shopId } },
        status: "paid",
        paidAt: { gte: date, lt: endDate },
      },
    });

    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    results.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      mrr: total / 100,
    });
  }

  return results;
}

export async function getSubscriberGrowth(shopId: string, months = 12) {
  const results: { month: string; total: number; new: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const totalAtEnd = await prisma.subscriber.count({
      where: {
        plan: { shopId },
        createdAt: { lt: endDate },
        status: { in: ["active", "trial"] },
      },
    });

    const newInMonth = await prisma.subscriber.count({
      where: {
        plan: { shopId },
        createdAt: { gte: date, lt: endDate },
      },
    });

    results.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      total: totalAtEnd,
      new: newInMonth,
    });
  }

  return results;
}

export async function getChurnData(shopId: string, months = 6) {
  const results: { month: string; churned: number; rate: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const churned = await prisma.subscriber.count({
      where: {
        plan: { shopId },
        status: "cancelled",
        updatedAt: { gte: date, lt: endDate },
      },
    });

    const activeAtStart = await prisma.subscriber.count({
      where: {
        plan: { shopId },
        createdAt: { lt: date },
        status: { in: ["active", "trial", "cancelled"] },
      },
    });

    results.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      churned,
      rate: activeAtStart > 0 ? Math.round((churned / activeAtStart) * 100) : 0,
    });
  }

  return results;
}

export async function getRevenueByPlan(shopId: string) {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { shopId, active: true },
    include: {
      subscribers: {
        include: {
          invoices: {
            where: { status: "paid" },
          },
        },
      },
    },
  });

  return plans.map((plan) => {
    const revenue = plan.subscribers.reduce(
      (sum, sub) => sum + sub.invoices.reduce((s, inv) => s + inv.amount, 0),
      0,
    );
    return {
      name: plan.name,
      revenue: revenue / 100,
      subscribers: plan.subscribers.length,
    };
  });
}
