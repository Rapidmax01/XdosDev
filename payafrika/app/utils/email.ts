const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[Email] BREVO_API_KEY not set, skipping email send");
    return null;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@payafrika.com";
  const senderName = process.env.BREVO_SENDER_NAME || "PayAfrika";

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("[Email] Brevo API error:", error);
    throw new Error(`Email send failed: ${res.status}`);
  }

  return res.json();
}

export function buildMagicLinkEmail(magicLink: string, shopDomain: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; margin: 0; padding: 32px 16px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #1a1a2e; margin: 0 0 16px;">Sign in to your subscription portal</h2>
    <p style="color: #4a5568; line-height: 1.6;">
      Click the button below to access your subscription dashboard at <strong>${shopDomain}</strong>.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${magicLink}"
         style="display: inline-block; padding: 14px 32px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Sign In
      </a>
    </div>
    <p style="color: #718096; font-size: 13px; line-height: 1.6;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      Powered by PayAfrika
    </p>
  </div>
</body>
</html>`;
}
