import { createServerApiClient } from "@trendx/api";
import type { ReactElement } from "react";

import { DashboardClient } from "@/modules/dashboard/components";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<ReactElement> {
  const apiClient = createServerApiClient();
  const initialData = await apiClient.dashboard.getOverview({});

  return <DashboardClient initialData={initialData} />;
}
