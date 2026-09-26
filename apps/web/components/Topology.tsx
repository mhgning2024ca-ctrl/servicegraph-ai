const nodes = [
  { code: "NODE-11", x: 18, y: 24, status: "healthy" },
  { code: "NODE-12", x: 43, y: 18, status: "healthy" },
  { code: "NODE-17", x: 48, y: 56, status: "critical" },
  { code: "NODE-21", x: 76, y: 40, status: "degraded" },
  { code: "NODE-31", x: 27, y: 78, status: "healthy" }
] as const;

const edges = [["NODE-11","NODE-12"],["NODE-12","NODE-17"],["NODE-12","NODE-21"],["NODE-17","NODE-21"],["NODE-17","NODE-31"]] as const;

export function Topology({ compact = false }: { compact?: boolean }) {
  const byCode = Object.fromEntries(nodes.map(n => [n.code, n]));
  return (
    <div className={compact ? "topology compact" : "topology"}>
      <svg viewBox="0 0 100 100" role="img" aria-label="ServiceGraph demo network topology">
        {edges.map(([a,b]) => <line key={a+b} x1={byCode[a].x} y1={byCode[a].y} x2={byCode[b].x} y2={byCode[b].y} className="topology-edge"/>)}
        {nodes.map(node => (
          <g key={node.code} className={"topology-node " + node.status}>
            <circle cx={node.x} cy={node.y} r={node.code === "NODE-17" ? 5.3 : 4.2}/>
            <text x={node.x + 5.5} y={node.y + 1.5}>{node.code}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
