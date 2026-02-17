import { createRequestHandler } from "@remix-run/express";
import express from "express";

const app = express();
app.use(express.static("build/client"));
app.all("*", createRequestHandler({ build: await import("./build/server/index.js") }));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`[server] PayAfrika running on http://0.0.0.0:${port}`);
});

// Dunning cron - runs every hour
const DUNNING_INTERVAL = 60 * 60 * 1000; // 1 hour
const CRON_SECRET = process.env.CRON_SECRET;

async function runDunningCron() {
  if (!CRON_SECRET) {
    console.log("[cron] CRON_SECRET not set, skipping dunning");
    return;
  }

  try {
    const url = `http://0.0.0.0:${port}/api/dunning-cron`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    console.log(`[cron] Dunning completed: ${data.processed} attempts processed`);
  } catch (error) {
    console.error("[cron] Dunning error:", error.message);
  }
}

// Run first dunning check 1 minute after startup, then hourly
setTimeout(() => {
  runDunningCron();
  setInterval(runDunningCron, DUNNING_INTERVAL);
}, 60_000);
