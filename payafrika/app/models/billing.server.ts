import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { updateShopPlan } from "./shop.server";

export const PLANS = {
  free: { name: "Free", price: 0, features: { maxPlans: 3, maxInvoicesPerMonth: 10 } },
  pro: { name: "Pro", price: 19, features: { maxPlans: Infinity, maxInvoicesPerMonth: Infinity } },
  plus: { name: "Plus", price: 49, features: { maxPlans: Infinity, maxInvoicesPerMonth: Infinity } },
} as const;

export type PlanName = keyof typeof PLANS;

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanName]?.features || PLANS.free.features;
}

export async function createSubscriptionCharge(
  admin: AdminApiContext,
  shopDomain: string,
  planName: "pro" | "plus",
  returnUrl: string,
) {
  const plan = PLANS[planName];

  const response = await admin.graphql(
    `#graphql
    mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $amount: Decimal!, $interval: AppPricingInterval!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $amount, currencyCode: USD }
              interval: $interval
            }
          }
        }]
      ) {
        appSubscription {
          id
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        name: `PayAfrika ${plan.name}`,
        returnUrl,
        amount: plan.price.toString(),
        interval: "EVERY_30_DAYS",
      },
    },
  );

  const data = await response.json();
  const result = data.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors[0].message);
  }

  return {
    confirmationUrl: result?.confirmationUrl,
    subscriptionId: result?.appSubscription?.id,
  };
}

export async function handleBillingCallback(
  shopDomain: string,
  chargeId: string,
  planName: string,
) {
  await updateShopPlan(shopDomain, planName, chargeId);
}
