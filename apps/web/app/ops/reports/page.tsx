"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileWarning, RotateCcw } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { getIncidentGraph, getOperatorAccessToken, listIncidents } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Graph = Awaited<ReturnType<typeof getIncidentGraph>>;
type State = "loading" | "live" | "auth" | "error";

export default function ReportsPage() {
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

  const reportNodes = graph?.nodes.filter(node => node.category === "REPORT") ?? [];

  return (
    <OpsShell active="reports">
      <main className="ops-content">
        <header className="incident-header">
          <div><small className="section-kicker">{t("reports")}</small><h2>{t("reportsViewTitle")}</h2><p>{t("reportsViewBody")}</p></div>
          <FileWarning size={24}/>
        </header>

        <div className="investigating" role="status"><span/>
          {state === "loading" && t("nocLoading")}
          {state === "live" && t("liveData")}
          {state === "auth" && <><a href="/auth/login">{t("signIn")}</a> — {t("authenticationRequired")}</>}
          {state === "error" && <>{t("nocUnavailable")} <button className="text-action" onClick={() => void load()}><RotateCcw size={14}/>{t("refresh")}</button></>}
        </div>

        <section className="panel incidents-panel">
          <div className="panel-head">
            <div><small className="section-kicker">{t("currentIncident")}</small><h3>{incidentNumber}</h3></div>
            <Link className="btn secondary" href={`/ops/incidents/${encodeURIComponent(incidentNumber)}`}>{t("incidents")}</Link>
          </div>
          <div className="incident-list">
            {reportNodes.length ? reportNodes.map(node => (
              <div className="incident-row" key={node.id}>
                <span className="severity-bar minor"/>
                <div className="incident-id">
                  <div><strong>{node.label}</strong><span>{t("reportNode")}</span></div>
                  <small className="mono">{node.id}</small>
                </div>
                <div className="incident-stat"><strong>{node.status ?? "—"}</strong><small>{t("status")}</small></div>
              </div>
            )) : <div className="voice-state"><FileWarning size={25}/><strong>{t("noBackendData")}</strong></div>}
          </div>
        </section>
      </main>
    </OpsShell>
  );
}
