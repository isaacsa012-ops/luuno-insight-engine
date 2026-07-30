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
import type { OpsNode } from "@/lib/types";
import { cn } from "@/lib/utils";

type OpsNodeData = {
  label: string;
  sublabel?: string;
  variant: "standard" | "layer" | "source";
};

function OpsBlock({ data }: NodeProps) {
  const d = data as OpsNodeData;
  return (
    <div
      className={cn(
        "min-w-[168px] rounded-[10px] border px-3.5 py-2.5 transition-colors duration-300",
        d.variant === "layer"
          ? "border-foreground bg-foreground text-background"
          : d.variant === "source"
            ? "border-border-strong bg-surface-raised"
            : "border-border bg-surface",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <p className="text-[12px] font-medium tracking-tight">{d.label}</p>
      {d.sublabel ? (
        <p
          className={cn(
            "mt-0.5 text-[11px]",
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

function buildCurrent(ops: OpsNode[]): { nodes: Node[]; edges: Edge[] } {
  const sources: Node[] = [
    {
      id: "inbound",
      type: "ops",
      position: { x: 0, y: 140 },
      data: { label: "Inbound Demand", sublabel: "Calls · Forms · Referrals", variant: "source" },
    },
  ];
  const spread = ops.map((op, i) => ({
    id: op.id,
    type: "ops" as const,
    position: { x: 340, y: i * 92 },
    data: { label: op.label, sublabel: op.sublabel, variant: "standard" as const },
  }));
  const edges: Edge[] = spread.map((n) => ({
    ...edgeBase,
    id: `e-inbound-${n.id}`,
    source: "inbound",
    target: n.id,
  }));
  const outcome: Node = {
    id: "outcome",
    type: "ops",
    position: { x: 680, y: 140 },
    data: { label: "Delivered Outcome", sublabel: "Manual coordination", variant: "source" },
  };
  edges.push(
    ...spread.map((n) => ({ ...edgeBase, id: `e-${n.id}-outcome`, source: n.id, target: "outcome" })),
  );
  return { nodes: [...sources, ...spread, outcome], edges };
}

function buildFuture(ops: OpsNode[]): { nodes: Node[]; edges: Edge[] } {
  const inbound: Node = {
    id: "inbound",
    type: "ops",
    position: { x: 0, y: 150 },
    data: { label: "Inbound Demand", sublabel: "Captured · Classified", variant: "source" },
  };
  const layer: Node = {
    id: "luuno",
    type: "ops",
    position: { x: 300, y: 150 },
    data: {
      label: "LUUNO INTELLIGENCE LAYER",
      sublabel: "Capture · Triage · Route · Draft",
      variant: "layer",
    },
  };
  const spread = ops.map((op, i) => ({
    id: op.id,
    type: "ops" as const,
    position: { x: 660, y: i * 92 },
    data: { label: op.label, sublabel: "Fed automatically", variant: "standard" as const },
  }));
  const outcome: Node = {
    id: "outcome",
    type: "ops",
    position: { x: 1000, y: 150 },
    data: { label: "Delivered Outcome", sublabel: "Instrumented · Reported", variant: "source" },
  };
  const edges: Edge[] = [
    { ...edgeBase, id: "e-inbound-luuno", source: "inbound", target: "luuno", style: { strokeWidth: 1.4, stroke: "oklch(0.7316 0 90)" } },
    ...spread.map((n) => ({ ...edgeBase, id: `e-luuno-${n.id}`, source: "luuno", target: n.id })),
    ...spread.map((n) => ({ ...edgeBase, id: `e-${n.id}-outcome`, source: n.id, target: "outcome" })),
  ];
  return { nodes: [inbound, layer, ...spread, outcome], edges };
}

export function OpsDiagram({ ops }: { ops: OpsNode[] }) {
  const [future, setFuture] = useState(false);
  const [visible, setVisible] = useState(true);
  const [graph, setGraph] = useState(() => buildCurrent(ops));

  useEffect(() => {
    setGraph(future ? buildFuture(ops) : buildCurrent(ops));
  }, [ops, future]);

  const toggle = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setFuture((v) => !v);
      setVisible(true);
    }, 220);
  }, []);

  const fitViewOptions = useMemo(() => ({ padding: 0.18 }), []);

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
          minZoom={0.3}
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
              ? "Every inbound signal routes through the intelligence layer before it reaches existing software."
              : "Inbound demand touches every system independently. Coordination is performed by people."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="pointer-events-auto shrink-0 rounded-[8px] border border-border bg-surface px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:border-border-strong"
        >
          {future ? "Return to Current State" : "Simulate Future State"}
        </button>
      </div>
    </div>
  );
}
