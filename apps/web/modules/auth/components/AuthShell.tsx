import type { Route } from "next";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  description: string;
  footerHref: Route;
  footerLabel: string;
  footerText: string;
  title: string;
}

const deskRules = ["双交易对监控", "1H 节奏执行", "顺势自动策略"] as const;

export function AuthShell({
  children,
  description,
  footerHref,
  footerLabel,
  footerText,
  title,
}: AuthShellProps): ReactElement {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1.14fr)_432px]">
        <section className="hero-shell relative flex min-h-[360px] flex-col justify-between rounded-[32px] px-6 py-6 sm:px-8 sm:py-8">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-blue)]">
                  TrendX
                </p>
                <h1 className="display mt-3 max-w-2xl text-[clamp(2.2rem,5vw,4.9rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-[color:var(--color-ink)]">
                  {title}
                </h1>
              </div>
              <span className="rounded-full border border-[color:var(--color-line)] bg-white/72 px-3 py-1 text-[11px] font-semibold text-[color:var(--color-blue)]">
                Operator Access
              </span>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[color:var(--color-ink-soft)] sm:text-[15px]">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {deskRules.map((rule) => (
                <span
                  key={rule}
                  className="rounded-full border border-[color:var(--color-line)] bg-white/58 px-3 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]"
                >
                  {rule}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-[color:var(--color-line)] bg-white/62 px-4 py-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-blue)]">
                执行范围
              </p>
              <p className="mt-3 text-base font-semibold tracking-[-0.04em] text-[color:var(--color-ink)] sm:text-lg">
                BTCUSDT / ETHUSDT
              </p>
            </div>
            <div className="rounded-[24px] border border-[color:var(--color-line)] bg-white/62 px-4 py-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-blue)]">
                执行环境
              </p>
              <p className="mt-3 text-base font-semibold tracking-[-0.04em] text-[color:var(--color-ink)] sm:text-lg">
                Binance Futures
              </p>
            </div>
            <div className="rounded-[24px] border border-[color:var(--color-line)] bg-white/62 px-4 py-4">
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-blue)]">
                认证策略
              </p>
              <p className="mt-3 text-base font-semibold tracking-[-0.04em] text-[color:var(--color-ink)] sm:text-lg">
                单操作员访问
              </p>
            </div>
          </div>
        </section>

        <section className="panel-shell flex min-h-[360px] flex-col justify-between rounded-[32px] px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--color-blue)]">
              访问 TrendX
            </p>
            <div className="mt-4">{children}</div>
          </div>

          <p className="mt-6 text-sm text-[color:var(--color-muted)]">
            {footerText}{" "}
            <Link
              className="font-semibold text-[color:var(--color-blue)] transition duration-200 ease-out hover:text-[color:var(--color-blue-soft)]"
              href={footerHref}
            >
              {footerLabel}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
