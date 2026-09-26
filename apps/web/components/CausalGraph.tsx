"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { IncidentGraphResponse } from "../../../packages/contracts/dist/index.js";
import styles from "./CausalGraph.module.css";

type GraphNode = IncidentGraphResponse["nodes"][number];
type PositionedNode = GraphNode & { x: number; y: number };

const categoryOrder: GraphNode["category"][] = [
  "REPORT",
  "AREA",
  "SERVICE",
  "TELEMETRY_ANOMALY",
  "INFRASTRUCTURE_NODE",
  "HYPOTHESIS",
  "REMEDIATION",
];

const fallbackGraph: IncidentGraphResponse = {
  nodes: [
    { id: "demo-r1", category: "REPORT", label: "37 reports", status: "CORRELATED", metadata: { source: "demo" } },
    { id: "demo-area", category: "AREA", label: "Ottawa Centre", status: "AFFECTED", metadata: { source: "demo" } },
    { id: "demo-service", category: "SERVICE", label: "3 services", status: "DEGRADED", metadata: { source: "demo" } },
    { id: "demo-telemetry", category: "TELEMETRY_ANOMALY", label: "21% loss · 242 ms", status: "CRITICAL", metadata: { source: "demo" } },
    { id: "demo-node17", category: "INFRASTRUCTURE_NODE", label: "NODE-17", status: "CRITICAL", metadata: { source: "demo" } },
    { id: "demo-hypothesis", category: "HYPOTHESIS", label: "Root cause · 94%", status: "PROBABLE", metadata: { source: "demo" } },
    { id: "demo-remediation", category: "REMEDIATION", label: "Safe reroute", status: "AWAITING_APPROVAL", metadata: { source: "demo" } },
  ],
  edges: [
    { id: "e1", source: "demo-r1", target: "demo-service", type: "REPORT_AFFECTS_SERVICE" },
    { id: "e2", source: "demo-r1", target: "demo-area", type: "REPORT_LOCATED_IN_AREA" },
    { id: "e3", source: "demo-service", target: "demo-node17", type: "SERVICE_DEPENDS_ON_NODE" },
    { id: "e4", source: "demo-telemetry", target: "demo-node17", type: "TELEMETRY_OBSERVED_ON_NODE" },
    { id: "e5", source: "demo-node17", target: "demo-hypothesis", type: "EVIDENCE_SUPPORTS_HYPOTHESIS" },
    { id: "e6", source: "demo-remediation", target: "demo-node17", type: "PROPOSAL_TARGETS_NODE" },
  ],
};

export function CausalGraph({
  graph,
  fallbackLabel,
  resetLabel,
  accessibleLabel,
}: {
  graph: IncidentGraphResponse | null;
  fallbackLabel: string;
  resetLabel: string;
  accessibleLabel: string;
}) {
  const source = graph?.nodes.length ? graph : fallbackGraph;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const positions = useMemo(() => layoutNodes(source.nodes), [source.nodes]);
  const byId = useMemo(() => new Map(positions.map(node => [node.id, node])), [positions]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const connectedEdgeIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(source.edges.filter(edge => edge.source === selectedId || edge.target === selectedId).map(edge => edge.id));
  }, [selectedId, source.edges]);

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <small>{graph?.nodes.length ? `${source.nodes.length} nodes · ${source.edges.length} links` : fallbackLabel}</small>
        <button type="button" className={styles.reset} onClick={() => setSelectedId(null)}>
          <RotateCcw size={12}/> {resetLabel}
        </button>
      </div>

      <div className={styles.viewport}>
        <svg className={styles.svg} viewBox="0 0 100 100" role="img" aria-label={accessibleLabel}>
          {source.edges.map(edge => {
            const a = byId.get(edge.source);
            const b = byId.get(edge.target);
            if (!a || !b) return null;
            return (
              <line
                key={edge.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={connectedEdgeIds.has(edge.id) ? styles.edgeActive : styles.edge}
              />
            );
          })}
          {positions.map(node => (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.category}: ${node.label}${node.status ? `, ${node.status}` : ""}`}
              className={[
                styles.node,
                selectedId === node.id ? styles.nodeActive : "",
                node.category === "INFRASTRUCTURE_NODE" && node.status === "CRITICAL" ? styles.nodeRoot : "",
                node.category === "HYPOTHESIS" ? styles.nodeAi : "",
                node.category === "SERVICE" ? styles.nodeService : "",
                node.category === "REPORT" ? styles.nodeReport : "",
              ].filter(Boolean).join(" ")}
              onClick={() => setSelectedId(node.id)}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(node.id);
                }
              }}
            >
              <circle cx={node.x} cy={node.y} r={node.category === "HYPOTHESIS" ? 5.2 : 4.3}/>
              <text className={styles.label} x={node.x + 5.5} y={node.y - 0.5}>{truncate(node.label, 19)}</text>
              <text className={styles.sublabel} x={node.x + 5.5} y={node.y + 4}>{node.category.replaceAll("_", " ")}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className={styles.details} aria-live="polite">
        <div>
          <strong>{selected?.label ?? accessibleLabel}</strong>
          <p>{selected ? `${selected.category.replaceAll("_", " ")}${selected.status ? ` · ${selected.status}` : ""}` : fallbackLabel}</p>
        </div>
        <span className={styles.badge}>{selected ? `${connectedEdgeIds.size} links` : `${source.edges.length} links`}</span>
      </div>

      <details className={styles.fallback}>
        <summary>{accessibleLabel}</summary>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Type</th><th>Label</th><th>Status</th></tr></thead>
            <tbody>
              {source.nodes.map(node => (
                <tr key={node.id}><td>{node.category}</td><td>{node.label}</td><td>{node.status ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function layoutNodes(nodes: IncidentGraphResponse["nodes"]): PositionedNode[] {
  const grouped = new Map<GraphNode["category"], GraphNode[]>();
  for (const category of categoryOrder) grouped.set(category, []);
  for (const node of nodes) (grouped.get(node.category) ?? grouped.set(node.category, []).get(node.category)!).push(node);

  const activeCategories = categoryOrder.filter(category => (grouped.get(category)?.length ?? 0) > 0);
  const xStep = activeCategories.length > 1 ? 80 / (activeCategories.length - 1) : 0;
  const result: PositionedNode[] = [];

  activeCategories.forEach((category, categoryIndex) => {
    const group = grouped.get(category) ?? [];
    const visible = group.slice(0, 9);
    const yStep = visible.length > 1 ? 72 / (visible.length - 1) : 0;
    visible.forEach((node, rowIndex) => {
      result.push({
        ...node,
        x: activeCategories.length === 1 ? 50 : 10 + categoryIndex * xStep,
        y: visible.length === 1 ? 50 : 14 + rowIndex * yStep,
      });
    });
  });
  return result;
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
