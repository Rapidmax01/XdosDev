const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

export class WhatsAppClient {
  private apiKey: string;
  private phoneNumberId: string;

  constructor(apiKey: string, phoneNumberId: string) {
    this.apiKey = apiKey;
    this.phoneNumberId = phoneNumberId;
  }

  private async request(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${GRAPH_API_BASE}/${this.phoneNumberId}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(`WhatsApp API error: ${error.error?.message || res.statusText}`);
    }

    return res.json();
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode = "en",
    components?: Record<string, unknown>[],
  ) {
    return this.request("/messages", {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""), // strip non-digits
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    });
  }

  async sendText(to: string, text: string) {
    return this.request("/messages", {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: text },
    });
  }
}
