import prisma from "../db.server";
import { getDecryptedPaystackKeys } from "./shop.server";
import { PaystackClient } from "../utils/paystack";

export async function getPlans(shopId: string) {
  return prisma.subscriptionPlan.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscribers: true } } },
  });
}

export async function getPlan(id: string) {
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      shop: true,
      subscribers: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { subscribers: true } },
    },
  });
}

export async function createPlan(
  shopDomain: string,
  shopId: string,
  data: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
    description?: string;
    trialDays?: number;
  },
) {
  // Create plan in Paystack first
  const keys = await getDecryptedPaystackKeys(shopDomain);
  let paystackPlanCode: string | undefined;

  if (keys) {
    const paystack = new PaystackClient(keys.secretKey);
    const result = await paystack.createPlan({
      name: data.name,
      amount: data.amount,
      interval: data.interval,
      currency: data.currency,
      description: data.description,
    });
    paystackPlanCode = result.data.plan_code;
  }

  return prisma.subscriptionPlan.create({
    data: {
      shopId,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      interval: data.interval,
      description: data.description,
      paystackPlanCode,
      trialDays: data.trialDays || 0,
    },
  });
}

export async function updatePlan(
  id: string,
  shopDomain: string,
  data: {
    name?: string;
    amount?: number;
    interval?: string;
    description?: string;
    active?: boolean;
  },
) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Plan not found");

  // Update in Paystack if keys exist and plan is synced
  if (plan.paystackPlanCode) {
    const keys = await getDecryptedPaystackKeys(shopDomain);
    if (keys) {
      const paystack = new PaystackClient(keys.secretKey);
      await paystack.updatePlan(plan.paystackPlanCode, {
        name: data.name,
        amount: data.amount,
        interval: data.interval,
        description: data.description,
      });
    }
  }

  return prisma.subscriptionPlan.update({ where: { id }, data });
}

export async function deletePlan(id: string) {
  // Soft delete by deactivating
  return prisma.subscriptionPlan.update({
    where: { id },
    data: { active: false },
  });
}

export async function countPlans(shopId: string) {
  return prisma.subscriptionPlan.count({
    where: { shopId, active: true },
  });
}
