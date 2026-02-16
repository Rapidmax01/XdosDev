import { createHmac } from "node:crypto";

export function verifyAppProxySignature(
  query: URLSearchParams,
  secret: string,
): boolean {
  const signature = query.get("signature");
  if (!signature) return false;

  // Build sorted query string excluding "signature"
  const params = Array.from(query.entries())
    .filter(([key]) => key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("");

  const hash = createHmac("sha256", secret).update(params).digest("hex");
  return hash === signature;
}

export function getShopFromProxy(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("shop") || null;
}
