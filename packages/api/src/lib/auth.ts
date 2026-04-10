import { schema } from "@trendx/database";
import { eq } from "@trendx/database/drizzle/operators";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { z } from "zod";

import { getRequiredDatabaseClient } from "./database";
import { getDefaultOperatorConfig } from "./default-operator";

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().trim().min(1).optional(),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().trim().min(1).optional(),
  BETTER_AUTH_URL: z.string().trim().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().trim().url().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

function addOriginWithLoopbackPair(
  origins: Set<string>,
  value: string,
  nodeEnv: "development" | "production" | "test",
): void {
  const url = new URL(value);
  const origin = url.origin;

  origins.add(origin);

  if (nodeEnv === "production") {
    return;
  }

  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.add(url.origin);
    return;
  }

  if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.add(url.origin);
  }
}

function resolveAuthConfig(): {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
} {
  const env = authEnvSchema.parse(process.env);
  const baseURL =
    env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const trustedOrigins = new Set<string>();

  addOriginWithLoopbackPair(trustedOrigins, baseURL, env.NODE_ENV);

  if (env.NEXT_PUBLIC_APP_URL) {
    addOriginWithLoopbackPair(
      trustedOrigins,
      env.NEXT_PUBLIC_APP_URL,
      env.NODE_ENV,
    );
  }

  if (env.BETTER_AUTH_TRUSTED_ORIGINS) {
    for (const origin of env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")) {
      const trimmedOrigin = origin.trim();

      if (!trimmedOrigin) {
        continue;
      }

      addOriginWithLoopbackPair(trustedOrigins, trimmedOrigin, env.NODE_ENV);
    }
  }

  if (env.BETTER_AUTH_SECRET) {
    return {
      baseURL,
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins: [...trustedOrigins],
    };
  }

  return {
    baseURL,
    secret: "trendx-local-auth-secret-change-before-production",
    trustedOrigins: [...trustedOrigins],
  };
}

const authConfig = resolveAuthConfig();
const defaultOperatorConfig = getDefaultOperatorConfig();
const authDatabaseSchema = {
  account: schema.accounts,
  session: schema.sessions,
  user: schema.users,
  verification: schema.verifications,
};

let defaultOperatorBootstrapPromise: Promise<void> | null = null;
let hasDefaultOperatorAccount = false;

export const auth = betterAuth({
  appName: "TrendX",
  basePath: "/api/auth",
  baseURL: authConfig.baseURL,
  database: drizzleAdapter(getRequiredDatabaseClient(), {
    provider: "pg",
    schema: authDatabaseSchema,
  }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },
  secret: authConfig.secret,
  trustedOrigins: authConfig.trustedOrigins,
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

async function findDefaultOperatorUser(): Promise<{ id: string } | undefined> {
  const database = getRequiredDatabaseClient();
  const normalizedEmail = defaultOperatorConfig.email.toLowerCase();

  return await database.query.users.findFirst({
    columns: {
      id: true,
    },
    where: eq(schema.users.email, normalizedEmail),
  });
}

async function bootstrapDefaultOperatorAccount(): Promise<void> {
  if (hasDefaultOperatorAccount || !defaultOperatorConfig.enabled) {
    return;
  }

  const existingUser = await findDefaultOperatorUser();

  if (existingUser) {
    hasDefaultOperatorAccount = true;
    return;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: defaultOperatorConfig.email.toLowerCase(),
        name: defaultOperatorConfig.name,
        password: defaultOperatorConfig.password,
      },
    });

    hasDefaultOperatorAccount = true;
  } catch (error) {
    const userCreatedDuringRace = await findDefaultOperatorUser();

    if (userCreatedDuringRace) {
      hasDefaultOperatorAccount = true;
      return;
    }

    throw error;
  }
}

export async function ensureDefaultOperatorAccount(): Promise<void> {
  if (hasDefaultOperatorAccount || !defaultOperatorConfig.enabled) {
    return;
  }

  if (!defaultOperatorBootstrapPromise) {
    defaultOperatorBootstrapPromise = bootstrapDefaultOperatorAccount().finally(
      () => {
        defaultOperatorBootstrapPromise = null;
      },
    );
  }

  await defaultOperatorBootstrapPromise;
}
