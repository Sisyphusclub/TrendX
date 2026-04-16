"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardPair, GetDashboardOverviewOutput } from "@trendx/api";
import { ChartNoAxesCombined } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";

import { orpc } from "@/lib/orpc";
import {
  getDashboardFeedState,
  getPairFeedCapturedAt,
  getPairFeedMode,
} from "../lib/feed-state";
import {
  type DashboardSection,
  dashboardSectionMeta,
} from "../lib/view-config";
import { DeskNavigationRail } from "./DeskNavigationRail";
import { ExecutionControlPanel } from "./ExecutionControlPanel";
import { ExecutionLogPanel } from "./ExecutionLogPanel";
import { MarketNewsPanel } from "./MarketNewsPanel";
import { OverviewDashboard } from "./OverviewDashboard";
import { PairSignalCard } from "./PairSignalCard";
import { SignalTimelinePanel } from "./SignalTimelinePanel";

interface DashboardClientProps {
  initialData: GetDashboardOverviewOutput;
}

export function DashboardClient({
  initialData,
}: DashboardClientProps): ReactElement {
  const { data } = useQuery({
    ...orpc.dashboard.getOverview.queryOptions({
      input: {},
    }),
    initialData,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const overview = data.overview;
  const feedState = getDashboardFeedState(data.feed);
  const firstPair = overview.pairs.at(0);

  if (!firstPair) {
    throw new Error("TrendX dashboard requires at least one tracked pair.");
  }

  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");
  const [activeSignalSymbol, setActiveSignalSymbol] = useState<
    DashboardPair["symbol"]
  >(firstPair.symbol);
  const marketNewsQuery = useQuery({
    ...orpc.dashboard.getMarketNews.queryOptions({
      input: {},
    }),
    enabled: activeSection === "risk",
    refetchInterval: activeSection === "risk" ? 120_000 : false,
    staleTime: 60_000,
  });
  const executionHistoryQuery = useQuery({
    ...orpc.dashboard.getExecutionHistory.queryOptions({
      input: {},
    }),
    enabled: activeSection === "journal",
    refetchInterval: activeSection === "journal" ? 60_000 : false,
    staleTime: 30_000,
  });

  const activePair =
    overview.pairs.find((pair) => pair.symbol === activeSignalSymbol) ??
    firstPair;
  const sectionMeta = dashboardSectionMeta[activeSection];
  const liveSignalPairCount =
    overview.pairs.length - feedState.fallbackSymbols.length;
  const lastRefresh = new Date(overview.generatedAt).toLocaleTimeString(
    "zh-CN",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  function handleSignalPairSelect(symbol: DashboardPair["symbol"]): void {
    setActiveSignalSymbol(symbol);
    setActiveSection("signals");
  }

  function renderSection(): ReactElement {
    if (activeSection === "overview") {
      return (
        <OverviewDashboard
          overview={overview}
          feedState={feedState}
          onOpenSignalPair={handleSignalPairSelect}
          onSectionChange={setActiveSection}
        />
      );
    }

    if (activeSection === "controls") {
      return <ExecutionControlPanel />;
    }

    if (activeSection === "signals") {
      return (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {overview.pairs.map((pair) => (
              <button
                key={pair.symbol}
                type="button"
                onClick={() => setActiveSignalSymbol(pair.symbol)}
                className={
                  pair.symbol === activePair.symbol
                    ? "rounded-full border border-[color:var(--color-blue)]/12 bg-[color:var(--color-surface-blue)] px-4 py-2 text-sm font-semibold text-[color:var(--color-blue)]"
                    : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:border-[color:var(--color-line-strong)] hover:bg-[color:var(--color-surface-soft)]"
                }
              >
                {pair.symbol}
              </button>
            ))}
          </div>

          <section className="grid gap-4 2xl:grid-cols-[1.34fr_0.86fr]">
            <PairSignalCard
              accountEquity={overview.accountRisk.equity}
              executionConfig={overview.executionConfig}
              feedCapturedAt={getPairFeedCapturedAt(
                feedState,
                activePair.symbol,
              )}
              pair={activePair}
              feedMode={getPairFeedMode(feedState, activePair.symbol)}
              isReferenceRisk={feedState.hasReferenceRisk}
            />
            <SignalTimelinePanel pair={activePair} />
          </section>
        </div>
      );
    }

    if (activeSection === "risk") {
      return (
        <MarketNewsPanel
          isLoading={marketNewsQuery.isPending && !marketNewsQuery.data}
          marketNews={marketNewsQuery.data?.marketNews ?? null}
        />
      );
    }

    return (
      <ExecutionLogPanel
        executionHistory={executionHistoryQuery.data?.executionHistory ?? null}
        isLoading={
          executionHistoryQuery.isPending && !executionHistoryQuery.data
        }
      />
    );
  }

  return (
    <main className="mx-auto h-screen w-full max-w-[1680px] overflow-hidden px-4 py-4 md:px-5 md:py-5 xl:px-6">
      <div className="grid h-full gap-4 xl:grid-cols-[248px_minmax(0,1fr)]">
        <DeskNavigationRail
          activeSection={activeSection}
          activeSignalSymbol={activeSignalSymbol}
          overview={overview}
          feedState={feedState}
          onSectionChange={setActiveSection}
          onSignalPairSelect={handleSignalPairSelect}
        />

        {activeSection === "overview" ? (
          <div className="min-h-0 overflow-y-auto pr-1">{renderSection()}</div>
        ) : (
          <div className="grid min-h-0 content-start grid-rows-[auto_minmax(0,1fr)] gap-3">
            <section className="panel-shell self-start rounded-[24px] px-4 py-3.5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-blue)] text-[color:var(--color-blue)]">
                    <ChartNoAxesCombined className="size-4" />
                  </span>
                  <div className="max-w-3xl">
                    <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-blue)]">
                      {sectionMeta.eyebrow}
                    </p>
                    <h2 className="mt-1 text-[1.15rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)] md:text-[1.25rem]">
                      {sectionMeta.title}
                    </h2>
                    {sectionMeta.description ? (
                      <p className="mt-0.5 text-[12.5px] text-[color:var(--color-muted)]">
                        {sectionMeta.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-[38rem] xl:justify-end">
                  <span
                    className={
                      feedState.hasLiveSignals
                        ? "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-bull)]"
                        : "rounded-full border border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-wait)]"
                    }
                  >
                    {feedState.hasLiveSignals
                      ? `${liveSignalPairCount}/${overview.pairs.length} 实时`
                      : "信号降级"}
                  </span>
                  <span
                    className={
                      feedState.hasReferenceRisk
                        ? "rounded-full border border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-blue)]"
                        : "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-bull)]"
                    }
                  >
                    {feedState.hasReferenceRisk ? "风控参考" : "风控联动"}
                  </span>
                  <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
                    刷新 {lastRefresh}
                  </span>
                  {overview.killSwitchEnabled ? (
                    <span className="rounded-full border border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-bear)]">
                      总开关已开启
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="min-h-0 overflow-y-auto pr-1">
              {renderSection()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
