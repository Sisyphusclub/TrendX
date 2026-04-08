import type { DashboardPair } from "@trendx/api";

const liveReason = "Coinank live market data loaded for dashboard pairs.";
const referenceRiskReason =
  "Account risk remains reference-only until Binance execution is integrated.";
const missingKeyReason =
  "Coinank API key missing. Serving seeded dashboard overview.";
const seededOverviewReason =
  "Seeded overview ready for PR1 dashboard scaffolding.";
const fallbackReasonPattern =
  /([A-Z]+USDT) is using seeded fallback data after a Coinank fetch failure\./;
const liveRationalePattern =
  /([A-Z]+USDT) shows (bullish|bearish) OI-price alignment with price ([+\-\d.]+%) and open interest ([+\-\d.]+%) over the recent 12h\. (\d+)\/6 live Coinank checks are aligned, and price is (inside|outside) the preferred 1h order block\./;

export function localizeFeedReasonNote(note: string): string {
  if (note === liveReason) {
    return "Coinank 实时行情已载入当前监控交易对。";
  }

  if (note === referenceRiskReason) {
    return "Binance 执行链路接通前，账户风险仍以参考数据展示。";
  }

  if (note === missingKeyReason) {
    return "未检测到 Coinank API Key，当前展示种子仪表盘数据。";
  }

  if (note === seededOverviewReason) {
    return "当前为仪表盘脚手架种子数据。";
  }

  const fallbackMatch = fallbackReasonPattern.exec(note);

  if (fallbackMatch) {
    return `${fallbackMatch[1]} 因 Coinank 拉取失败，当前使用种子回退数据。`;
  }

  return note;
}

export function formatRiskLabel(value: string): string {
  if (value === "No directional edge") {
    return "方向优势不足";
  }

  if (value === "Aligned long continuation") {
    return "顺势做多延续";
  }

  if (value === "Aligned short continuation") {
    return "顺势做空延续";
  }

  if (value === "Low conviction at the zone") {
    return "到区但确认不足";
  }

  if (value === "Trend valid, waiting for zone") {
    return "趋势成立，等待回到区块";
  }

  if (value === "Low conviction, no chase") {
    return "信号偏弱，不追价";
  }

  return value;
}

export function formatChecklistLabel(
  key: DashboardPair["checklist"][number]["key"],
): string {
  if (key === "oi") {
    return "OI 持续扩张";
  }

  if (key === "cvd") {
    return "CVD 与方向一致";
  }

  if (key === "funding") {
    return "资金费率仍可交易";
  }

  if (key === "largeOrders") {
    return "出现大额挂单";
  }

  if (key === "liquidationSweep") {
    return "附近清算扫单已确认";
  }

  return "主动成交支持当前方向";
}

export function formatRationale(
  symbol: DashboardPair["symbol"],
  rationale: string,
): string {
  if (rationale.includes("is not showing the required OI-price expansion")) {
    return `${symbol} 在 1 小时级别尚未出现要求的 OI 与价格共振，TrendX 继续保持空仓等待。`;
  }

  if (
    rationale.includes(
      "is maintaining a bullish OI-price expansion and price is rotating back into the nearest 1h long order block.",
    )
  ) {
    return `${symbol} 正维持看多的 OI 与价格扩张，价格也在回踩最近的 1 小时做多订单块。`;
  }

  if (
    rationale.includes(
      "has not completed enough confirmation checks after revisiting the zone, so the engine stays flat and waits.",
    )
  ) {
    return `${symbol} 回到目标区域后仍未满足足够确认条件，引擎继续空仓等待。`;
  }

  const liveMatch = liveRationalePattern.exec(rationale);

  if (liveMatch) {
    const directionLabel = liveMatch[2] === "bullish" ? "看多" : "看空";
    const locationLabel =
      liveMatch[6] === "inside" ? "已进入" : "仍在外部等待回到";

    return `${liveMatch[1]} 在最近 12 小时出现${directionLabel}的 OI 与价格共振，价格变化 ${liveMatch[3]}，持仓量变化 ${liveMatch[4]}。当前 ${liveMatch[5]}/6 项 Coinank 条件通过，价格${locationLabel}首选的 1 小时订单块。`;
  }

  return rationale;
}
