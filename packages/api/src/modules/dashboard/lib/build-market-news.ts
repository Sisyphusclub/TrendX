import { logger } from "@trendx/logs";
import { z } from "zod";

import {
  type GetDashboardMarketNewsOutput,
  getDashboardMarketNewsOutputSchema,
  type MarketNewsItem,
} from "../types";
import {
  type CoinankDashboardConfig,
  type CoinankNewsItem,
  fetchCoinankNewsList,
  getCoinankDashboardConfig,
} from "./coinank-client";

const COINANK_NEWS_LANGUAGE = "zh";
const FLASH_LIMIT = 6;
const HEADLINE_LIMIT = 4;
const SUMMARY_MAX_LENGTH = 180;
const LOCAL_NEWS_REASON = "Local seeded market news loaded.";

const marketNewsEnvSchema = z.object({
  TRENDX_MARKET_NEWS_PROVIDER: z.enum(["coinank", "local"]).default("local"),
});

function sanitizeNewsText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function toIsoTimestamp(value: number): string {
  const normalizedValue = value < 1_000_000_000_000 ? value * 1000 : value;

  return new Date(normalizedValue).toISOString();
}

function toMarketNewsItem(
  item: CoinankNewsItem,
  category: MarketNewsItem["category"],
): MarketNewsItem {
  const normalizedTitle = sanitizeNewsText(item.title);
  const normalizedSummary = sanitizeNewsText(item.content);
  const fallbackTitle = item.sourceWeb.trim() || "Coinank";

  return {
    category,
    id: item.id,
    isImportant: item.recommend,
    publishedAt: toIsoTimestamp(item.ts),
    readCount: Math.max(0, Math.round(item.readNum)),
    source: item.sourceWeb.trim() || "Coinank",
    summary: truncateText(
      normalizedSummary || normalizedTitle || `${fallbackTitle} 市场更新`,
      SUMMARY_MAX_LENGTH,
    ),
    title: normalizedTitle || `${fallbackTitle} 市场更新`,
  };
}

function buildSeededMarketNewsItems(
  category: MarketNewsItem["category"],
): MarketNewsItem[] {
  const now = Date.now();

  if (category === "FLASH") {
    return [
      {
        category,
        id: "seed-flash-1",
        isImportant: true,
        publishedAt: new Date(now - 5 * 60 * 1000).toISOString(),
        readCount: 0,
        source: "TrendX Seed",
        summary:
          "实时外部新闻流当前未启用，TrendX 正在展示本地参考快讯并等待下一次同步。",
        title: "实时新闻通道当前未启用",
      },
      {
        category,
        id: "seed-flash-2",
        isImportant: false,
        publishedAt: new Date(now - 18 * 60 * 1000).toISOString(),
        readCount: 0,
        source: "TrendX Seed",
        summary: "BTC 与 ETH 依然是当前监控核心，页面已预留实时新闻位。",
        title: "BTC / ETH 继续作为主监控交易对",
      },
      {
        category,
        id: "seed-flash-3",
        isImportant: false,
        publishedAt: new Date(now - 35 * 60 * 1000).toISOString(),
        readCount: 0,
        source: "TrendX Seed",
        summary: "回退内容只用于占位展示，不参与任何自动执行决策。",
        title: "新闻面板当前处于参考模式",
      },
    ];
  }

  return [
    {
      category,
      id: "seed-headline-1",
      isImportant: true,
      publishedAt: new Date(now - 9 * 60 * 1000).toISOString(),
      readCount: 0,
      source: "TrendX Seed",
      summary:
        "TrendX 当前默认使用本地参考新闻源，后续可按需要切回实时外部新闻接口。",
      title: "TrendX 当前使用本地参考新闻源",
    },
    {
      category,
      id: "seed-headline-2",
      isImportant: false,
      publishedAt: new Date(now - 26 * 60 * 1000).toISOString(),
      readCount: 0,
      source: "TrendX Seed",
      summary: "后续可继续扩展为新闻权重、情绪过滤和策略事件标记。",
      title: "市场新闻区域支持继续扩展事件流",
    },
    {
      category,
      id: "seed-headline-3",
      isImportant: false,
      publishedAt: new Date(now - 43 * 60 * 1000).toISOString(),
      readCount: 0,
      source: "TrendX Seed",
      summary: "当前版本先聚焦真实新闻列表接入，不把新闻信号直接纳入交易决策。",
      title: "新闻只做信息展示，不直接触发交易",
    },
  ];
}

