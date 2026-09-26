"use client";

import Link from "next/link";
import { Activity, Clock3, Radio, Siren, TriangleAlert, Users } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { Topology } from "@/components/Topology";
import { useLocale } from "@/lib/i18n";

const incidents = [
  { code: "INC-2048", severity: "critical", node: "NODE-17", users: 1284, confidence: 94, age: 14 },
  { code: "INC-2047", severity: "major", node: "NODE-21", users: 486, confidence: 81, age: 23 },
  { code: "INC-2043", severity: "minor", node: "NODE-31", users: 97, confidence: 72, age: 41 }
];

export default function OpsPage() {
  const { t } = useLocale();
  return (
    <OpsShell active="overview">
      <main className="ops-content">
        <section className="health-strip">
          <div>
            <small className="section-kicker">{t("globalHealth")}</small>
            <div className="health-value"><span/>97.2%</div>
            <p>{t("operational")}</p>
          </div>
          <div className="spark-bars" aria-label="Recent service health">
            {[45,52,48,61,69,66,78,74,82,88,91,94,96].map((n,i)=><span key={i} style={{height:n+"%"}}/> )}
          </div>
          <span className="live-chip"><Radio size={14}/>{t("live")}</span>
        </section>

        <section className="metric-grid">
          <article>
            <span className="metric-icon danger"><Siren size={18}/></span>
            <div><small>{t("activeIncidents")}</small><strong>13</strong></div>
            <p>2 {t("critical")} · 4 {t("major")} · 7 {t("minor")}</p>
          </article>
          <article>
            <span className="metric-icon"><Users size={18}/></span>
            <div><small>{t("affectedUsers")}</small><strong>2,431</strong></div>
            <p>+1,284 · INC-2048</p>
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
              <div><small className="section-kicker">{t("topology")}</small><h2>Ottawa service mesh</h2></div>
              <span className="warn-pill"><TriangleAlert size={14}/>NODE-17</span>
            </div>
            <Topology />
            <div className="telemetry-strip">
              <span><b>{t("packetLoss")}</b>21%</span>
              <span><b>{t("latency")}</b>242 ms</span>
              <span><b>{t("latest")}</b>12 s</span>
            </div>
          </article>

          <article className="panel incidents-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("liveStream")}</small><h2>{t("attention")}</h2></div>
              <span className="live-dot">{t("live")}</span>
            </div>
            <div className="incident-list">
              {incidents.map(item => (
                <Link href={item.code === "INC-2048" ? "/ops/incidents/INC-2048" : "/ops"} key={item.code} className="incident-row">
                  <span className={"severity-bar "+item.severity}/>
                  <div className="incident-id">
                    <div><strong>{item.code}</strong><span>{item.node}</span></div>
                    <small><Clock3 size={13}/>{item.age} min</small>
                  </div>
                  <div className="incident-stat"><strong>{item.users.toLocaleString()}</strong><small>{t("affectedUsers")}</small></div>
                  <div className="incident-stat confidence"><strong>{item.confidence}%</strong><small>{t("confidence")}</small></div>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </main>
    </OpsShell>
  );
}
