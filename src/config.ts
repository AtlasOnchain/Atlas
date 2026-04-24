import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const TEST_ENV = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  HELIUS_API_KEY: z.string().min(1),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  SCAN_INTERVAL_MS: z.coerce.number().default(60_000),
  MIN_TRANSFER_SOL: z.coerce.number().default(100),
  MAX_TXS_PER_WALLET: z.coerce.number().default(10),
  ALERT_MIN_CONFIDENCE: z.coerce.number().default(0.7),
  MIN_PROPAGATION_LAG_SECONDS: z.coerce.number().default(15),
  MAX_PROPAGATION_LAG_SECONDS: z.coerce.number().default(300),
  COPY_SATURATION_THRESHOLD: z.coerce.number().default(0.55),
  SEED_WALLETS: z.string().default(""),
});

const env = TEST_ENV
  ? {
      ANTHROPIC_API_KEY: "test-anthropic-key",
      HELIUS_API_KEY: "test-helius-key",
      ...process.env,
    }
  : process.env;

const parsed = schema.safeParse(env);
if (!parsed.success) {
  console.error("Config error:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const HELIUS_BASE = "https://api.helius.xyz/v0";
