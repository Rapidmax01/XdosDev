import { authenticate } from "../shopify.server";

// Full authentication - use for all requests (loaders and actions)
// With unstable_newEmbeddedAuthStrategy, this handles session tokens
// from App Bridge on client-side navigations
export async function authenticateAdmin(request: Request) {
  return authenticate.admin(request);
}

// Get shop domain via Shopify authentication
// Uses authenticate.admin() which validates session tokens on all requests
export async function getShopDomain(request: Request): Promise<string> {
  const { session } = await authenticate.admin(request);
  return session.shop;
}
