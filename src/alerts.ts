import type { SmartMoneyAlert } from "./types.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

const LABEL_COLOR: Record<string, string> = {
  vc: MAGENTA,
  whale: CYAN,
  protocol: YELLOW,
  dex: GREEN,
  cex: "\x1b[34m",
  unknown: DIM,
};

export function printAlert(alert: SmartMoneyAlert): void {
  const color = LABEL_COLOR[alert.walletLabel] ?? DIM;
  const tokens = alert.tokens.join(", ") || "unknown";
  const usd = alert.estimatedUsd > 0 ? ` | ~$${alert.estimatedUsd.toLocaleString()}` : "";
  const addr = `${alert.walletAddress.slice(0, 8)}...${alert.walletAddress.slice(-6)}`;

  console.log(`\n  ${BOLD}${alert.action.toUpperCase()}${RESET} ${color}[${alert.walletLabel}]${RESET} ${alert.walletName}`);
  console.log(`     sector: ${alert.sector} | tokens: ${BOLD}${tokens}${RESET}${usd} | propagation ${alert.propagationScore.toFixed(2)}`);
  console.log(`     ${DIM}${alert.rationale}${RESET}`);
  console.log(`     ${DIM}${addr}${RESET}`);
}

export function printAlertBoard(alerts: SmartMoneyAlert[]): void {
  const bar = "-".repeat(76);
  console.log(`\n${bar}`);
  console.log(`  ${BOLD}ATLAS // CAPITAL FLOW MAP${RESET} (${alerts.length} new edges)`);
  console.log(bar);
  if (alerts.length === 0) {
    console.log(`  ${DIM}no capital propagation events detected${RESET}`);
  } else {
    for (const alert of alerts) printAlert(alert);
  }
  console.log(`\n${bar}\n`);
}
