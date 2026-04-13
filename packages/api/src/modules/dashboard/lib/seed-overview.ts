import { DASHBOARD_EXECUTION_CONFIG } from "../config";
import type { DashboardPair, GetDashboardOverviewOutput } from "../types";

import { getDashboardOverviewOutputSchema } from "../types";

function buildChecklist(matches: Array<boolean>): DashboardPair["checklist"] {
  return [
    {
      key: "oi",
      label: "Open interest still expanding",
      matched: matches[0] ?? false,
    },
    {
      key: "cvd",
      label: "CVD agrees with bias",
      matched: matches[1] ?? false,
    },
    {
      key: "funding",
      label: "Funding remains tradable",
      matched: matches[2] ?? false,
    },
    {
      key: "largeOrders",
      label: "Large resting orders appear",
      matched: matches[3] ?? false,
    },
    {
      key: "liquidationSweep",
      label: "Nearby liquidation sweep confirmed",
      matched: matches[4] ?? false,
    },
    {
      key: "aggressiveFlow",
      label: "Aggressive flow supports entry",
      matched: matches[5] ?? false,
    },
  ];
}

function buildPair(params: {
  action: DashboardPair["action"];
  confirmationMatches: Array<boolean>;
  currentPnl: number;
  entryStages: DashboardPair["entryStages"];
  executionStatus: DashboardPair["executionStatus"];
  fundingRate: number;
  lastPrice: number;
  mainOrderBlock: DashboardPair["mainOrderBlock"];
  mainOrderBlockDirection: DashboardPair["mainOrderBlockDirection"];
  markPrice: number;
  oiDeltaPct: number;
  orderBlock: DashboardPair["orderBlock"];
  previousOppositeOrderBlock: DashboardPair["previousOppositeOrderBlock"];
  previousOppositeOrderBlockDirection: DashboardPair["previousOppositeOrderBlockDirection"];
  rationale: string;
  riskLabel: string;
  side: DashboardPair["currentPosition"]["side"];
  sizeUsd: number;
  stopLoss: number;
  symbol: DashboardPair["symbol"];
  takeProfitOne: number;
  takeProfitTwo: number;
  trendDirection: DashboardPair["trendDirection"];
  cvdBiasPct: number;
}): DashboardPair {
  const confirmationCount = params.confirmationMatches.filter(Boolean).length;

  return {
    action: params.action,
    confirmationCount,
    confirmationThreshold: DASHBOARD_EXECUTION_CONFIG.confirmationThreshold,
    currentPosition: {
      leverage: DASHBOARD_EXECUTION_CONFIG.leverage,
      pnl: params.currentPnl,
      side: params.side,
      sizeUsd: params.sizeUsd,
    },
    cvdBiasPct: params.cvdBiasPct,
    executionStatus: params.executionStatus,
    fundingRate: params.fundingRate,
    lastPrice: params.lastPrice,
    mainOrderBlock: params.mainOrderBlock,
    mainOrderBlockDirection: params.mainOrderBlockDirection,
    markPrice: params.markPrice,
    openInterestDeltaPct: params.oiDeltaPct,
    orderBlock: params.orderBlock,
    previousOppositeOrderBlock: params.previousOppositeOrderBlock,
    previousOppositeOrderBlockDirection:
      params.previousOppositeOrderBlockDirection,
    rationale: params.rationale,
    riskLabel: params.riskLabel,
    stopLoss: params.stopLoss,
    symbol: params.symbol,
    takeProfitOne: params.takeProfitOne,
    takeProfitTwo: params.takeProfitTwo,
    trendDirection: params.trendDirection,
    checklist: buildChecklist(params.confirmationMatches),
    entryStages: params.entryStages,
  };
}

