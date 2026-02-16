// Dunning schedule: Day 0 notify → Day 3 retry → Day 7 remind → Day 14 final warning → Day 21 cancel
export const DUNNING_SCHEDULE = [
  { day: 0, action: "notify" as const, description: "Payment failed notification" },
  { day: 3, action: "retry" as const, description: "Retry payment" },
  { day: 7, action: "remind" as const, description: "Payment reminder" },
  { day: 14, action: "final_warning" as const, description: "Final warning before cancellation" },
  { day: 21, action: "cancel" as const, description: "Auto-cancel subscription" },
];

export type DunningAction = "notify" | "retry" | "remind" | "final_warning" | "cancel";

export function getScheduledDate(startDate: Date, dayOffset: number): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

export function getDunningActionMessage(action: DunningAction, planName: string): string {
  switch (action) {
    case "notify":
      return `Your payment for ${planName} failed. Please update your payment method.`;
    case "retry":
      return `We're retrying your payment for ${planName}. Please ensure your card is funded.`;
    case "remind":
      return `Reminder: Your ${planName} subscription payment is overdue. Please update your payment method to avoid cancellation.`;
    case "final_warning":
      return `Final warning: Your ${planName} subscription will be cancelled in 7 days unless payment is received.`;
    case "cancel":
      return `Your ${planName} subscription has been cancelled due to failed payment. You can resubscribe anytime.`;
  }
}
