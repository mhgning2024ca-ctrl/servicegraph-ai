"use client";

import { useEffect, useState } from "react";
import { Network, RotateCcw, TriangleAlert } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { Topology } from "@/components/Topology";
import { getIncidentGraph, getOperatorAccessToken, listIncidents } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Graph = Awaited<ReturnType<typeof getIncidentGraph>>;
type State = "loading" | "live" | "auth" | "error";

export default function NetworkPage() {
  const { t } = useLocale();
  const [state, setState] = useState<State>("loading");
  const [graph, setGraph] = useState<Graph | null>(null);
  const [incidentNumber, setIncidentNumber] = useState("INC-2048");

  async function load() {
    setState("loading");
    try {
      const token = await getOperatorAccessToken();
      if (!token) { setState("auth"); return; }
      const incidents = await listIncidents(token);
      const active = incidents.items.find(item => !["RESOLVED", "CLOSED"].includes(item.status)) ?? incidents.items[0];
      if (!active) { setGraph(null); setState("live"); return; }
      setIncidentNumber(active.incidentNumber);
      setGraph(await getIncidentGraph(active.id, token));
      setState("live");
    } catch {
      setGraph(null);
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const nodes = graph?.nodes.filter(node => node.category === "INFRASTRUCTURE_NODE") ?? [];

  return (
    <OpsShell active="network">
      <main className="ops-content">
        <header className="incident-header">
          <div><small className="section-kicker">{t("network")}</small><h2>{t("networkViewTitle")}</h2><p>{t("networkViewBody")}</p></div>
          <Network size={24}/>
        </header>

        <div className="investigating" role="status"><span/>
          {state === "loading" && t("nocLoading")}
          {state === "live" && t("liveData")}
          {state === "auth" && <><a href="/auth/login">{t("signIn")}</a> — {t("demoSnapshot")}</>}
          {state === "error" && <>{t("nocUnavailable")} <button className="text-action" onClick={() => void load()}><RotateCcw size={14}/>{t("refresh")}</button></>}
        </div>

        <section className="ops-grid">
          <article className="panel">
            <div className="panel-head"><div><small className="section-kicker">{t("topology")}</small><h3>{t("ottawaServiceMesh")}</h3></div><span className="warn-pill"><TriangleAlert size={14}/>NODE-17</span></div>
            <Topology />
            <div className="telemetry-strip"><span><b>{t("packetLoss")}</b>21%</span><span><b>{t("latency")}</b>242 ms</span><span><b>{t("latest")}</b>12 s</span></div>
            <small className="section-kicker">{t("demoSnapshot")}</small>
          </article>

          <article className="panel incidents-panel">
            <div className="panel-head"><div><small className="section-kicker">{t("backendNodes")}</small><h3>{incidentNumber}</h3></div></div>
            <div className="incident-list">
              {nodes.length ? nodes.map(node => (
                <div className="incident-row" key={node.id}>
                  <span className={"severity-bar "+(node.status === "CRITICAL" ? "critical" : node.status === "DEGRADED" ? "major" : "minor")}/>
                  <div className="incident-id"><div><strong>{node.label}</strong><span>{node.status ?? "—"}</span></div><small className="mono">{node.id}</small></div>
                </div>
              )) : <div className="voice-state"><Network size={25}/><strong>{t("noBackendData")}</strong></div>}
            </div>
          </article>
        </section>
      </main>
    </OpsShell>
  );
}
