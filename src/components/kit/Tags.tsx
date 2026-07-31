import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/domain";
import { TIER_LABEL } from "@/lib/scoring";
import type { Priority, ProspectStatus, Tier } from "@/lib/types";

const STATUS_TONE: Record<ProspectStatus, string> = {
  researching: "text-muted-foreground",
  audit_ready: "text-foreground",
  video_pending: "text-muted-foreground",
  outreach_sent: "text-muted-foreground",
  follow_up: "text-warning",
  call_booked: "text-info",
  proposal: "text-info",
  closed_won: "text-success",
  closed_lost: "text-subtle",
};

export function StatusPill({ status, className }: { status: ProspectStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-surface-raised px-2 py-[3px] text-[11px] font-medium whitespace-nowrap",
        STATUS_TONE[status],
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_TONE: Record<Priority, string> = {
  low: "text-subtle",
  medium: "text-muted-foreground",
  high: "text-foreground",
  critical: "text-destructive",
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span className={cn("text-[11px] font-medium tracking-tight", PRIORITY_TONE[priority])}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function SignalTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-[6px] border border-border px-2 py-[3px] text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

const TIER_TONE: Record<Tier, string> = {
  A: "border-foreground text-foreground",
  B: "border-border-strong text-muted-foreground",
  C: "border-border text-muted-foreground",
  D: "border-border text-subtle",
};

export function TierTag({ tier, score, className }: { tier: Tier; score?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-[3px] text-[11px] font-medium whitespace-nowrap",
        TIER_TONE[tier],
        className,
      )}
    >
      {TIER_LABEL[tier]}
      {typeof score === "number" ? (
        <span className="tabular-nums opacity-70">{score}</span>
      ) : null}
    </span>
  );
}
