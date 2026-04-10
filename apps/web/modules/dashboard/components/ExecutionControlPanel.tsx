import type { ReactElement } from "react";

import { AccountSecurityPanel } from "./AccountSecurityPanel";

export function ExecutionControlPanel(): ReactElement {
  return (
    <div className="max-w-[720px]">
      <div className="grid gap-4">
        <AccountSecurityPanel />
      </div>
    </div>
  );
}
