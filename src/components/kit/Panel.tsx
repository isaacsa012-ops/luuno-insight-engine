import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <As className={cn("rounded-[10px] border border-border bg-surface", className)}>{children}</As>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-[13px] font-medium tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-subtle">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-caps", className)}>{children}</p>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 border-b border-border pb-8">
      <div className="min-w-0">
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <h1 className="mt-2 truncate text-[26px] font-semibold leading-tight text-foreground sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] border border-border text-subtle">
          {icon}
        </div>
      ) : null}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-subtle">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-[3px] w-full overflow-hidden rounded-full bg-border", className)}>
      <div
        className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