export function buildSeededDashboardPair(
  symbol: DashboardPair["symbol"],
): DashboardPair {
  if (symbol === "BTCUSDT") {
    return buildPair({
      action: "ENTRY",
      confirmationMatches: [true, true, true, false, true, true],
      currentPnl: 482.3,
      cvdBiasPct: 2.8,
      entryStages: [
        {
          allocationPct: 30,
          plannedPrice: 68240,
          status: "TRIGGERED",
          zone: "upper",
        },
        { allocationPct: 40, plannedPrice: 67980, status: "NEXT", zone: "mid" },
        {
          allocationPct: 30,
          plannedPrice: 67730,
          status: "WAITING",
          zone: "lower",
        },
      ],
      executionStatus: "ARMED",
      fundingRate: 0.012,
      lastPrice: 68412,
      mainOrderBlock: {
        high: 68240,
        low: 67730,
        mid: 67980,
      },
      mainOrderBlockDirection: "BULLISH",
      markPrice: 68437,
      oiDeltaPct: 5.7,
      orderBlock: {
        high: 68240,
        low: 67730,
        mid: 67980,
      },
      previousOppositeOrderBlock: {
        high: 69160,
        low: 68620,
        mid: 68890,
      },
      previousOppositeOrderBlockDirection: "BEARISH",
      rationale:
        "BTC is maintaining a bullish OI-price expansion and price is rotating back into the nearest 1h long order block.",
      riskLabel: "Aligned long continuation",
      side: "LONG",
      sizeUsd: 6240,
      stopLoss: 67490,
      symbol: "BTCUSDT",
      takeProfitOne: 69120,
      takeProfitTwo: 69880,
      trendDirection: "BULLISH",
    });
  }

  return buildPair({
    action: "WAIT",
    confirmationMatches: [true, false, true, false, false, true],
    currentPnl: -41.6,
    cvdBiasPct: -0.8,
    entryStages: [
      {
        allocationPct: 30,
        plannedPrice: 3524,
        status: "LOCKED",
        zone: "upper",
      },
      { allocationPct: 40, plannedPrice: 3496, status: "LOCKED", zone: "mid" },
      {
        allocationPct: 30,
        plannedPrice: 3472,
        status: "LOCKED",
        zone: "lower",
      },
    ],
    executionStatus: "PENDING",
    fundingRate: 0.021,
    lastPrice: 3558,
    mainOrderBlock: {
      high: 3524,
      low: 3472,
      mid: 3496,
    },
    mainOrderBlockDirection: "BULLISH",
    markPrice: 3552,
    oiDeltaPct: -1.4,
    orderBlock: {
      high: 3524,
      low: 3472,
      mid: 3496,
    },
    previousOppositeOrderBlock: {
      high: 3628,
      low: 3568,
      mid: 3598,
    },
    previousOppositeOrderBlockDirection: "BEARISH",
    rationale:
      "ETH has not completed enough confirmation checks after revisiting the zone, so the engine stays flat and waits.",
    riskLabel: "Low conviction, no chase",
    side: "FLAT",
    sizeUsd: 0,
    stopLoss: 3450,
    symbol: "ETHUSDT",
    takeProfitOne: 3620,
    takeProfitTwo: 3698,
    trendDirection: "BULLISH",
  });
}

export function buildSeededDashboardOverview(
  reason = "Seeded overview ready for PR1 dashboard scaffolding.",
): GetDashboardOverviewOutput {
  return getDashboardOverviewOutputSchema.parse({
    feed: {
      accountRiskMode: "reference",
      accountRiskSource: "reference",
      marketDataMode: "fallback",
      marketDataSource: "seeded",
      notes: [reason],
      pairs: [
        {
          capturedAt: null,
          mode: "fallback",
          note: reason,
          source: "seeded",
          symbol: "BTCUSDT",
        },
        {
          capturedAt: null,
          mode: "fallback",
          note: reason,
          source: "seeded",
          symbol: "ETHUSDT",
        },
      ],
    },
    overview: {
      accountRisk: {
        availableMargin: 78320,
        dailyPnl: 440.7,
        equity: 102450,
        exposurePct: 19.6,
        openPositionCount: 1,
        usedMargin: 20130,
      },
      cadenceMinutes: 60,
      executionConfig: DASHBOARD_EXECUTION_CONFIG,
      generatedAt: new Date().toISOString(),
      killSwitchEnabled: false,
      operatorMode: "AUTOMATED",
      pairs: [
        buildSeededDashboardPair("BTCUSDT"),
        buildSeededDashboardPair("ETHUSDT"),
      ],
    },
    reason,
    success: true,
  });
}
