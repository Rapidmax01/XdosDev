const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

export class PaystackClient {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<PaystackResponse<T>> {
    const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Paystack API error: ${error.message || res.statusText}`);
    }

    return res.json();
  }

  // Plans
  async createPlan(params: {
    name: string;
    amount: number;
    interval: string;
    currency: string;
    description?: string;
  }) {
    return this.request<{ plan_code: string }>("POST", "/plan", params);
  }

  async updatePlan(planCode: string, params: {
    name?: string;
    amount?: number;
    interval?: string;
    description?: string;
  }) {
    return this.request("PUT", `/plan/${planCode}`, params);
  }

  async getPlan(planCode: string) {
    return this.request("GET", `/plan/${planCode}`);
  }

  async listPlans() {
    return this.request("GET", "/plan");
  }

  // Subscriptions
  async createSubscription(params: {
    customer: string;
    plan: string;
    start_date?: string;
  }) {
    return this.request<{ subscription_code: string }>(
      "POST",
      "/subscription",
      params,
    );
  }

  async enableSubscription(params: { code: string; token: string }) {
    return this.request("POST", "/subscription/enable", params);
  }

  async disableSubscription(params: { code: string; token: string }) {
    return this.request("POST", "/subscription/disable", params);
  }

  async getSubscription(idOrCode: string) {
    return this.request("GET", `/subscription/${idOrCode}`);
  }

  // Transactions
  async initializeTransaction(params: {
    email: string;
    amount: number;
    currency?: string;
    plan?: string;
    callback_url?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request<{ authorization_url: string; reference: string }>(
      "POST",
      "/transaction/initialize",
      params,
    );
  }

  async verifyTransaction(reference: string) {
    return this.request("GET", `/transaction/verify/${reference}`);
  }

  async listTransactions(params?: {
    from?: string;
    to?: string;
    status?: string;
    perPage?: number;
    page?: number;
  }) {
    const query = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return this.request("GET", `/transaction${query}`);
  }

  // Customers
  async createCustomer(params: {
    email: string;
    first_name?: string;
    last_name?: string;
  }) {
    return this.request<{ customer_code: string }>(
      "POST",
      "/customer",
      params,
    );
  }

  async getCustomer(emailOrCode: string) {
    return this.request("GET", `/customer/${emailOrCode}`);
  }

  // Charge authorization (for dunning retries)
  async chargeAuthorization(params: {
    email: string;
    amount: number;
    authorization_code: string;
    currency?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request<{ reference: string }>(
      "POST",
      "/transaction/charge_authorization",
      params,
    );
  }

  // Verify webhook signature
  static verifyWebhookSignature(
    body: string,
    signature: string,
    secretKey: string,
  ): boolean {
    const crypto = require("node:crypto");
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(body)
      .digest("hex");
    return hash === signature;
  }
}
