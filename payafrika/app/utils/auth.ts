import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Full authentication - use only for document requests and actions
export async function authenticateAdmin(request: Request) {
  return authenticate.admin(request);
}

// Lightweight shop lookup from database - safe for all requests
// Uses the offline session stored by Shopify after initial OAuth
export async function getShopDomain(request: Request): Promise<string> {
  // Try to extract shop from the request URL (Shopify adds it on document loads)
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  if (shopParam) return shopParam;

  // Look up the most recent offline session
  const session = await prisma.session.findFirst({
    where: { isOnline: false },
    orderBy: { id: "desc" },
  });

  if (session?.shop) {
    return session.shop;
  }

  throw new Response("No authenticated shop found. Please reinstall the app.", { status: 401 });
}
