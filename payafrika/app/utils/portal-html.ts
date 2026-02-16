export function portalLayout(title: string, content: string, shopDomain?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - PayAfrika</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a2e; background: #f8f9fa; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 24px 16px; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #e9ecef; }
    .header h1 { font-size: 24px; color: #1a1a2e; }
    .header p { color: #6c757d; margin-top: 4px; }
    .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { font-size: 18px; margin-bottom: 12px; }
    .card h3 { font-size: 16px; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .btn { display: inline-block; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; cursor: pointer; border: none; transition: background 0.2s; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-secondary { background: #e9ecef; color: #1a1a2e; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .badge-trial { background: #dbeafe; color: #1e40af; }
    .badge-paused { background: #fef3c7; color: #92400e; }
    .badge-paid { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-failed { background: #fee2e2; color: #991b1b; }
    .price { font-size: 28px; font-weight: 700; color: #2563eb; }
    .interval { font-size: 14px; color: #6c757d; }
    input, select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
    input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    label { display: block; font-weight: 500; margin-bottom: 4px; font-size: 14px; }
    .text-muted { color: #6c757d; font-size: 14px; }
    .text-center { text-align: center; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .mb-2 { margin-bottom: 8px; }
    .flex { display: flex; gap: 8px; align-items: center; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e9ecef; }
    th { font-weight: 600; color: #6c757d; font-size: 12px; text-transform: uppercase; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .alert-success { background: #d1fae5; color: #065f46; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert-info { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      ${shopDomain ? `<p class="text-muted">${escapeHtml(shopDomain)}</p>` : ""}
    </div>
    ${content}
  </div>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    NGN: "\u20A6",
    GHS: "GH\u20B5",
    ZAR: "R",
    KES: "KSh",
    USD: "$",
  };
  return `${symbols[currency] || currency} ${(amount / 100).toLocaleString()}`;
}
