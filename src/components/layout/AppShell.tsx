import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Plus, Search, X } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { CommandPalette } from "./CommandPalette";
import { QuickCreateDialog } from "./QuickCreateDialog";
import { cn } from "@/lib/utils";

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-border-strong text-[11px] font-semibold tracking-tight">
        L
      </span>
      <span className="text-[13px] font-medium tracking-tight">Luuno</span>
      <span className="text-[13px] tracking-tight text-subtle">Growth Engine</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCreateOpen(true);
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing || mod || e.altKey) return;
      if (e.key === "g") {
        const next = (ev: KeyboardEvent) => {
          const map: Record<string, string> = {
            d: "/",
            p: "/prospects",
            a: "/audit",
            c: "/pipeline",
            n: "/analytics",
            s: "/settings",
          };
          const to = map[ev.key.toLowerCase()];
          if (to) void navigate({ to });
          window.removeEventListener("keydown", next);
        };
        window.addEventListener("keydown", next, { once: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — persistent on desktop, sheet on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-sidebar transition-transform duration-200 ease-out lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4">
          <div className="min-w-0 truncate">
            <Wordmark />
          </div>
          <button
            type="button"
            onClick={() => setMobileNav(false)}
            className="shrink-0 text-subtle lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="py-4">
          <SidebarNav onNavigate={() => setMobileNav(false)} />
        </div>

        <div className="mt-auto border-t border-border p-3">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex w-full items-center gap-2 rounded-[8px] border border-border px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Plus className="h-[15px] w-[15px]" strokeWidth={1.75} />
            New prospect
            <kbd className="ml-auto font-mono text-[10px] text-subtle">⌘J</kbd>
          </button>
          <div className="mt-3 flex items-center gap-2.5 px-1 py-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">
              LO
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] text-foreground">Luuno Operator</p>
              <p className="truncate text-[11px] text-subtle">Internal · Growth</p>
            </div>
          </div>
        </div>
      </aside>

      {mobileNav ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-background/70 lg:hidden"
        />
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            className="shrink-0 text-muted-foreground lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 min-w-0 max-w-xl items-center gap-2.5 rounded-[8px] border border-border bg-surface px-3 text-left transition-colors hover:border-border-strong"
          >
            <Search className="h-[14px] w-[14px] shrink-0 text-subtle" strokeWidth={1.75} />
            <span className="truncate text-[13px] text-subtle">
              Search prospects, audits, actions
            </span>
            <kbd className="ml-auto hidden shrink-0 font-mono text-[10px] text-subtle sm:block">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-primary px-3 py-[7px] text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">New</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1360px] px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
          {children}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onQuickCreate={() => setCreateOpen(true)}
      />
      <QuickCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
