"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardPair, GetDashboardOverviewOutput } from "@trendx/api";
import { ChartNoAxesCombined } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";

import { orpc } from "@/lib/orpc";
import { getDashboardFeedState, getPairFeedMode } from "../lib/feed-state";
import {
  type DashboardSection,
  dashboardSectionMeta,
} from "../lib/view-config";
import { AccountRiskPanel } from "./AccountRiskPanel";
import { DeskNavigationRail } from "./DeskNavigationRail";
import { ExecutionControlPanel } from "./ExecutionControlPanel";
import { ExecutionLogPanel } from "./ExecutionLogPanel";
import { OverviewDashboard } from "./OverviewDashboard";
import { PairSignalCard } from "./PairSignalCard";
import { SignalTimelinePanel } from "./SignalTimelinePanel";
import { WatchlistPanel } from "./WatchlistPanel";

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
  const feedState = getDashboardFeedState(data.reason);
  const firstPair = overview.pairs.at(0);

  if (!firstPair) {
    throw new Error("TrendX dashboard requires at least one tracked pair.");
  }

  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");
  const [activeSignalSymbol, setActiveSignalSymbol] = useState<
    DashboardPair["symbol"]
  >(firstPair.symbol);

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
      return (
        <ExecutionControlPanel
          overview={overview}
          isReferenceOnly={feedState.hasReferenceRisk}
          onNavigate={setActiveSection}
        />
      );
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
                    ? "rounded-full border border-[color:var(--color-blue)]/18 bg-[color:var(--color-blue-fog)] px-4 py-2 text-sm font-semibold text-[color:var(--color-blue)]"
                    : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:border-[color:var(--color-line-strong)]"
                }
              >
                {pair.symbol}
              </button>
            ))}
          </div>

          <section className="grid gap-4 2xl:grid-cols-[1.34fr_0.86fr]">
            <PairSignalCard
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
        <section className="grid gap-4 2xl:grid-cols-[1.02fr_0.98fr] 2xl:items-start">
          <AccountRiskPanel
            accountRisk={overview.accountRisk}
            generatedAt={overview.generatedAt}
            isReferenceOnly={feedState.hasReferenceRisk}
            killSwitchEnabled={overview.killSwitchEnabled}
          />
          <WatchlistPanel overview={overview} feedState={feedState} />
        </section>
      );
    }

    return (
      <ExecutionLogPanel
        overview={overview}
        isReferenceOnly={feedState.hasReferenceRisk}
      />
    );
  }

  return (
    <main className="mx-auto h-screen w-full max-w-[1580px] overflow-hidden px-3 py-3 md:px-4 md:py-4 xl:px-5">
      <div className="grid h-full gap-4 xl:grid-cols-[216px_minmax(0,1fr)]">
        <DeskNavigationRail
          activeSection={activeSection}
          activeSignalSymbol={activeSignalSymbol}
          overview={overview}
          feedState={feedState}
          onSectionChange={setActiveSection}
          onSignalPairSelect={handleSignalPairSelect}
        />

        {activeSection === "overview" ? (
          <div className="min-h-0 overflow-y-auto">{renderSection()}</div>
        ) : (
          <div className="grid min-h-0 content-start grid-rows-[auto_minmax(0,1fr)] gap-3">
            <section className="panel-shell self-start rounded-[22px] px-4 py-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-blue)]">
                    <ChartNoAxesCombined className="size-4" />
                  </span>
                  <div className="max-w-3xl">
                    <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                      {sectionMeta.eyebrow}
                    </p>
                    <h2 className="mt-1 text-[1.35rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                      {sectionMeta.title}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[color:var(--color-muted)]">
                      {sectionMeta.description}
                    </p>
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
                  <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
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
