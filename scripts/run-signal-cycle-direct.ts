import { loadWorkspaceEnv } from "./load-workspace-env";

loadWorkspaceEnv();

(async () => {
  const { runDashboardSignalCycle } = await import(
    "../packages/api/src/modules/dashboard/lib/run-signal-cycle.ts"
  );
  const result = await runDashboardSignalCycle();

  console.log(JSON.stringify(result, null, 2));
})();
