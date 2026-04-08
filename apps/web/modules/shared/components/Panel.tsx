import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PanelProps {
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
}

export function Panel({
  aside,
  children,
  className,
  eyebrow,
  title,
}: PanelProps): ReactElement {
  return (
    <section
      className={cn(
        "panel-shell rounded-[26px] p-4 transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-[1px]",
        className,
      )}
    >
      {(eyebrow || title || aside) && (
        <div className="relative mb-3 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-1.5 max-w-xl text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)] md:text-xl">
                {title}
              </h2>
            ) : null}
          </div>
          {aside ? <div className="relative shrink-0">{aside}</div> : null}
        </div>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
