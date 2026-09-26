"use client";

import { useState } from "react";
import { Activity, BrainCircuit, CheckCircle2, Clock3, GitBranch, ShieldCheck, TriangleAlert, Users, X } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { Topology } from "@/components/Topology";
import { useLocale } from "@/lib/i18n";

export default function IncidentPage() {
  const { t, locale } = useLocale();
  const [modal, setModal] = useState(false);
  const [approved, setApproved] = useState(false);

  const stages = [
    ["Detected","Détecté"],
    ["Investigated","Investigé"],
    ["Proposal","Proposition"],
    ["Approved","Approuvé"],
    ["Remediating","Remédiation"],
    ["Verifying","Vérification"],
    ["Resolved","Résolu"]
  ];
  const isFr = locale === "fr";

  return (
    <OpsShell active="incidents">
      <main className="ops-content incident-page">
        <header className="incident-header">
          <div>
            <div className="breadcrumb">Incidents <span>/</span> <b>INC-2048</b></div>
            <h2>{t("incidentTitle")}</h2>
            <div className="incident-meta">
              <span className="critical-pill"><TriangleAlert size={14}/>Critical</span>
              <span><Clock3 size={14}/>{t("detected")}</span>
              <span className="mono">NODE-17</span>
            </div>
          </div>
          <div className="impact-box"><Users size={18}/><div><strong>1,284</strong><small>{t("affectedUsers")}</small></div></div>
        </header>

        <section className="incident-grid">
          <article className="panel evidence-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("causalGraph")}</small><h3>37 → 3 → 1</h3></div>
              <GitBranch size={19}/>
            </div>
            <div className="causal-flow">
              <div className="causal-node"><strong>37</strong><small>reports</small></div>
              <span className="causal-link"/>
              <div className="causal-node"><strong>3</strong><small>services</small></div>
              <span className="causal-link"/>
              <div className="causal-node root"><strong>NODE-17</strong><small>94%</small></div>
            </div>
            <Topology compact />
          </article>

          <article className="panel ai-panel">
            <div className="panel-head">
              <div><small className="section-kicker ai-kicker"><BrainCircuit size={14}/>{t("aiInvestigation")}</small><h3>{t("probableCause")}</h3></div>
              <span className="confidence-badge">94%</span>
            </div>
            <div className="root-cause">
              <BrainCircuit size={22}/>
              <div><strong>NODE-17</strong><span>Packet-loss / latency degradation</span></div>
            </div>
            <p>{t("rationale")}</p>
            <div className="evidence-list">
              <small>{t("supportingEvidence")}</small>
              <span><CheckCircle2 size={15}/>{t("relatedReports")}</span>
              <span><CheckCircle2 size={15}/>{t("packetLossEvidence")}</span>
              <span><CheckCircle2 size={15}/>{t("topologyEvidence")}</span>
            </div>
          </article>

          <article className="panel telemetry-panel">
            <div className="panel-head">
              <div><small className="section-kicker">Telemetry</small><h3>Latency</h3></div>
              <strong>242 ms</strong>
            </div>
            <svg className="telemetry-chart" viewBox="0 0 320 110" role="img" aria-label="Latency rises from normal to degraded">
              <line x1="0" y1="96" x2="320" y2="96"/>
              <polyline points="0,90 28,87 56,84 84,80 112,72 140,61 168,47 196,34 224,22 252,12 280,10 320,16"/>
            </svg>
            <div className="telemetry-pairs">
              <span><b>Packet loss</b>21%</span>
              <span><b>Blast radius</b>1,284</span>
            </div>
          </article>

          <article className="panel remediation-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("remediation")}</small><h3>{t("action")}</h3></div>
              <ShieldCheck size={19}/>
            </div>
            <div className="remediation-grid">
              <div><small>Target</small><strong>NODE-17 → NODE-12</strong></div>
              <div><small>Risk</small><strong>{t("risk")}</strong></div>
              <div className="wide"><small>Expected effect</small><strong>{t("expectedEffect")}</strong></div>
            </div>
            {approved ? (
              <div className="approved"><CheckCircle2 size={18}/>Approved — awaiting simulator execution</div>
            ) : (
              <div className="remediation-actions">
                <button className="btn secondary">{t("reject")}</button>
                <button className="btn approval" onClick={() => setModal(true)}><ShieldCheck size={17}/>{t("approve")}</button>
              </div>
            )}
          </article>
        </section>

        <section className="panel timeline-panel">
          <div className="panel-head"><small className="section-kicker">{t("timeline")}</small></div>
          <div className="timeline">
            {stages.map((stage,index) => {
              const complete = index < (approved ? 4 : 3);
              const current = index === (approved ? 4 : 3);
              return (
                <div key={stage[0]} className={"timeline-step "+(complete ? "complete" : current ? "current" : "")}>
                  <span>{complete ? <CheckCircle2 size={17}/> : current ? <Activity size={17}/> : index+1}</span>
                  <small>{isFr ? stage[1] : stage[0]}</small>
                </div>
              );
            })}
          </div>
        </section>

        {modal && (
          <div className="modal-backdrop">
            <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
              <button className="icon-btn modal-close" onClick={() => setModal(false)} aria-label="Close"><X size={18}/></button>
              <span className="modal-icon"><ShieldCheck size={24}/></span>
              <h3 id="approval-title">{t("approve")}</h3>
              <p>You are approving proposal v1 for the deterministic network simulator. No real carrier equipment is controlled.</p>
              <div className="approval-summary">
                <div><small>Target</small><strong>NODE-17 → NODE-12</strong></div>
                <div><small>Risk</small><strong>{t("risk")}</strong></div>
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn approval" onClick={() => {setApproved(true);setModal(false);}}><ShieldCheck size={17}/>{t("approve")}</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </OpsShell>
  );
}
