import prisma from "../db.server";

export async function getSubscribers(planId: string) {
  return prisma.subscriber.findMany({
    where: { planId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

export async function getSubscribersByShop(shopId: string) {
  return prisma.subscriber.findMany({
    where: { plan: { shopId } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

export async function getActiveSubscriberCount(shopId: string) {
  return prisma.subscriber.count({
    where: { plan: { shopId }, status: "active" },
  });
}

export async function createSubscriber(data: {
  planId: string;
  shopifyCustomerId: string;
  email: string;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  nextBillingDate?: Date;
  phone?: string;
  whatsappOptIn?: boolean;
  promoCodeId?: string;
  trialEndsAt?: Date;
}) {
  return prisma.subscriber.create({ data });
}

export async function updateSubscriberByPaystackCode(
  paystackSubscriptionCode: string,
  data: {
    status?: string;
    nextBillingDate?: Date;
  },
) {
  const subscriber = await prisma.subscriber.findFirst({
    where: { paystackSubscriptionCode },
  });
  if (!subscriber) return null;
  return prisma.subscriber.update({
    where: { id: subscriber.id },
    data,
  });
}

export async function getChurnedCount(shopId: string, since: Date) {
  return prisma.subscriber.count({
    where: {
      plan: { shopId },
      status: "cancelled",
      updatedAt: { gte: since },
    },
  });
}