function resolveMode(
  hasLiveFlashes: boolean,
  hasLiveHeadlines: boolean,
): "live" | "mixed" | "fallback" {
  if (hasLiveFlashes && hasLiveHeadlines) {
    return "live";
  }

  if (hasLiveFlashes || hasLiveHeadlines) {
    return "mixed";
  }

  return "fallback";
}

async function fetchMarketNewsSection(
  config: CoinankDashboardConfig,
  category: MarketNewsItem["category"],
): Promise<MarketNewsItem[]> {
  const response = await fetchCoinankNewsList(config, {
    importantOnly: category === "NEWS",
    language: COINANK_NEWS_LANGUAGE,
    pageSize: category === "FLASH" ? FLASH_LIMIT : HEADLINE_LIMIT,
    type: category,
  });

  return response.items.map((item) => toMarketNewsItem(item, category));
}

export async function buildDashboardMarketNews(): Promise<GetDashboardMarketNewsOutput> {
  const marketNewsProvider = marketNewsEnvSchema.parse(
    process.env,
  ).TRENDX_MARKET_NEWS_PROVIDER;
  const config = getCoinankDashboardConfig();
  const fallbackFlashes = buildSeededMarketNewsItems("FLASH");
  const fallbackHeadlines = buildSeededMarketNewsItems("NEWS");

  if (marketNewsProvider === "local") {
    return getDashboardMarketNewsOutputSchema.parse({
      marketNews: {
        flashes: fallbackFlashes,
        generatedAt: new Date().toISOString(),
        headlines: fallbackHeadlines,
        mode: "fallback",
      },
      reason: LOCAL_NEWS_REASON,
      success: true,
    });
  }

  if (!config) {
    logger.warn("Coinank API key missing; serving seeded market news.");

    return getDashboardMarketNewsOutputSchema.parse({
      marketNews: {
        flashes: fallbackFlashes,
        generatedAt: new Date().toISOString(),
        headlines: fallbackHeadlines,
        mode: "fallback",
      },
      reason: "Coinank API key missing. Serving seeded market news.",
      success: true,
    });
  }

  const [flashesResult, headlinesResult] = await Promise.allSettled([
    fetchMarketNewsSection(config, "FLASH"),
    fetchMarketNewsSection(config, "NEWS"),
  ]);

  const liveFlashes =
    flashesResult.status === "fulfilled" ? flashesResult.value : [];
  const liveHeadlines =
    headlinesResult.status === "fulfilled" ? headlinesResult.value : [];
  const reasons: string[] = [];
  const hasLiveFlashes = liveFlashes.length > 0;
  const hasLiveHeadlines = liveHeadlines.length > 0;
  const mode = resolveMode(hasLiveFlashes, hasLiveHeadlines);

  const flashes = hasLiveFlashes ? liveFlashes : fallbackFlashes;
  const headlines = hasLiveHeadlines ? liveHeadlines : fallbackHeadlines;

  if (hasLiveFlashes) {
    reasons.push("Coinank live flashes loaded.");
  } else {
    const flashError =
      flashesResult.status === "rejected"
        ? flashesResult.reason
        : new Error("Coinank returned an empty flash list.");

    logger.warn("Falling back to seeded Coinank flashes", {
      error:
        flashError instanceof Error ? flashError.message : String(flashError),
    });
    reasons.push("Live flash feed unavailable; using seeded flash fallback.");
  }

  if (hasLiveHeadlines) {
    reasons.push("Coinank live headlines loaded.");
  } else {
    const headlineError =
      headlinesResult.status === "rejected"
        ? headlinesResult.reason
        : new Error("Coinank returned an empty headline list.");

    logger.warn("Falling back to seeded Coinank headlines", {
      error:
        headlineError instanceof Error
          ? headlineError.message
          : String(headlineError),
    });
    reasons.push(
      "Live headline feed unavailable; using seeded headline fallback.",
    );
  }

  return getDashboardMarketNewsOutputSchema.parse({
    marketNews: {
      flashes,
      generatedAt: new Date().toISOString(),
      headlines,
      mode,
    },
    reason: reasons.join(" "),
    success: true,
  });
}
