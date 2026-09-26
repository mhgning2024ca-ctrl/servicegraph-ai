"use client";

import { useState } from "react";
import { Activity, CircleUserRound, MapPin, Mic, Send, TriangleAlert, Type, Wifi } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageToggle, useLocale } from "@/lib/i18n";

type CitizenTab = "status" | "report" | "activity" | "profile";

export default function CitizenPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState<CitizenTab>("status");
  const [mode, setMode] = useState<"idle"|"text"|"voice"|"sent">("idle");
  const [text, setText] = useState("");
  const [affected, setAffected] = useState(false);

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

        {tab === "status" && (
          <>
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

            <section className="light-card nearby">
              <div className="nearby-head">
                <div><small className="light-kicker">{t("nearby")}</small><h2>{t("degradation")}</h2></div>
                <span className="critical-pill"><TriangleAlert size={14}/>{t("critical")}</span>
              </div>
              <p className="location"><MapPin size={15}/>{t("location")}</p>
              <div className="investigating"><span/>{t("investigating")}</div>
              <button
                className={affected ? "btn confirmed full" : "btn light full"}
                onClick={() => setAffected(value => !value)}
                aria-pressed={affected}
              >
                {affected ? t("affectedConfirmed") : t("affectedToo")}
              </button>
            </section>

            <button className="btn primary full citizen-primary-report" onClick={() => setTab("report")}>
              <TriangleAlert size={17}/>{t("reportProblem")}
            </button>
          </>
        )}

        {tab === "report" && (
          <section className="light-card citizen-tab-card">
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
                <strong>{t("voiceIntakeTitle")}</strong>
                <p>{t("voiceIntakeBody")}</p>
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
        )}

        {tab === "activity" && (
          <section className="light-card citizen-tab-card">
            <small className="light-kicker">{t("activityTitle")}</small>
            {mode === "sent" ? (
              <div className="activity-entry">
                <span className="round-icon healthy"><Activity size={18}/></span>
                <div>
                  <strong>{t("received")}</strong>
                  <p>{t("receipt")}</p>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Activity size={26}/>
                <p>{t("activityEmpty")}</p>
              </div>
            )}
          </section>
        )}

        {tab === "profile" && (
          <section className="light-card citizen-tab-card">
            <small className="light-kicker">{t("profileTitle")}</small>
            <div className="profile-summary">
              <span className="profile-avatar">HG</span>
              <div>
                <strong>Hadi Gning</strong>
                <p>{t("profileBody")}</p>
              </div>
            </div>
            <div className="profile-language-row">
              <span>{t("profileTitle")} · FR / EN</span>
              <LanguageToggle />
            </div>
          </section>
        )}

        <nav className="citizen-nav" aria-label="Citizen">
          <button className={tab === "status" ? "active" : ""} onClick={() => setTab("status")} aria-current={tab === "status" ? "page" : undefined}>
            <Wifi size={19}/><span>{t("status")}</span>
          </button>
          <button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")} aria-current={tab === "report" ? "page" : undefined}>
            <TriangleAlert size={19}/><span>{t("report")}</span>
          </button>
          <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")} aria-current={tab === "activity" ? "page" : undefined}>
            <Activity size={19}/><span>{t("activity")}</span>
          </button>
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")} aria-current={tab === "profile" ? "page" : undefined}>
            <CircleUserRound size={19}/><span>{t("profile")}</span>
          </button>
        </nav>
      </div>
    </main>
  );
}

function SignalIcon() {
  return <Activity size={19}/>;
}
