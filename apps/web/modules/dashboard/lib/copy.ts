import type { DashboardPair } from "@trendx/api";

const liveReason = "Coinank live market data loaded for dashboard pairs.";
const coinankUnavailableReason =
  "Coinank market data is unavailable. Serving seeded dashboard overview.";
const okxPublicLiveReason =
  "OKX public market data loaded for dashboard pairs.";
const okxPublicDatabaseFallbackReason =
  "Local database market snapshots are serving as fallback after OKX public fetch failures.";
const okxPublicUnavailableReason =
  "OKX public market data is unavailable. Serving seeded dashboard overview.";
const binancePublicLiveReason =
  "Binance public market data loaded for dashboard pairs.";
const binancePublicDatabaseFallbackReason =
  "Local database market snapshots are serving as fallback after Binance public fetch failures.";
const binancePublicUnavailableReason =
  "Binance public market data is unavailable. Serving seeded dashboard overview.";
const coinankDatabaseMissingKeyFallbackReason =
  "Local database market snapshots are serving as fallback because Coinank is not configured.";
const coinankDatabaseFallbackReason =
  "Local database market snapshots are serving as fallback after Coinank fetch failures.";
const localDatabaseLiveReason =
  "Local database market snapshots loaded for dashboard pairs.";
const localDatabaseEmptyReason =
  "Local database market snapshots are not ready yet. Serving seeded dashboard overview.";
const localDatabaseMissingReason =
  "DATABASE_URL is missing; local database market snapshots are unavailable. Serving seeded dashboard overview.";
const localDatabaseStaleReason =
  "Local database market snapshots are stale. Serving seeded dashboard overview.";
const binanceLiveRiskReason = "Binance USD-M Futures live account risk synced.";
const binanceTestnetRiskReason =
  "Binance USD-M Futures testnet account risk synced.";
const binanceFallbackRiskReason =
  "Binance account sync failed; account risk remains reference-only.";
const referenceRiskReason =
  "Account risk remains reference-only until Binance execution is integrated.";
const missingKeyReason =
  "Coinank API key missing. Serving seeded dashboard overview.";
const seededOverviewReason =
  "Seeded overview ready for PR1 dashboard scaffolding.";
const fallbackReasonPattern =
  /([A-Z]+USDT) is using seeded fallback data after a Coinank fetch failure\./;
const binancePublicFallbackPattern =
  /([A-Z]+USDT) is using seeded fallback data after a Binance public fetch failure\./;
const okxPublicFallbackPattern =
  /([A-Z]+USDT) is using seeded fallback data after a OKX public fetch failure\./;
const coinankDatabaseFallbackPattern =
  /([A-Z]+USDT) is using local database fallback data after a Coinank fetch failure\./;
const okxPublicDatabaseFallbackPattern =
  /([A-Z]+USDT) is using local database fallback data after a OKX public fetch failure\./;
const binancePublicDatabaseFallbackPattern =
  /([A-Z]+USDT) is using local database fallback data after a Binance public fetch failure\./;
const localDatabaseFallbackPattern =
  /([A-Z]+USDT) has no persisted local market snapshot yet\. Serving seeded fallback data\./;
const localDatabaseStaleFallbackPattern =
  /([A-Z]+USDT) local market snapshot is stale\. Serving seeded fallback data\./;
const liveRationalePattern =
  /([A-Z]+USDT) shows (bullish|bearish) OI-price alignment with price ([+\-\d.]+%) and open interest ([+\-\d.]+%) over the recent 12h\. (\d+)\/6 signal checks are aligned, and price is (inside|outside) the preferred 1h order block\./;
const refinedLiveRationalePattern =
  /([A-Z]+USDT) shows (bullish|bearish) OI-price alignment with price ([+\-\d.]+%) and open interest ([+\-\d.]+%) over the recent 12h\. (\d+)\/6 signal checks are aligned\. (A confirmed 1h (bullish|bearish) order block was anchored to the last (down|up) candle before a BOS close through ([\d.]+)\. The block is (fresh|already mitigated)\.|No structure-confirmed 1h order block was found, so the current zone remains reference-only\.)( The execution zone was refined on ([\d]+m)\.)? Price is (inside|outside) the tracked zone\./;

