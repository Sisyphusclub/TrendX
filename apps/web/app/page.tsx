import { createServerApiClient } from "@trendx/api";
import { auth } from "@trendx/api/lib/auth";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { DashboardClient } from "@/modules/dashboard/components";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<ReactElement> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/login" as Route);
  }

  const apiClient = createServerApiClient({
    headers: requestHeaders,
  });
  const initialData = await apiClient.dashboard.getOverview({});

  return <DashboardClient initialData={initialData} />;
}
