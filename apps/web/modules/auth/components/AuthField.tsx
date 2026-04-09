import type { InputHTMLAttributes, ReactElement } from "react";

import { cn } from "@/lib/cn";

import { authInputClassName } from "../lib/styles";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  hint?: string;
  label: string;
}

export function AuthField({
  className,
  hint,
  label,
  ...inputProps
}: AuthFieldProps): ReactElement {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </span>
      <input {...inputProps} className={cn(authInputClassName, className)} />
      {hint ? (
        <span className="text-xs text-[color:var(--color-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
