import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { z } from "zod";

import { getRequiredDatabaseClient } from "./database";

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().trim().min(1).optional(),
  BETTER_AUTH_URL: z.string().trim().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().trim().url().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

function resolveAuthConfig(): { baseURL: string; secret: string } {
  const env = authEnvSchema.parse(process.env);
  const baseURL =
    env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (env.BETTER_AUTH_SECRET) {
    return {
      baseURL,
      secret: env.BETTER_AUTH_SECRET,
    };
  }

  return {
    baseURL,
    secret: "trendx-local-auth-secret-change-before-production",
  };
}

const authConfig = resolveAuthConfig();

export const auth = betterAuth({
  appName: "TrendX",
  basePath: "/api/auth",
  baseURL: authConfig.baseURL,
  database: drizzleAdapter(getRequiredDatabaseClient(), {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },
  secret: authConfig.secret,
});

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getApiSession(
  headers: Headers,
): Promise<AuthSession | null> {
  return await auth.api.getSession({
    headers,
  });
}
