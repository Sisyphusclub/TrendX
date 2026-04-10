import { z } from "zod";

const defaultOperatorEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  TRENDX_DEFAULT_OPERATOR_EMAIL: z.string().trim().email().optional(),
  TRENDX_DEFAULT_OPERATOR_ENABLED: z.string().trim().optional(),
  TRENDX_DEFAULT_OPERATOR_NAME: z.string().trim().min(1).optional(),
  TRENDX_DEFAULT_OPERATOR_PASSWORD: z.string().min(8).max(128).optional(),
});

export interface DefaultOperatorConfig {
  email: string;
  enabled: boolean;
  name: string;
  password: string;
}

function parseBooleanFlag(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new Error(
    `TRENDX_DEFAULT_OPERATOR_ENABLED must be "true" or "false", received "${value}".`,
  );
}

function readDefaultOperatorEnv() {
  return defaultOperatorEnvSchema.parse(process.env);
}

export function getDefaultOperatorConfig(): DefaultOperatorConfig {
  const env = readDefaultOperatorEnv();

  return {
    email: env.TRENDX_DEFAULT_OPERATOR_EMAIL ?? "operator@trendx.local",
    enabled: parseBooleanFlag(
      env.TRENDX_DEFAULT_OPERATOR_ENABLED,
      env.NODE_ENV !== "production",
    ),
    name: env.TRENDX_DEFAULT_OPERATOR_NAME ?? "TrendX Operator",
    password: env.TRENDX_DEFAULT_OPERATOR_PASSWORD ?? "TrendX@123456",
  };
}

export function getDefaultOperatorLoginPreset(): {
  email: string;
  password: string;
} | null {
  const env = readDefaultOperatorEnv();
  const config = getDefaultOperatorConfig();

  if (env.NODE_ENV === "production" || !config.enabled) {
    return null;
  }

  return {
    email: config.email,
    password: config.password,
  };
}
