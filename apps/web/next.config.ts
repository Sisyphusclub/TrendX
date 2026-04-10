import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDirectory, "../..");

function loadWorkspaceEnv(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const envFileNames = [
    `.env.${nodeEnv}.local`,
    nodeEnv === "test" ? null : ".env.local",
    `.env.${nodeEnv}`,
    ".env",
  ].filter((fileName): fileName is string => fileName !== null);

  for (const fileName of envFileNames) {
    const envPath = path.join(workspaceRoot, fileName);

    if (!fs.existsSync(envPath)) {
      continue;
    }

    const parsedEnv = parseEnv(fs.readFileSync(envPath, "utf8"));

    for (const [key, value] of Object.entries(parsedEnv)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadWorkspaceEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@trendx/api", "@trendx/database", "@trendx/logs"],
  typedRoutes: true,
};

export default nextConfig;
