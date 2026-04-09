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
        "panel-shell rounded-[24px] p-4 transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-[1px] md:p-5",
        className,
      )}
    >
      {(eyebrow || title || aside) && (
        <div className="relative mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-blue)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-1 max-w-xl text-base font-semibold tracking-[-0.04em] text-[color:var(--color-ink)] md:text-lg">
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
