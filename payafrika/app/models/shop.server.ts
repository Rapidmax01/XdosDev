import prisma from "../db.server";
import { encrypt, decrypt } from "../utils/encryption";

export async function getShop(shopDomain: string) {
  return prisma.shop.findUnique({ where: { shopDomain } });
}

export async function getOrCreateShop(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain },
  });
}

export async function updatePaystackKeys(
  shopDomain: string,
  secretKey: string,
  publicKey: string,
) {
  return prisma.shop.update({
    where: { shopDomain },
    data: {
      paystackSecretKey: encrypt(secretKey),
      paystackPublicKey: encrypt(publicKey),
    },
  });
}

export async function getDecryptedPaystackKeys(shopDomain: string) {
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop?.paystackSecretKey || !shop?.paystackPublicKey) {
    return null;
  }
  return {
    secretKey: decrypt(shop.paystackSecretKey),
    publicKey: decrypt(shop.paystackPublicKey),
  };
}

export async function updateShopSettings(
  shopDomain: string,
  data: { currency?: string; invoiceLogo?: string },
) {
  return prisma.shop.update({
    where: { shopDomain },
    data,
  });
}

export async function updateWhatsAppSettings(
  shopDomain: string,
  data: { apiKey: string; phoneId: string; enabled: boolean },
) {
  return prisma.shop.update({
    where: { shopDomain },
    data: {
      whatsappApiKey: data.apiKey ? encrypt(data.apiKey) : undefined,
      whatsappPhoneId: data.phoneId || undefined,
      whatsappEnabled: data.enabled,
    },
  });
}

export async function getDecryptedWhatsAppKey(shopDomain: string) {
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop?.whatsappApiKey) return null;
  return decrypt(shop.whatsappApiKey);
}

export async function updatePortalSettings(shopDomain: string, enabled: boolean) {
  return prisma.shop.update({
    where: { shopDomain },
    data: { portalEnabled: enabled },
  });
}

export async function updateShopPlan(
  shopDomain: string,
  plan: string,
  chargeId?: string,
) {
  return prisma.shop.update({
    where: { shopDomain },
    data: { plan, shopifyChargeId: chargeId },
  });
}