export function localizeFeedReasonNote(note: string): string {
  if (note === liveReason) {
    return "Coinank 实时行情已载入当前监控交易对。";
  }

  if (note === coinankUnavailableReason) {
    return "Coinank 行情当前不可用，已回退为种子仪表盘数据。";
  }

  if (note === okxPublicLiveReason) {
    return "OKX 公共行情已载入当前监控交易对。";
  }

  if (note === okxPublicUnavailableReason) {
    return "OKX 公共行情当前不可用，已回退为种子仪表盘数据。";
  }

  if (note === okxPublicDatabaseFallbackReason) {
    return "OKX 公共行情拉取失败时，当前已改用本地数据库快照回退。";
  }

  if (note === binancePublicLiveReason) {
    return "Binance 公共行情已载入当前监控交易对。";
  }

  if (note === binancePublicUnavailableReason) {
    return "Binance 公共行情当前不可用，已回退为种子仪表盘数据。";
  }

  if (note === binancePublicDatabaseFallbackReason) {
    return "Binance 公共行情拉取失败时，当前已改用本地数据库快照回退。";
  }

  if (note === coinankDatabaseMissingKeyFallbackReason) {
    return "未配置 Coinank 时，当前已改用本地数据库快照回退。";
  }

  if (note === coinankDatabaseFallbackReason) {
    return "Coinank 拉取失败时，当前已改用本地数据库快照回退。";
  }

  if (note === localDatabaseLiveReason) {
    return "本地数据库快照已载入当前监控交易对。";
  }

  if (note === localDatabaseEmptyReason) {
    return "本地数据库快照尚未准备完成，当前展示种子仪表盘数据。";
  }

  if (note === localDatabaseStaleReason) {
    return "本地数据库快照已经过期，当前展示种子仪表盘数据。";
  }

  if (note === localDatabaseMissingReason) {
    return "未检测到 DATABASE_URL，本地数据库快照不可用，当前展示种子仪表盘数据。";
  }

  if (note === binanceTestnetRiskReason) {
    return "Binance U 本位合约测试网账户风险已同步。";
  }

  if (note === binanceLiveRiskReason) {
    return "Binance U 本位合约正式账户风险已同步。";
  }

  if (note === binanceFallbackRiskReason) {
    return "Binance 账户同步失败，当前继续使用参考风控数据。";
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

  const coinankDatabaseFallbackMatch =
    coinankDatabaseFallbackPattern.exec(note);

  if (coinankDatabaseFallbackMatch) {
    return `${coinankDatabaseFallbackMatch[1]} 因 Coinank 拉取失败，当前使用本地数据库快照回退。`;
  }

  const okxPublicDatabaseFallbackMatch =
    okxPublicDatabaseFallbackPattern.exec(note);

  if (okxPublicDatabaseFallbackMatch) {
    return `${okxPublicDatabaseFallbackMatch[1]} 因 OKX 公共行情拉取失败，当前使用本地数据库快照回退。`;
  }

  const binancePublicDatabaseFallbackMatch =
    binancePublicDatabaseFallbackPattern.exec(note);

  if (binancePublicDatabaseFallbackMatch) {
    return `${binancePublicDatabaseFallbackMatch[1]} 因 Binance 公共行情拉取失败，当前使用本地数据库快照回退。`;
  }

  const binancePublicFallbackMatch = binancePublicFallbackPattern.exec(note);

  if (binancePublicFallbackMatch) {
    return `${binancePublicFallbackMatch[1]} 因 Binance 公共行情拉取失败，当前使用种子回退数据。`;
  }

  const okxPublicFallbackMatch = okxPublicFallbackPattern.exec(note);

  if (okxPublicFallbackMatch) {
    return `${okxPublicFallbackMatch[1]} 因 OKX 公共行情拉取失败，当前使用种子回退数据。`;
  }

  const localDatabaseFallbackMatch = localDatabaseFallbackPattern.exec(note);

  if (localDatabaseFallbackMatch) {
    return `${localDatabaseFallbackMatch[1]} 尚无本地数据库快照，当前使用种子回退数据。`;
  }

  const localDatabaseStaleFallbackMatch =
    localDatabaseStaleFallbackPattern.exec(note);

  if (localDatabaseStaleFallbackMatch) {
    return `${localDatabaseStaleFallbackMatch[1]} 的本地数据库快照已过期，当前使用种子回退数据。`;
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

  if (value === "Trend valid, structure not confirmed") {
    return "趋势成立，结构仍待确认";
  }

  if (value === "Confirmed block already mitigated") {
    return "订单块已被回踩消耗";
  }

  if (value === "Low conviction at confirmed zone") {
    return "到区但确认不足";
  }

  if (value === "Waiting for confirmed zone") {
    return "等待回到执行分段";
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

    return `${liveMatch[1]} 在最近 12 小时出现${directionLabel}的 OI 与价格共振，价格变化 ${liveMatch[3]}，持仓量变化 ${liveMatch[4]}。当前 ${liveMatch[5]}/6 项确认条件通过，价格${locationLabel}首选的 1 小时订单块。`;
  }

  const refinedLiveMatch = refinedLiveRationalePattern.exec(rationale);

  if (refinedLiveMatch) {
    const directionLabel = refinedLiveMatch[2] === "bullish" ? "看多" : "看空";
    const structureLabel = refinedLiveMatch[7]
      ? `已确认 1 小时${refinedLiveMatch[7] === "bullish" ? "看多" : "看空"}订单块，BOS 结构位 ${refinedLiveMatch[9]}，当前订单块${refinedLiveMatch[10] === "fresh" ? "仍然新鲜" : "已被回踩消耗"}`
      : "当前还没有确认过的 1 小时订单块";
    const refineLabel = refinedLiveMatch[12]
      ? `，并已用 ${refinedLiveMatch[12]} 精修执行区`
      : "";
    const locationLabel =
      refinedLiveMatch[13] === "inside"
        ? "已触发分段区域"
        : "仍在分段区域外等待";

    return `${refinedLiveMatch[1]} 在最近 12 小时出现${directionLabel}的 OI 与价格共振，价格变化 ${refinedLiveMatch[3]}，持仓量变化 ${refinedLiveMatch[4]}。当前 ${refinedLiveMatch[5]}/6 项确认条件通过，${structureLabel}${refineLabel}，价格${locationLabel}。`;
  }

  return rationale;
}
