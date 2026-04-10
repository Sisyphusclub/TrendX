import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const envFilePath = path.join(projectRoot, ".env");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");

        if (separatorIndex === -1) {
          return [line, ""];
        }

        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}

const envFile = parseEnvFile(envFilePath);
const baseUrl =
  process.env.TRENDX_SIGNAL_CYCLE_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  envFile.TRENDX_SIGNAL_CYCLE_BASE_URL ||
  envFile.NEXT_PUBLIC_APP_URL ||
  envFile.BETTER_AUTH_URL ||
  "http://127.0.0.1:3000";
const secret =
  process.env.TRENDX_SIGNAL_CYCLE_SECRET ||
  envFile.TRENDX_SIGNAL_CYCLE_SECRET ||
  "";

if (!secret) {
  console.error("TRENDX_SIGNAL_CYCLE_SECRET is missing.");
  process.exit(1);
}

const response = await fetch(new URL("/api/internal/signal-cycle", baseUrl), {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
  },
});
const payload = await response.json().catch(() => null);

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        baseUrl,
        payload,
        status: response.status,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      baseUrl,
      ...payload,
    },
    null,
    2,
  ),
);
