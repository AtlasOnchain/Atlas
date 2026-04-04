import type { SmartMoneyAlert } from "./types.js";

const sessionAlerts: SmartMoneyAlert[] = [];

export function addAlerts(alerts: SmartMoneyAlert[]): void {
  sessionAlerts.push(...alerts);
  sessionAlerts.sort((a, b) => b.generatedAt - a.generatedAt);
}

export function getRecentAlerts(limit = 20): SmartMoneyAlert[] {
  return sessionAlerts.slice(0, limit);
}

export function getAlertsByToken(token: string): SmartMoneyAlert[] {
  const t = token.toUpperCase();
  return sessionAlerts.filter((a) => a.tokens.map((x) => x.toUpperCase()).includes(t));
}

export function getStats(): Record<string, number> {
  const byAction: Record<string, number> = {};
  for (const alert of sessionAlerts) {
    byAction[alert.action] = (byAction[alert.action] ?? 0) + 1;
  }
  return byAction;
}
