"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Clock3, Radio, RotateCcw, Siren, TriangleAlert, Users } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { Topology } from "@/components/Topology";
import { getOperatorAccessToken, listIncidents } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Incident = Awaited<ReturnType<typeof listIncidents>>["items"][number];
type SourceState = "loading" | "live" | "auth" | "error";

const fallbackIncidents: Incident[] = [
  {
    id: "00000000-0000-4000-8000-000000002048",
    incidentNumber: "INC-2048",
    title: "Intermittent connectivity — Ottawa Centre",
    status: "AWAITING_APPROVAL",
    severity: "CRITICAL",
    createdAt: new Date(Date.now() - 14 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
    resolvedAt: null,
    affectedUsersEstimate: 1284,
    affectedServiceIds: [],
    affectedAreaCodes: ["OTT-CENTRETOWN"],
    probableRootNodeId: null,
    rootCauseConfidence: 0.94,
  },
  {
    id: "00000000-0000-4000-8000-000000002047",
    incidentNumber: "INC-2047",
    title: "Edge degradation",
    status: "INVESTIGATING",
    severity: "MAJOR",
    createdAt: new Date(Date.now() - 23 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date(Date.now() - 23 * 60_000).toISOString(),
    resolvedAt: null,
    affectedUsersEstimate: 486,
    affectedServiceIds: [],
    affectedAreaCodes: ["OTT-DOWNTOWN"],
    probableRootNodeId: null,
    rootCauseConfidence: 0.81,
  },
  {
    id: "00000000-0000-4000-8000-000000002043",
    incidentNumber: "INC-2043",
    title: "Access instability",
    status: "DETECTED",
    severity: "MINOR",
    createdAt: new Date(Date.now() - 41 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date(Date.now() - 41 * 60_000).toISOString(),
    resolvedAt: null,
    affectedUsersEstimate: 97,
    affectedServiceIds: [],
    affectedAreaCodes: ["OTT-CENTRETOWN"],
    probableRootNodeId: null,
    rootCauseConfidence: 0.72,
  },
];

export default function OpsPage() {
  const { t, locale } = useLocale();
  const [sourceState, setSourceState] = useState<SourceState>("loading");
  const [liveIncidents, setLiveIncidents] = useState<Incident[]>([]);

  async function load() {
    setSourceState("loading");
    try {
      const token = await getOperatorAccessToken();
      if (!token) {
        setLiveIncidents([]);
        setSourceState("auth");
        return;
      }
      const response = await listIncidents(token);
      setLiveIncidents(response.items);
      setSourceState("live");
    } catch {
      setLiveIncidents([]);
      setSourceState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const incidents = sourceState === "live" ? liveIncidents : fallbackIncidents;
  const active = useMemo(() => incidents.filter(item => !["RESOLVED", "CLOSED"].includes(item.status)), [incidents]);
  const affected = useMemo(() => active.reduce((sum, item) => sum + item.affectedUsersEstimate, 0), [active]);
  const severityCounts = useMemo(() => ({
    critical: active.filter(item => item.severity === "CRITICAL").length,
    major: active.filter(item => item.severity === "MAJOR").length,
    minor: active.filter(item => item.severity === "MINOR").length,
  }), [active]);

  return (
    <OpsShell active="overview">
      <main className="ops-content">
        <div className="investigating" role="status">
          <span/>
          {sourceState === "loading" && t("nocLoading")}
          {sourceState === "live" && t("liveData")}
          {sourceState === "auth" && <><a href="/auth/login">{t("signIn")}</a> — {t("demoSnapshot")}</>}
          {sourceState === "error" && <>{t("nocUnavailable")} <button className="text-action" onClick={() => void load()}><RotateCcw size={14}/>{t("refresh")}</button></>}
        </div>

        <section className="health-strip">
          <div>
            <small className="section-kicker">{t("globalHealth")}</small>
            <div className="health-value"><span/>97.2%</div>
            <p>{t("operational")}</p>
          </div>
          <div className="spark-bars" aria-label={t("recentServiceHealth")}>
            {[45,52,48,61,69,66,78,74,82,88,91,94,96].map((n,i)=><span key={i} style={{height:n+"%"}}/> )}
          </div>
          <span className="live-chip"><Radio size={14}/>{t("demoSnapshot")}</span>
        </section>

        <section className="metric-grid">
          <article>
            <span className="metric-icon danger"><Siren size={18}/></span>
            <div><small>{t("activeIncidents")}</small><strong>{active.length}</strong></div>
            <p>{severityCounts.critical} {formatSeverity("CRITICAL", locale)} · {severityCounts.major} {formatSeverity("MAJOR", locale)} · {severityCounts.minor} {formatSeverity("MINOR", locale)}</p>
          </article>
          <article>
            <span className="metric-icon"><Users size={18}/></span>
            <div><small>{t("affectedUsers")}</small><strong>{affected.toLocaleString(locale)}</strong></div>
            <p>{sourceState === "live" ? t("liveData") : t("demoSnapshot")}</p>
          </article>
          <article>
            <span className="metric-icon ai"><Activity size={18}/></span>
            <div><small>{t("medianTriage")}</small><strong>4.2 min</strong></div>
            <p>{t("demoScenarioWindow")}</p>
          </article>
        </section>

        <section className="ops-grid">
          <article className="panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("topology")}</small><h2>{t("ottawaServiceMesh")}</h2></div>
              <span className="warn-pill"><TriangleAlert size={14}/>NODE-17</span>
            </div>
            <Topology />
            <div className="telemetry-strip">
              <span><b>{t("packetLoss")}</b>21%</span>
              <span><b>{t("latency")}</b>242 ms</span>
              <span><b>{t("latest")}</b>12 s</span>
            </div>
            <small className="section-kicker">{t("demoSnapshot")}</small>
          </article>

          <article className="panel incidents-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("liveStream")}</small><h2>{t("attention")}</h2></div>
              <span className="live-dot">{sourceState === "live" ? t("live") : t("demoSnapshot")}</span>
            </div>
            <div className="incident-list">
              {incidents.slice(0, 8).map(item => (
                <Link href={`/ops/incidents/${encodeURIComponent(item.incidentNumber)}`} key={item.id} className="incident-row">
                  <span className={"severity-bar "+item.severity.toLowerCase()}/>
                  <div className="incident-id">
                    <div><strong>{item.incidentNumber}</strong><span>{formatStatus(item.status, locale)}</span></div>
                    <small><Clock3 size={13}/>{ageMinutes(item.createdAt)} min</small>
                  </div>
                  <div className="incident-stat"><strong>{item.affectedUsersEstimate.toLocaleString(locale)}</strong><small>{t("affectedUsers")}</small></div>
                  <div className="incident-stat confidence"><strong>{item.rootCauseConfidence == null ? "—" : `${Math.round(item.rootCauseConfidence * 100)}%`}</strong><small>{t("confidence")}</small></div>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </main>
    </OpsShell>
  );
}

function ageMinutes(timestamp: string) {
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000));
}

function formatSeverity(value: Incident["severity"], locale: "fr" | "en") {
  const labels = locale === "fr"
    ? { INFO: "Info", MINOR: "Mineur", MAJOR: "Majeur", CRITICAL: "Critique" }
    : { INFO: "Info", MINOR: "Minor", MAJOR: "Major", CRITICAL: "Critical" };
  return labels[value];
}

function formatStatus(value: Incident["status"], locale: "fr" | "en") {
  const fr: Record<Incident["status"], string> = {
    DETECTED: "Détecté", INVESTIGATING: "En investigation", CONFIRMED: "Confirmé",
    REMEDIATION_PROPOSED: "Remédiation proposée", AWAITING_APPROVAL: "Approbation requise",
    REJECTED: "Rejeté", REMEDIATING: "Remédiation", VERIFYING: "Vérification",
    RESOLVED: "Résolu", CLOSED: "Fermé",
  };
  if (locale === "fr") return fr[value];
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
}
