import prisma from "../db.server";
import { DUNNING_SCHEDULE, getScheduledDate } from "../utils/dunning";

export async function initiateDunning(subscriberId: string) {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
  });

  if (!subscriber || subscriber.dunningStartedAt) return; // already in dunning

  const now = new Date();

  // Mark subscriber as in dunning
  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: { dunningStartedAt: now },
  });

  // Create dunning attempts for the full schedule
  for (let i = 0; i < DUNNING_SCHEDULE.length; i++) {
    const step = DUNNING_SCHEDULE[i];
    await prisma.dunningAttempt.create({
      data: {
        subscriberId,
        attemptNumber: i + 1,
        scheduledFor: getScheduledDate(now, step.day),
        action: step.action,
      },
    });
  }
}

export async function cancelDunning(subscriberId: string) {
  // Clear dunning state
  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: { dunningStartedAt: null },
  });

  // Mark all pending attempts as skipped
  const pending = await prisma.dunningAttempt.findMany({
    where: { subscriberId, executedAt: null },
  });

  for (const attempt of pending) {
    await prisma.dunningAttempt.update({
      where: { id: attempt.id },
      data: { executedAt: new Date(), result: "skipped" },
    });
  }
}

export async function getDueAttempts() {
  return prisma.dunningAttempt.findMany({
    where: {
      executedAt: null,
      scheduledFor: { lte: new Date() },
    },
    include: {
      subscriber: {
        include: {
          plan: { include: { shop: true } },
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
  });
}

export async function markAttemptExecuted(id: string, result: string) {
  return prisma.dunningAttempt.update({
    where: { id },
    data: { executedAt: new Date(), result },
  });
}

export async function getDunningSubscribers(shopId: string) {
  return prisma.subscriber.findMany({
    where: {
      plan: { shopId },
      dunningStartedAt: { not: null },
    },
    include: {
      plan: true,
      dunningAttempts: { orderBy: { attemptNumber: "asc" } },
    },
    orderBy: { dunningStartedAt: "desc" },
  });
}

export async function manualRetry(subscriberId: string) {
  // Reset dunning - will be re-initiated if payment fails again
  await cancelDunning(subscriberId);
}
