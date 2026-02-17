import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { randomBytes } from "node:crypto";
import prisma from "../db.server";
import { getShopFromProxy } from "../utils/proxy-auth";
import { getOrCreateShop } from "../models/shop.server";
import { portalLayout, escapeHtml } from "../utils/portal-html";
import { sendEmail, buildMagicLinkEmail } from "../utils/email";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  // Check for token in URL (magic link click)
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    const subscriber = await prisma.subscriber.findFirst({
      where: {
        portalToken: token,
        portalTokenExp: { gt: new Date() },
      },
    });

    if (subscriber) {
      return Response.redirect(
        `https://${shopDomain}/apps/payafrika/portal?shop=${shopDomain}&token=${token}`,
        302,
      );
    }

    const html = portalLayout(
      "Link Expired",
      `<div class="alert alert-error">This magic link has expired. Please request a new one.</div>
       <a href="/apps/payafrika/login?shop=${encodeURIComponent(shopDomain)}" class="btn btn-primary">Request New Link</a>`,
      shopDomain,
    );
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  const html = portalLayout(
    "Sign In",
    `<div class="card">
      <h2>Customer Portal Login</h2>
      <p class="text-muted mb-2">Enter your email to receive a magic login link.</p>
      <form method="POST" action="/apps/payafrika/login?shop=${encodeURIComponent(shopDomain)}">
        <label>Email</label>
        <input type="email" name="email" required placeholder="your@email.com" />
        <button type="submit" class="btn btn-primary" style="width: 100%;">Send Magic Link</button>
      </form>
    </div>
    <div class="text-center mt-2">
      <a href="/apps/payafrika/plans?shop=${encodeURIComponent(shopDomain)}">&larr; View plans</a>
    </div>`,
    shopDomain,
  );

  return new Response(html, { headers: { "Content-Type": "text/html" } });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopDomain = getShopFromProxy(request);
  if (!shopDomain) return new Response("Missing shop", { status: 400 });

  const formData = await request.formData();
  const email = (formData.get("email") as string || "").trim().toLowerCase();

  if (!email) return new Response("Email required", { status: 400 });

  const shop = await getOrCreateShop(shopDomain);

  // Find subscriber with this email for any of this shop's plans
  const subscriber = await prisma.subscriber.findFirst({
    where: {
      email,
      plan: { shopId: shop.id },
    },
  });

  // Always show success (don't leak whether email exists)
  if (subscriber) {
    const token = randomBytes(32).toString("hex");
    const exp = new Date();
    exp.setHours(exp.getHours() + 1); // 1 hour expiry

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { portalToken: token, portalTokenExp: exp },
    });

    const magicLink = `https://${shopDomain}/apps/payafrika/login?shop=${shopDomain}&token=${token}`;

    try {
      await sendEmail({
        to: email,
        subject: `Sign in to your subscription portal — ${shopDomain}`,
        htmlContent: buildMagicLinkEmail(magicLink, shopDomain),
      });
    } catch (error) {
      console.error("[PayAfrika] Failed to send magic link email:", error);
    }
  }

  const html = portalLayout(
    "Check Your Email",
    `<div class="card text-center">
      <h2>Magic link sent!</h2>
      <p class="text-muted mt-2">If an account exists for <strong>${escapeHtml(email)}</strong>, we've sent a login link to your email. The link expires in 1 hour.</p>
    </div>`,
    shopDomain,
  );

  return new Response(html, { headers: { "Content-Type": "text/html" } });
};
