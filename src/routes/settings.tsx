import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Database, Keyboard, RotateCcw } from "lucide-react";
import { PageHeader, Panel, PanelHeader } from "@/components/kit/Panel";
import { FieldRow } from "@/components/kit/Editable";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Luuno Growth Engine" },
      {
        name: "description",
        content:
          "Operator profile, keyboard shortcuts, data persistence and backend readiness for the Luuno Growth Engine.",
      },
      { property: "og:title", content: "Settings · Luuno Growth Engine" },
      {
        property: "og:description",
        content: "Operator profile, shortcuts and data layer configuration.",
      },
    ],
  }),
  component: SettingsPage,
});

const SHORTCUTS: [string, string][] = [
  ["⌘ K", "Command palette"],
  ["⌘ J", "Quick create prospect"],
  ["G then D", "Dashboard"],
  ["G then P", "Prospects"],
  ["G then A", "Audit Builder"],
  ["G then C", "Content Pipeline"],
  ["G then N", "Analytics"],
];

function SettingsPage() {
  const { prospects, activity, reset } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow="System"
        title="Profile & Settings"
        description="Operator configuration for this instance of the growth engine."
      />

      <Panel>
        <PanelHeader title="Operator" />
        <div className="px-5 py-2">
          <FieldRow label="Workspace">
            <span className="text-[13px]">Luuno Growth Engine</span>
          </FieldRow>
          <FieldRow label="Operator">
            <span className="text-[13px]">Internal — Luuno</span>
          </FieldRow>
          <FieldRow label="Records">
            <span className="text-[13px] tabular-nums">
              {prospects.length} prospects · {activity.length} activity entries
            </span>
          </FieldRow>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Keyboard"
          description="The engine is designed to be driven without a mouse."
          action={<Keyboard className="h-4 w-4 text-subtle" />}
        />
        <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={keys} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-surface px-5 py-3.5">
              <span className="truncate text-[13px] text-muted-foreground">{label}</span>
              <kbd className="shrink-0 rounded-[6px] border border-border px-2 py-1 font-mono text-[11px] text-subtle">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader
          title="Data Layer"
          description="State persists locally today. Every mutation is a single-entity operation keyed by prospect id, so it maps directly onto backend tables when Cloud is enabled."
          action={<Database className="h-4 w-4 text-subtle" />}
        />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
          <p className="text-[12px] text-subtle">
            Resetting restores the seeded register and clears all local edits.
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
              toast.success("Workspace reset to seed data");
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset workspace
          </button>
        </div>
      </Panel>
    </motion.div>
  );
}
