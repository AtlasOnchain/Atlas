import { getAllWallets } from "./src/wallets.js";
import { fetchWalletActivity } from "./src/helius.js";
import { runAtlasAgent } from "./src/agent/loop.js";
import { addAlerts } from "./src/tracker.js";
import { printAlertBoard } from "./src/alerts.js";
import { config } from "./src/config.js";
import { log } from "./src/logger.js";

async function scan(): Promise<void> {
  const wallets = getAllWallets();
  log.info(`Scanning ${wallets.length} wallets...`);

  const settled = await Promise.allSettled(wallets.map((wallet) => fetchWalletActivity(wallet.address, wallet.name, wallet.label)));

  const successful = settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchWalletActivity>>> => result.status === "fulfilled")
    .map((result) => result.value);

  log.info(`${successful.length}/${wallets.length} wallets fetched into the propagation graph`);
  if (successful.length === 0) return;

  const alerts = await runAtlasAgent(successful);
  addAlerts(alerts);
  printAlertBoard(alerts);
}

async function main(): Promise<void> {
  log.info("Atlas v0.1.0 - capital flow mapper starting");
  log.info(`Interval: ${config.SCAN_INTERVAL_MS / 1000}s | Min confidence: ${config.ALERT_MIN_CONFIDENCE}`);

  await scan();

  setInterval(() => scan().catch((err) => log.error("Scan error:", err)), config.SCAN_INTERVAL_MS);
}

main().catch((err) => {
  log.error("Fatal:", err);
  process.exit(1);
});
