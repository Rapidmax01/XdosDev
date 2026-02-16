import prisma from "../db.server";
import { WhatsAppClient } from "../utils/whatsapp";
import { decrypt } from "../utils/encryption";

export async function logWhatsAppMessage(
  subscriberId: string,
  templateName: string,
  status = "sent",
) {
  return prisma.whatsAppMessage.create({
    data: { subscriberId, templateName, status },
  });
}

export async function sendWhatsAppNotification(
  shopId: string,
  subscriberId: string,
  phone: string,
  templateName: string,
  textFallback: string,
) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop?.whatsappEnabled || !shop.whatsappApiKey || !shop.whatsappPhoneId) {
    return null;
  }

  try {
    const apiKey = decrypt(shop.whatsappApiKey);
    const client = new WhatsAppClient(apiKey, shop.whatsappPhoneId);

    try {
      await client.sendTemplate(phone, templateName);
    } catch {
      // Template may not be approved yet, fall back to text
      await client.sendText(phone, textFallback);
    }

    await logWhatsAppMessage(subscriberId, templateName, "sent");
    return { success: true };
  } catch (error) {
    await logWhatsAppMessage(subscriberId, templateName, "failed");
    console.error("[WhatsApp] Send failed:", error);
    return { success: false, error };
  }
}
