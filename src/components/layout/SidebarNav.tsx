import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { openLuunoAgent } from "@/components/assistant/LuunoAgent";
import { Sparkles } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/prospects", label: "Prospects", icon: Users, exact: false },
  { to: "/audit", label: "Audit Library", icon: FileText, exact: false },
  { to: "/pipeline", label: "Content Pipeline", icon: ListChecks, exact: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/settings", label: "Profile / Settings", icon: Settings, exact: false },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] transition-colors duration-150",
              active
                ? "bg-surface-raised text-foreground"
                : "text-muted-foreground hover:bg-surface hover:text-foreground",
            )}
          >
            <item.icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          openLuunoAgent();
          onNavigate?.();
        }}
        className="mt-1 flex items-center gap-2.5 rounded-[8px] border border-border px-2.5 py-2 text-left text-[13px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
      >
        <Sparkles className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
        <span className="truncate">Luuno Agent</span>
      </button>
    </nav>
  );
}
