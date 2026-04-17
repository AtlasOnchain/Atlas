import { getAllWallets } from "./src/wallets.js";
import { fetchWalletActivity } from "./src/helius.js";
import { runAtlasAgent } from "./src/agent/loop.js";
import { addAlerts } from "./src/tracker.js";
import { printAlertBoard } from "./src/alerts.js";
import { config } from "./src/config.js";
import { log } from "./src/logger.js";

async function scan(): Promise<void> {
  const startedAt = Date.now();
  const wallets = getAllWallets();
  log.info(`Scanning ${wallets.length} wallets...`);

  try {
    const settled = await Promise.allSettled(
      wallets.map((wallet) => fetchWalletActivity(wallet.address, wallet.name, wallet.label))
    );

    const successful = settled
      .filter(
        (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchWalletActivity>>> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);
    const failedCount = settled.length - successful.length;

    log.info(
      `${successful.length}/${wallets.length} wallets fetched into the propagation graph (${failedCount} failed)`,
    );
    if (successful.length === 0) {
      return;
    }

    const alerts = await runAtlasAgent(successful);
    addAlerts(alerts);

    if (alerts.length === 0) {
      log.info("No capital-flow alerts met the threshold this cycle");
      return;
    }

    printAlertBoard(alerts);
  } finally {
    const durationMs = Date.now() - startedAt;
    log.info("Atlas scan complete", { durationMs });

    if (durationMs > config.SCAN_INTERVAL_MS) {
      log.warn("Atlas scan exceeded configured interval", {
        durationMs,
        intervalMs: config.SCAN_INTERVAL_MS,
      });
    }
  }
}

async function main(): Promise<void> {
  log.info("Atlas v0.1.0 - capital flow mapper starting");
  log.info(`Interval: ${config.SCAN_INTERVAL_MS / 1000}s | Min confidence: ${config.ALERT_MIN_CONFIDENCE}`);

  let scanInFlight = false;
  let skippedScans = 0;

  const tick = async () => {
    if (scanInFlight) {
      skippedScans++;
      log.warn("Skipping atlas scan because the previous scan is still running", { skippedScans });
      return;
    }

    scanInFlight = true;
    try {
      await scan();
    } catch (err) {
      log.error("Scan error:", err);
    } finally {
      scanInFlight = false;
    }
  };

  await tick();
  setInterval(() => {
    void tick();
  }, config.SCAN_INTERVAL_MS);
}

main().catch((err) => {
  log.error("Fatal:", err);
  process.exit(1);
});
