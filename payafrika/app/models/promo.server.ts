import prisma from "../db.server";

export async function getPromoCodes(shopId: string) {
  return prisma.promoCode.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscribers: true } } },
  });
}

export async function createPromoCode(
  shopId: string,
  data: {
    code: string;
    discountType: string;
    discountValue: number;
    currency?: string;
    expiresAt?: string;
    maxUses?: number;
  },
) {
  return prisma.promoCode.create({
    data: {
      shopId,
      code: data.code.toUpperCase().trim(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      currency: data.currency,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxUses: data.maxUses || null,
    },
  });
}

export async function togglePromoCode(id: string, active: boolean) {
  return prisma.promoCode.update({
    where: { id },
    data: { active },
  });
}

export async function deletePromoCode(id: string) {
  return prisma.promoCode.delete({ where: { id } });
}

export async function validatePromoCode(
  shopId: string,
  code: string,
): Promise<{ valid: boolean; error?: string; promoCode?: any }> {
  const promo = await prisma.promoCode.findUnique({
    where: { shopId_code: { shopId, code: code.toUpperCase().trim() } },
  });

  if (!promo) return { valid: false, error: "Promo code not found" };
  if (!promo.active) return { valid: false, error: "Promo code is inactive" };
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, error: "Promo code has expired" };
  }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { valid: false, error: "Promo code usage limit reached" };
  }

  return { valid: true, promoCode: promo };
}

export function applyDiscount(
  amount: number,
  discountType: string,
  discountValue: number,
): number {
  if (discountType === "percentage") {
    return Math.round(amount * (1 - discountValue / 100));
  }
  // fixed discount
  return Math.max(0, amount - discountValue);
}

export async function incrementPromoUsage(id: string) {
  return prisma.promoCode.update({
    where: { id },
    data: { usedCount: { increment: 1 } },
  });
}
