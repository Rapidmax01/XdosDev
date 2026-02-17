export const loader = async () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - PayAfrika</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e; line-height: 1.7; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin-top: 32px; }
    .date { color: #6c757d; margin-bottom: 32px; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="date">Last updated: February 16, 2026</p>

  <p>PayAfrika ("we", "us", "our") operates as a Shopify application that provides subscription billing services for merchants. This Privacy Policy explains how we collect, use, and protect information when you use our app.</p>

  <h2>1. Information We Collect</h2>
  <p><strong>From Merchants:</strong> When you install PayAfrika, we access your Shopify store information including store domain, product data, customer data, and order data as permitted by the Shopify API scopes you authorize. We also store your Paystack API keys (encrypted) and optional WhatsApp API credentials (encrypted).</p>
  <p><strong>From Subscribers:</strong> We collect email addresses, phone numbers (optional), and payment information processed through Paystack. We do not store credit card numbers — all payment data is handled by Paystack.</p>

  <h2>2. How We Use Information</h2>
  <ul>
    <li>Process subscription payments via Paystack</li>
    <li>Generate and deliver invoices</li>
    <li>Send payment notifications via email and WhatsApp (when opted in)</li>
    <li>Provide analytics and reporting to merchants</li>
    <li>Manage subscription lifecycle (trials, dunning, cancellations)</li>
  </ul>

  <h2>3. Data Storage & Security</h2>
  <p>All data is stored in encrypted databases hosted on secure infrastructure. API keys and sensitive credentials are encrypted using AES-256-GCM encryption at rest. We use HTTPS for all data in transit.</p>

  <h2>4. Third-Party Services</h2>
  <p>We integrate with the following third-party services:</p>
  <ul>
    <li><strong>Paystack</strong> — Payment processing (<a href="https://paystack.com/privacy">Paystack Privacy Policy</a>)</li>
    <li><strong>Meta/WhatsApp Business API</strong> — Optional payment notifications (<a href="https://www.whatsapp.com/legal/privacy-policy">WhatsApp Privacy Policy</a>)</li>
    <li><strong>Brevo</strong> — Transactional emails (<a href="https://www.brevo.com/legal/privacypolicy/">Brevo Privacy Policy</a>)</li>
    <li><strong>Shopify</strong> — E-commerce platform (<a href="https://www.shopify.com/legal/privacy">Shopify Privacy Policy</a>)</li>
  </ul>

  <h2>5. Data Retention</h2>
  <p>We retain merchant and subscriber data for as long as the app is installed. When a merchant uninstalls PayAfrika, we delete all associated data within 30 days, except where retention is required by law.</p>

  <h2>6. Your Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Access your personal data</li>
    <li>Request correction of inaccurate data</li>
    <li>Request deletion of your data</li>
    <li>Opt out of WhatsApp notifications at any time</li>
  </ul>

  <h2>7. GDPR & Data Protection</h2>
  <p>For users in the European Economic Area, we process data under legitimate interest for merchants and consent for subscribers. You may exercise your GDPR rights by contacting us.</p>

  <h2>8. Changes to This Policy</h2>
  <p>We may update this policy from time to time. We will notify merchants of significant changes via the app dashboard.</p>

  <h2>9. Contact Us</h2>
  <p>For privacy-related questions or requests, contact us at <a href="mailto:privacy@xdosdev.com">privacy@xdosdev.com</a>.</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};
