import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Metric({
  label,
  value,
  hint,
  emphasis = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-6 rounded-[10px] border border-border bg-surface p-5 transition-colors duration-200 hover:border-border-strong",
        className,
      )}
    >
      <p className="label-caps truncate">{label}</p>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-semibold tracking-tight tabular-nums",
            emphasis ? "text-[30px] leading-none" : "text-[26px] leading-none",
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-2 truncate text-[11px] text-subtle">{hint}</p> : null}
      </div>
    </div>
  );
}
