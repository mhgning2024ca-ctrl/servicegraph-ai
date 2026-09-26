"use client";

import { useState } from "react";
import { Activity, CircleUserRound, MapPin, Mic, Send, TriangleAlert, Type, Wifi } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageToggle, useLocale } from "@/lib/i18n";

export default function CitizenPage() {
  const { t } = useLocale();
  const [mode, setMode] = useState<"idle"|"text"|"voice"|"sent">("idle");
  const [text, setText] = useState("");

  function submit() {
    if (text.trim().length < 3) return;
    setMode("sent");
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
              <div className="voice-state">
                <span className="voice-orb"><Mic size={25}/></span>
                <strong>ElevenLabs voice intake</strong>
                <p>Ready for provider integration. Text fallback remains available.</p>
                <button className="text-action" onClick={() => setMode("text")}>{t("type")}</button>
              </div>
            )}

            {mode === "text" && (
              <div className="text-report">
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t("placeholder")} rows={5}/>
                <button className="btn primary full" onClick={submit} disabled={text.trim().length < 3}><Send size={17}/>{t("sendReport")}</button>
              </div>
            )}

            {mode === "sent" && (
              <div className="receipt">
                <span><SignalIcon/></span>
                <div><strong>{t("received")}</strong><small>{t("receipt")}</small></div>
              </div>
            )}
          </section>

          <section className="light-card nearby">
            <div className="nearby-head">
              <div><small className="light-kicker">{t("nearby")}</small><h2>{t("degradation")}</h2></div>
              <span className="critical-pill"><TriangleAlert size={14}/>Critical</span>
            </div>
            <p className="location"><MapPin size={15}/>{t("location")}</p>
            <div className="investigating"><span/>{t("investigating")}</div>
            <button className="btn light full">{t("affectedToo")}</button>
          </section>
        </div>

        <nav className="citizen-nav">
          <button className="active"><Wifi size={19}/><span>{t("status")}</span></button>
          <button><TriangleAlert size={19}/><span>{t("report")}</span></button>
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
