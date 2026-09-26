"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, RotateCcw } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { getOperatorAccessToken, listIncidents } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Incident = Awaited<ReturnType<typeof listIncidents>>["items"][number];
type State = "loading" | "live" | "auth" | "error";

export default function AnalyticsPage() {
  const { t, locale } = useLocale();
  const [state, setState] = useState<State>("loading");
  const [items, setItems] = useState<Incident[]>([]);

  async function load() {
    setState("loading");
    try {
      const token = await getOperatorAccessToken();
      if (!token) { setItems([]); setState("auth"); return; }
      const response = await listIncidents(token);
      setItems(response.items);
      setState("live");
    } catch {
      setItems([]);
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => {
    const resolved = items.filter(item => ["RESOLVED", "CLOSED"].includes(item.status)).length;
    const unresolved = items.length - resolved;
    const withConfidence = items.filter(item => item.rootCauseConfidence != null);
    const avgConfidence = withConfidence.length
      ? withConfidence.reduce((sum, item) => sum + (item.rootCauseConfidence ?? 0), 0) / withConfidence.length
      : 0;
    const affected = items.reduce((sum, item) => sum + item.affectedUsersEstimate, 0);
    return { resolved, unresolved, avgConfidence, affected };
  }, [items]);

  return (
    <OpsShell active="analytics">
      <main className="ops-content">
        <header className="incident-header">
          <div><small className="section-kicker">{t("analytics")}</small><h2>{t("analyticsViewTitle")}</h2><p>{t("analyticsViewBody")}</p></div>
          <BarChart3 size={24}/>
        </header>

        <div className="investigating" role="status"><span/>
          {state === "loading" && t("nocLoading")}
          {state === "live" && t("liveData")}
          {state === "auth" && <><a href="/auth/login">{t("signIn")}</a> — {t("authenticationRequired")}</>}
          {state === "error" && <>{t("nocUnavailable")} <button className="text-action" onClick={() => void load()}><RotateCcw size={14}/>{t("refresh")}</button></>}
        </div>

        <section className="metric-grid">
          <article><span className="metric-icon"><BarChart3 size={18}/></span><div><small>{t("incidentDistribution")}</small><strong>{items.length}</strong></div><p>{state === "live" ? t("liveData") : t("noBackendData")}</p></article>
          <article><span className="metric-icon"><BarChart3 size={18}/></span><div><small>{t("resolvedIncidents")}</small><strong>{metrics.resolved}</strong></div><p>{t("unresolvedIncidents")}: {metrics.unresolved}</p></article>
          <article><span className="metric-icon ai"><BarChart3 size={18}/></span><div><small>{t("confidenceCoverage")}</small><strong>{Math.round(metrics.avgConfidence * 100)}%</strong></div><p>{t("affectedUsers")}: {metrics.affected.toLocaleString(locale)}</p></article>
        </section>

        <section className="panel incidents-panel">
          <div className="panel-head"><div><small className="section-kicker">{t("incidents")}</small><h3>{t("incidentDistribution")}</h3></div></div>
          <div className="incident-list">
            {items.length ? items.map(item => (
              <div className="incident-row" key={item.id}>
                <span className={"severity-bar "+item.severity.toLowerCase()}/>
                <div className="incident-id"><div><strong>{item.incidentNumber}</strong><span>{item.status}</span></div><small>{item.title}</small></div>
                <div className="incident-stat"><strong>{item.affectedUsersEstimate.toLocaleString(locale)}</strong><small>{t("affectedUsers")}</small></div>
                <div className="incident-stat confidence"><strong>{item.rootCauseConfidence == null ? "—" : `${Math.round(item.rootCauseConfidence * 100)}%`}</strong><small>{t("confidence")}</small></div>
              </div>
            )) : <div className="voice-state"><BarChart3 size={25}/><strong>{t("noBackendData")}</strong></div>}
          </div>
        </section>
      </main>
    </OpsShell>
  );
}
