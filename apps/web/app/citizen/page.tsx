"use client";

import { useState } from "react";
import { Activity, CircleUserRound, MapPin, Mic, RotateCcw, Send, TriangleAlert, Type, Wifi } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ApiClientError, createCitizenReport } from "@/lib/api";
import { LanguageToggle, useLocale } from "@/lib/i18n";

type ReportMode = "idle" | "text" | "voice" | "sending" | "sent" | "error";

type Receipt = {
  reportId: string;
  receivedAt: string;
};

export default function CitizenPage() {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<ReportMode>("idle");
  const [text, setText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);

  async function submit() {
    if (text.trim().length < 3 || mode === "sending") return;
    setMode("sending");
    setReceipt(null);
    setCorrelationId(null);

    try {
      const response = await createCitizenReport({
        clientReportId: crypto.randomUUID(),
        channel: "WEB_TEXT",
        text: text.trim(),
        serviceId: null,
        areaCode: "OTT-CENTRETOWN",
        latitude: null,
        longitude: null,
        sourceLanguage: locale,
      });
      setReceipt(response.receipt);
      setMode("sent");
    } catch (error) {
      if (error instanceof ApiClientError) setCorrelationId(error.correlationId);
      setMode("error");
    }
  }

  function resetReport() {
    setMode("text");
    setReceipt(null);
    setCorrelationId(null);
  }

  return (
    <main className="citizen-page">
      <div className="citizen-shell">
        <header className="citizen-header">
          <Brand compact />
          <LanguageToggle />
        </header>

        <section className="citizen-intro">
          <small>{t("serviceStatus")}</small>
          <h1>{t("operational")}</h1>
        </section>

        <section className="service-card">
          <div className="service-state">
            <span className="round-icon healthy"><Wifi size={19}/></span>
            <div><small>{t("serviceStatus")}</small><strong>{t("operational")}</strong></div>
          </div>
          <b>99.97%</b>
        </section>

        <div className="citizen-grid">
          <section className="light-card">
            <small className="light-kicker">{t("reportProblem")}</small>
            <p>{t("reportHint")}</p>

            {mode === "idle" && (
              <div className="report-actions">
                <button onClick={() => setMode("voice")}><span><Mic size={21}/></span><b>{t("speak")}</b></button>
                <button onClick={() => setMode("text")}><span><Type size={21}/></span><b>{t("type")}</b></button>
                <button onClick={() => setMode("text")}><span><Activity size={21}/></span><b>{t("quick")}</b></button>
              </div>
            )}

            {mode === "voice" && (
              <div className="voice-state" role="status">
                <span className="voice-orb"><Mic size={25}/></span>
                <strong>{t("voiceIntake")}</strong>
                <p>{t("voiceUnavailable")}</p>
                <button className="text-action" onClick={() => setMode("text")}>{t("type")}</button>
              </div>
            )}

            {(mode === "text" || mode === "sending") && (
              <div className="text-report">
                <textarea
                  value={text}
                  onChange={event => setText(event.target.value)}
                  placeholder={t("placeholder")}
                  rows={5}
                  disabled={mode === "sending"}
                />
                <button
                  className="btn primary full"
                  onClick={submit}
                  disabled={text.trim().length < 3 || mode === "sending"}
                >
                  <Send size={17}/>{mode === "sending" ? t("sendingReport") : t("sendReport")}
                </button>
              </div>
            )}

            {mode === "sent" && receipt && (
              <div className="receipt" role="status">
                <span><SignalIcon/></span>
                <div>
                  <strong>{t("received")}</strong>
                  <small>{t("receipt")} {t("reportReference")}: <span className="mono">{receipt.reportId}</span></small>
                </div>
              </div>
            )}

            {mode === "error" && (
              <div className="voice-state" role="alert">
                <span className="voice-orb"><TriangleAlert size={25}/></span>
                <strong>{t("apiUnavailable")}</strong>
                <p>{t("reportError")}</p>
                {correlationId && <small className="mono">{correlationId}</small>}
                <button className="text-action" onClick={resetReport}><RotateCcw size={15}/>{t("retry")}</button>
              </div>
            )}
          </section>

          <section className="light-card nearby">
            <div className="nearby-head">
              <div><small className="light-kicker">{t("nearby")}</small><h2>{t("degradation")}</h2></div>
              <span className="critical-pill"><TriangleAlert size={14}/>{t("critical")}</span>
            </div>
            <p className="location"><MapPin size={15}/>{t("location")}</p>
            <div className="investigating"><span/>{t("investigating")}</div>
            <button className="btn light full" disabled title={t("incidentUnavailable")}>{t("affectedToo")}</button>
          </section>
        </div>

        <nav className="citizen-nav">
          <button className="active"><Wifi size={19}/><span>{t("status")}</span></button>
          <button onClick={() => setMode("text")}><TriangleAlert size={19}/><span>{t("report")}</span></button>
          <button><Activity size={19}/><span>{t("activity")}</span></button>
          <button><CircleUserRound size={19}/><span>{t("profile")}</span></button>
        </nav>
      </div>
    </main>
  );
}

function SignalIcon() {
  return <Activity size={19}/>;
}
