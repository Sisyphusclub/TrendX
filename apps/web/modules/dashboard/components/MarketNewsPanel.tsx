import type { DashboardMarketNews, MarketNewsItem } from "@trendx/api";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

interface MarketNewsPanelProps {
  isLoading: boolean;
  marketNews: DashboardMarketNews | null;
}

const hiddenNewsSources = new Set(["TrendX Seed"]);

function formatNewsTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function buildNewsItems(
  marketNews: DashboardMarketNews | null,
): Array<MarketNewsItem> {
  if (!marketNews) {
    return [];
  }

  return [...marketNews.headlines, ...marketNews.flashes]
    .filter((item) => !hiddenNewsSources.has(item.source))
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    );
}

function renderLoadingRows(): ReactElement {
  const skeletonRowKeys = [
    "news-skeleton-1",
    "news-skeleton-2",
    "news-skeleton-3",
    "news-skeleton-4",
    "news-skeleton-5",
    "news-skeleton-6",
  ] as const;

  return (
    <div className="overflow-hidden rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      {skeletonRowKeys.map((rowKey) => (
        <div
          key={rowKey}
          className="border-b border-[color:var(--color-line)] px-4 py-4 last:border-b-0"
        >
          <div className="h-3 w-28 rounded-full bg-[color:var(--color-canvas-strong)]" />
          <div className="mt-3 h-4 w-4/5 rounded-full bg-[color:var(--color-canvas-strong)]" />
          <div className="mt-2 h-3 w-full rounded-full bg-[color:var(--color-surface-blue)]" />
          <div className="mt-1.5 h-3 w-5/6 rounded-full bg-[color:var(--color-surface-blue)]" />
        </div>
      ))}
    </div>
  );
}

export function MarketNewsPanel({
  isLoading,
  marketNews,
}: MarketNewsPanelProps): ReactElement {
  const newsItems = buildNewsItems(marketNews);

  return (
    <Panel className="h-full">
      {isLoading && !newsItems.length ? (
        renderLoadingRows()
      ) : newsItems.length ? (
        <div className="overflow-hidden rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          {newsItems.map((item) => (
            <article
              key={`${item.category}-${item.id}`}
              className="border-b border-[color:var(--color-line)] px-4 py-4 transition duration-200 ease-out hover:bg-[color:var(--color-surface-soft)] last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[color:var(--color-ink)]">
                  {item.source}
                </span>
                <span className="text-[11px] text-[color:var(--color-muted)]">
                  {formatNewsTime(item.publishedAt)}
                </span>
                {item.isImportant ? (
                  <span className="rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-bull)]">
                    重点
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[14px] font-semibold leading-6 text-[color:var(--color-ink)]">
                {item.title}
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-[color:var(--color-ink-soft)]">
                {item.summary}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-6 text-sm text-[color:var(--color-muted)]">
          暂无新闻
        </div>
      )}
    </Panel>
  );
}
