"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, BrainCircuit, CheckCircle2, Clock3, GitBranch, RotateCcw, ShieldCheck, TriangleAlert, Users, X } from "lucide-react";
import { CausalGraph } from "@/components/CausalGraph";
import { OpsShell } from "@/components/OpsShell";
import {
  ApiClientError,
  analyzeIncident,
  createIncidentCommunication,
  createRemediationProposal,
  decideRemediation,
  executeRemediation,
  getIncident,
  getIncidentEvidence,
  getIncidentGraph,
  getOperatorAccessToken,
  listIncidents,
  verifyIncident,
} from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Detail = Awaited<ReturnType<typeof getIncident>>;
type Evidence = Awaited<ReturnType<typeof getIncidentEvidence>>;
type Graph = Awaited<ReturnType<typeof getIncidentGraph>>;
type LoadState = "loading" | "ready" | "auth" | "error";
type OperationState = "idle" | "working" | "error" | "confirmed";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function IncidentPage() {
  const params = useParams();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { t, locale } = useLocale();
  const [modal, setModal] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [operationState, setOperationState] = useState<OperationState>("idle");
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);

  const stages = [
    ["Detected", "Détecté"],
    ["Investigated", "Investigé"],
    ["Proposal", "Proposition"],
    ["Approved", "Approuvé"],
    ["Remediating", "Remédiation"],
    ["Verifying", "Vérification"],
    ["Resolved", "Résolu"],
  ] as const;
  const isFr = locale === "fr";

  async function loadIncident() {
    setLoadState("loading");
    setCorrelationId(null);
    try {
      const accessToken = await getOperatorAccessToken();
      setToken(accessToken);
      if (!accessToken) {
        setLoadState("auth");
        return;
      }

      let resolvedId = routeId ?? "";
      if (!UUID_RE.test(resolvedId)) {
        const incidents = await listIncidents(accessToken);
        const match = incidents.items.find(item => item.incidentNumber === resolvedId);
        if (!match) throw new ApiClientError("Incident was not found.", 404, "NOT_FOUND");
        resolvedId = match.id;
      }

      const [nextDetail, nextEvidence, nextGraph] = await Promise.all([
        getIncident(resolvedId, accessToken),
        getIncidentEvidence(resolvedId, accessToken),
        getIncidentGraph(resolvedId, accessToken),
      ]);
      setIncidentId(resolvedId);
      setDetail(nextDetail);
      setEvidence(nextEvidence);
      setGraph(nextGraph);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiClientError) setCorrelationId(error.correlationId);
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadIncident();
    // routeId is the only route-specific input; locale changes must not reset incident state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  const incident = detail?.incident;
  const hypothesis = detail?.rootCauseHypothesis;
  const proposal = detail?.remediationProposal;
  const incidentNumber = incident?.incidentNumber ?? (routeId || "INC-2048");
  const incidentTitle = incident?.title ?? t("incidentTitle");
  const affectedUsers = detail?.blastRadius?.affectedUsersEstimate ?? incident?.affectedUsersEstimate ?? 1284;
  const reportCount = graph?.nodes.filter(node => node.category === "REPORT").length || 37;
  const serviceCount = graph?.nodes.filter(node => node.category === "SERVICE").length || 3;
  const rootNodeLabel = useMemo(() => {
    if (!hypothesis?.targetNodeId) return "NODE-17";
    return graph?.nodes.find(node => node.id === hypothesis.targetNodeId)?.label ?? hypothesis.targetNodeId;
  }, [graph, hypothesis]);
  const confidence = hypothesis ? Math.round(hypothesis.confidence * 100) : 94;
  const proposalTarget = proposal?.targetNodeId
    ? graph?.nodes.find(node => node.id === proposal.targetNodeId)?.label ?? proposal.targetNodeId
    : rootNodeLabel;
  const live = loadState === "ready" && detail !== null;
  const currentStage = stageIndex(incident?.status ?? "AWAITING_APPROVAL");

  async function runOperation(action: () => Promise<unknown>, confirmedMessage = t("backendConfirmed")) {
    setOperationState("working");
    setOperationMessage(null);
    setCorrelationId(null);
    try {
      await action();
      setOperationState("confirmed");
      setOperationMessage(confirmedMessage);
      await loadIncident();
    } catch (error) {
      setOperationState("error");
      setOperationMessage(t("operationFailed"));
      if (error instanceof ApiClientError) setCorrelationId(error.correlationId);
    }
  }

  async function requestAnalysis() {
    if (!incidentId || !token) return;
    await runOperation(() => analyzeIncident(incidentId, token), t("analysisQueued"));
  }

  async function proposeRemediation() {
    if (!incidentId || !token || !hypothesis?.targetNodeId) return;
    await runOperation(() => createRemediationProposal(incidentId, {
      version: 1,
      createdBy: "OPERATOR",
      actionType: "REROUTE_TRAFFIC",
      targetNodeId: hypothesis.targetNodeId,
      parameters: { scenario: "node17-degradation" },
      rationale: hypothesis.rationale,
      expectedEffect: t("expectedEffect"),
      risk: "LOW",
      evidenceIds: hypothesis.evidenceIds,
    }, token), t("proposalCreated"));
  }

  async function decide(decision: "APPROVE" | "REJECT") {
    if (!proposal || !token) return;
    await runOperation(
      () => decideRemediation(proposal.id, proposal.version, decision, token),
      decision === "APPROVE" ? t("approvedAwaitingExecution") : t("backendConfirmed"),
    );
    setModal(false);
  }

  async function execute() {
    if (!proposal || !token) return;
    await runOperation(() => executeRemediation(proposal.id, token), t("backendConfirmed"));
  }

  async function verify() {
    if (!incidentId || !token) return;
    await runOperation(() => verifyIncident(incidentId, token), t("backendConfirmed"));
  }

  async function publishRecovery() {
    if (!incidentId || !token) return;
    await runOperation(() => createIncidentCommunication(incidentId, {
      audience: "AFFECTED_USERS",
      language: locale,
      text: locale === "fr"
        ? "Le service est rétabli et la récupération a été vérifiée."
        : "Service has been restored and recovery has been verified.",
    }, token), t("communicationCreated"));
  }

  return (
    <OpsShell active="incidents">
      <main className="ops-content incident-page">
        <div className="investigating" role="status">
          <span/>
          {loadState === "loading" && t("loadingIncident")}
          {loadState === "ready" && t("liveData")}
          {loadState === "auth" && <><a href="/auth/login">{t("signIn")}</a> — {t("authenticationRequired")}</>}
          {loadState === "error" && <>{t("incidentUnavailable")} <button className="text-action" onClick={() => void loadIncident()}><RotateCcw size={14}/>{t("refresh")}</button></>}
        </div>
        {!live && <small className="section-kicker">{t("demoSnapshot")}</small>}
        {correlationId && <small className="mono">Correlation: {correlationId}</small>}

        <header className="incident-header">
          <div>
            <div className="breadcrumb">{t("incidents")} <span>/</span> <b>{incidentNumber}</b></div>
            <h2>{incidentTitle}</h2>
            <div className="incident-meta">
              <span className="critical-pill"><TriangleAlert size={14}/>{incident?.severity ?? t("critical")}</span>
              <span><Clock3 size={14}/>{incident?.status ?? t("detected")}</span>
              <span className="mono">{rootNodeLabel}</span>
            </div>
          </div>
          <div className="impact-box"><Users size={18}/><div><strong>{affectedUsers.toLocaleString(locale)}</strong><small>{t("affectedUsers")}</small></div></div>
        </header>

        <section className="incident-grid">
          <article className="panel evidence-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("causalGraph")}</small><h3>{reportCount} → {serviceCount} → 1</h3></div>
              <GitBranch size={19}/>
            </div>
            <CausalGraph
              graph={graph}
              fallbackLabel={t("demoSnapshot")}
              resetLabel={t("resetGraph")}
              accessibleLabel={t("causalGraphAccessible")}
            />
          </article>

          <article className="panel ai-panel">
            <div className="panel-head">
              <div><small className="section-kicker ai-kicker"><BrainCircuit size={14}/>{t("aiInvestigation")}</small><h3>{t("probableCause")}</h3></div>
              <span className="confidence-badge">{confidence}%</span>
            </div>
            <div className="root-cause">
              <BrainCircuit size={22}/>
              <div><strong>{rootNodeLabel}</strong><span>{hypothesis?.label ?? "Packet-loss / latency degradation"}</span></div>
            </div>
            <p>{hypothesis?.rationale ?? t("rationale")}</p>
            <div className="evidence-list">
              <small>{t("supportingEvidence")}</small>
              {(evidence?.evidence.length ? evidence.evidence.slice(0, 3).map(item => (
                <span key={item.id}><CheckCircle2 size={15}/>{item.summary}</span>
              )) : <>
                <span><CheckCircle2 size={15}/>{t("relatedReports")}</span>
                <span><CheckCircle2 size={15}/>{t("packetLossEvidence")}</span>
                <span><CheckCircle2 size={15}/>{t("topologyEvidence")}</span>
              </>)}
            </div>
            {token && incidentId && !hypothesis && (
              <button className="btn secondary" disabled={operationState === "working"} onClick={() => void requestAnalysis()}>{t("runAnalysis")}</button>
            )}
          </article>

          <article className="panel telemetry-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("telemetry")}</small><h3>{t("latency")}</h3></div>
              <strong>242 ms</strong>
            </div>
            <svg className="telemetry-chart" viewBox="0 0 320 110" role="img" aria-label={`${t("latency")}: 242 ms`}>
              <line x1="0" y1="96" x2="320" y2="96"/>
              <polyline points="0,90 28,87 56,84 84,80 112,72 140,61 168,47 196,34 224,22 252,12 280,10 320,16"/>
            </svg>
            <div className="telemetry-pairs">
              <span><b>{t("packetLoss")}</b>21%</span>
              <span><b>{t("blastRadius")}</b>{affectedUsers.toLocaleString(locale)}</span>
            </div>
            <small>{t("demoSnapshot")}</small>
          </article>

          <article className="panel remediation-panel">
            <div className="panel-head">
              <div><small className="section-kicker">{t("remediation")}</small><h3>{proposal?.actionType ?? t("action")}</h3></div>
              <ShieldCheck size={19}/>
            </div>
            <div className="remediation-grid">
              <div><small>{t("target")}</small><strong>{proposalTarget}</strong></div>
              <div><small>{t("risk")}</small><strong>{proposal?.risk ?? t("risk")}</strong></div>
              <div className="wide"><small>{t("expectedEffectLabel")}</small><strong>{proposal?.expectedEffect ?? t("expectedEffect")}</strong></div>
            </div>

            {operationMessage && (
              <div className={operationState === "error" ? "investigating" : "approved"} role="status">
                {operationState === "confirmed" ? <CheckCircle2 size={18}/> : <TriangleAlert size={18}/>} {operationMessage}
              </div>
            )}

            {loadState === "auth" && <a className="btn approval" href="/auth/login"><ShieldCheck size={17}/>{t("signIn")}</a>}

            {token && hypothesis && !proposal && (
              <button className="btn approval" disabled={!hypothesis.targetNodeId || operationState === "working"} onClick={() => void proposeRemediation()}>
                <ShieldCheck size={17}/>{t("createProposal")}
              </button>
            )}

            {token && proposal?.state === "PENDING_APPROVAL" && (
              <div className="remediation-actions">
                <button className="btn secondary" disabled={operationState === "working"} onClick={() => void decide("REJECT")}>{t("reject")}</button>
                <button className="btn approval" disabled={operationState === "working"} onClick={() => setModal(true)}><ShieldCheck size={17}/>{t("approve")}</button>
              </div>
            )}

            {token && proposal?.state === "APPROVED" && (
              <button className="btn approval" disabled={operationState === "working"} onClick={() => void execute()}>{t("execution")}</button>
            )}

            {token && incident?.status === "VERIFYING" && (
              <button className="btn approval" disabled={operationState === "working"} onClick={() => void verify()}>{t("verification")}</button>
            )}

            {token && incident?.status === "RESOLVED" && (
              <button className="btn approval" disabled={operationState === "working"} onClick={() => void publishRecovery()}>{t("publishRecovery")}</button>
            )}
          </article>
        </section>

        <section className="panel timeline-panel">
          <div className="panel-head"><small className="section-kicker">{t("timeline")}</small></div>
          <div className="timeline">
            {stages.map((stage, index) => {
              const complete = index < currentStage;
              const current = index === currentStage;
              return (
                <div key={stage[0]} className={"timeline-step "+(complete ? "complete" : current ? "current" : "")}>
                  <span>{complete ? <CheckCircle2 size={17}/> : current ? <Activity size={17}/> : index + 1}</span>
                  <small>{isFr ? stage[1] : stage[0]}</small>
                </div>
              );
            })}
          </div>
        </section>

        {modal && proposal && (
          <div className="modal-backdrop">
            <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
              <button className="icon-btn modal-close" onClick={() => setModal(false)} aria-label={t("close")}><X size={18}/></button>
              <span className="modal-icon"><ShieldCheck size={24}/></span>
              <h3 id="approval-title">{t("approve")}</h3>
              <p>{t("approvalDialogText")}</p>
              <div className="approval-summary">
                <div><small>{t("target")}</small><strong>{proposalTarget}</strong></div>
                <div><small>{t("risk")}</small><strong>{proposal.risk}</strong></div>
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={() => setModal(false)}>{t("cancel")}</button>
                <button className="btn approval" disabled={operationState === "working"} onClick={() => void decide("APPROVE")}><ShieldCheck size={17}/>{t("approve")}</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </OpsShell>
  );
}

function stageIndex(status: string): number {
  switch (status) {
    case "DETECTED": return 0;
    case "INVESTIGATING":
    case "CONFIRMED": return 1;
    case "REMEDIATION_PROPOSED": return 2;
    case "AWAITING_APPROVAL":
    case "REJECTED": return 3;
    case "REMEDIATING": return 4;
    case "VERIFYING": return 5;
    case "RESOLVED":
    case "CLOSED": return 6;
    default: return 0;
  }
}
