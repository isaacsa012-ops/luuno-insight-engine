import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "motion/react";
import { AUDIT_SECTIONS } from "@/lib/domain";
import { sectionScore } from "@/lib/scoring";
import type { Prospect } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Current vs Future operations model — built from the prospect's OWN data.
 *
 * Current state: their real systems (parsed from research), with friction
 * markers generated from the weakest audit sections — so the "before" picture
 * shows THEIR broken handoffs, not generic boxes.
 *
 * Future state: the Luuno layer expands into named interventions, one per
 * weak section, each carrying the audit's actual recommendation. Every
 * prospect's diagram is different because every prospect's findings are.
 */

type OpsNodeData = {
  label: string;
  sublabel?: string;
  variant: "standard" | "layer" | "source" | "friction" | "intervention" | "connected";
};

function firstLine(text: string, max = 64): string {
  const line = text
    .split("\n")
    .map((l) => l.replace(/^[-*\u2022]?\s*\d*[.)]?\s*/, "").trim())
    .find(Boolean);
  if (!line) return "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

function OpsBlock({ data }: NodeProps) {
  const d = data as OpsNodeData;
  return (
    <div
      className={cn(
        "max-w-[230px] min-w-[168px] rounded-[10px] border px-3.5 py-2.5 transition-colors duration-300",
        d.variant === "layer" && "border-foreground bg-foreground text-background",
        d.variant === "intervention" &&
          "border-foreground bg-background shadow-[inset_2px_0_0_0_currentColor]",
        d.variant === "friction" && "border-dashed border-border-strong bg-surface opacity-90",
        d.variant === "source" && "border-border-strong bg-surface-raised",
        d.variant === "connected" && "border-border bg-surface",
        d.variant === "standard" && "border-border bg-surface",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <p
        className={cn(
          "text-[12px] font-medium tracking-tight",
          d.variant === "friction" && "text-muted-foreground",
        )}
      >
        {d.variant === "friction" ? `⚠ ${d.label}` : d.label}
      </p>
      {d.sublabel ? (
        <p
          className={cn(
            "mt-0.5 text-[11px] leading-snug",
            d.variant === "layer" ? "text-background/70" : "text-subtle",
          )}
        >
          {d.sublabel}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { ops: OpsBlock };

const edgeBase = {
  type: "smoothstep" as const,
  animated: false,
  style: { strokeWidth: 1, stroke: "oklch(0.285 0 90)" },
};

/** Weakest assessed audit sections — these drive both views. */
function weakSections(prospect: Prospect) {
  return AUDIT_SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    item: prospect.audit[s.key],
    score: sectionScore(prospect.audit[s.key]),
  }))
    .filter((s) => s.item.observation.trim() && s.item.recommendation.trim())
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

function inboundSublabel(prospect: Prospect): string {
  return firstLine(prospect.research.customerJourney, 42) || "Calls · Forms · Referrals";
}

function buildCurrent(prospect: Prospect): { nodes: Node[]; edges: Edge[] } {
  const ops = prospect.currentOps;
  const weak = weakSections(prospect);

  const inbound: Node = {
    id: "inbound",
    type: "ops",
    position: { x: 0, y: Math.max((ops.length - 1) * 46, 60) },
    data: { label: "Inbound Demand", sublabel: inboundSublabel(prospect), variant: "source" },
  };
  const systems = ops.map((op, i) => ({
    id: op.id,
    type: "ops" as const,
    position: { x: 330, y: i * 92 },
    data: { label: op.label, sublabel: op.sublabel, variant: "standard" as const },
  }));
  // Their actual weak points, straight from the audit, sitting where the
  // handoff breaks: between the systems and the outcome.
  const frictions = weak.map((w, i) => ({
    id: `friction-${w.key}`,
    type: "ops" as const,
    position: { x: 660, y: i * 104 + 20 },
    data: {
      label: w.label,
      sublabel: firstLine(w.item.observation, 74),
      variant: "friction" as const,
    },
  }));
  const outcome: Node = {
    id: "outcome",
    type: "ops",
    position: { x: 990, y: Math.max((frictions.length - 1) * 52, 60) },
    data: { label: "Delivered Outcome", sublabel: "Held together by people", variant: "source" },
  };

  const edges: Edge[] = [
    ...systems.map((n) => ({ ...edgeBase, id: `e-in-${n.id}`, source: "inbound", target: n.id })),
    ...systems.flatMap((n) =>
      frictions.length
        ? frictions.map((f) => ({
            ...edgeBase,
            id: `e-${n.id}-${f.id}`,
            source: n.id,
            target: f.id,
            style: { strokeWidth: 1, stroke: "oklch(0.285 0 90)", strokeDasharray: "4 4" },
          }))
        : [{ ...edgeBase, id: `e-${n.id}-out`, source: n.id, target: "outcome" }],
    ),
    ...frictions.map((f) => ({
      ...edgeBase,
      id: `e-${f.id}-out`,
      source: f.id,
      target: "outcome",
      style: { strokeWidth: 1, stroke: "oklch(0.285 0 90)", strokeDasharray: "4 4" },
    })),
  ];
  return { nodes: [inbound, ...systems, ...frictions, outcome], edges };
}

function buildFuture(prospect: Prospect): { nodes: Node[]; edges: Edge[] } {
  const ops = prospect.currentOps;
  const weak = weakSections(prospect);

  const inbound: Node = {
    id: "inbound",
    type: "ops",
    position: { x: 0, y: Math.max((weak.length - 1) * 60, 60) },
    data: { label: "Inbound Demand", sublabel: "Captured · Classified", variant: "source" },
  };
  const layer: Node = {
    id: "luuno",
    type: "ops",
    position: { x: 300, y: Math.max((weak.length - 1) * 60, 60) },
    data: {
      label: "LUUNO INTELLIGENCE LAYER",
      sublabel: `${weak.length || "Custom"} interventions · installed on top of ${
        ops.length || "existing"
      } systems`,
      variant: "layer",
    },
  };
  // The layer opens up: one named intervention per weak section, each carrying
  // the audit's own recommendation. This is what changes per prospect.
  const interventions = weak.map((w, i) => ({
    id: `fix-${w.key}`,
    type: "ops" as const,
    position: { x: 620, y: i * 118 },
    data: {
      label: w.label,
      sublabel: firstLine(w.item.recommendation, 84),
      variant: "intervention" as const,
    },
  }));
  const systems = ops.map((op, i) => ({
    id: op.id,
    type: "ops" as const,
    position: { x: 980, y: i * 92 },
    data: { label: op.label, sublabel: "Connected · fed automatically", variant: "connected" as const },
  }));
  const outcome: Node = {
    id: "outcome",
    type: "ops",
    position: { x: 1330, y: Math.max((ops.length - 1) * 46, 60) },
    data: { label: "Delivered Outcome", sublabel: "Instrumented · Measured · Reported", variant: "source" },
  };

  const live = { strokeWidth: 1.4, stroke: "oklch(0.7316 0 90)" };
  const edges: Edge[] = [
    { ...edgeBase, id: "e-in-luuno", source: "inbound", target: "luuno", animated: true, style: live },
    ...interventions.map((f) => ({
      ...edgeBase,
      id: `e-luuno-${f.id}`,
      source: "luuno",
      target: f.id,
      animated: true,
      style: live,
    })),
    ...(interventions.length
      ? interventions.flatMap((f) =>
          systems.map((n) => ({
            ...edgeBase,
            id: `e-${f.id}-${n.id}`,
            source: f.id,
            target: n.id,
            animated: true,
          })),
        )
      : systems.map((n) => ({
          ...edgeBase,
          id: `e-luuno-${n.id}`,
          source: "luuno",
          target: n.id,
          animated: true,
        }))),
    ...systems.map((n) => ({ ...edgeBase, id: `e-${n.id}-out`, source: n.id, target: "outcome" })),
  ];
  return { nodes: [inbound, layer, ...interventions, ...systems, outcome], edges };
}

export function OpsDiagram({ prospect }: { prospect: Prospect }) {
  const [future, setFuture] = useState(false);
  const [visible, setVisible] = useState(true);
  const [graph, setGraph] = useState(() => buildCurrent(prospect));

  useEffect(() => {
    setGraph(future ? buildFuture(prospect) : buildCurrent(prospect));
  }, [prospect, future]);

  const toggle = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setFuture((v) => !v);
      setVisible(true);
    }, 220);
  }, []);

  const fitViewOptions = useMemo(() => ({ padding: 0.18 }), []);
  const weakCount = weakSections(prospect).length;

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[10px] border border-border bg-background">
      <motion.div
        key={future ? "future" : "current"}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="h-full w-full"
      >
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={fitViewOptions}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.25}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="oklch(0.235 0 90)" />
          <Controls showInteractive={false} className="!border-border !shadow-none" />
        </ReactFlow>
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-4">
        <div className="min-w-0">
          <p className="label-caps">{future ? "Future State" : "Current State"}</p>
          <p className="mt-1 max-w-md text-[12px] leading-relaxed text-subtle">
            {future
              ? weakCount
                ? `The layer resolves the ${weakCount} weakest findings from this audit — every signal routed, every system fed, nothing replaced.`
                : "Every inbound signal routes through the intelligence layer before it reaches existing software."
              : weakCount
                ? `Their real systems, with the ${weakCount} weakest audit findings shown where the handoffs break.`
                : "Inbound demand touches every system independently. Coordination is performed by people."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="pointer-events-auto shrink-0 rounded-[8px] border border-border bg-surface px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:border-border-strong"
        >
          {future ? "Return to Current State" : "Apply Intelligence Layer"}
        </button>
      </div>
    </div>
  );
}
