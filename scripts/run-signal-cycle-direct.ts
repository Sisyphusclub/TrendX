import fs from "node:fs";
import path from "node:path";

function loadWorkspaceEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadWorkspaceEnv();

(async () => {
  const { runDashboardSignalCycle } = await import(
    "../packages/api/src/modules/dashboard/lib/run-signal-cycle.ts"
  );
  const result = await runDashboardSignalCycle();

  console.log(JSON.stringify(result, null, 2));
})();
