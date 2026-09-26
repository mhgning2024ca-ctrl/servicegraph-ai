"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CircleUserRound, CloudOff, MapPin, Mic, RotateCcw, Send, Square, TriangleAlert, Type, Wifi } from "lucide-react";
import { Brand } from "@/components/Brand";
import {
  ApiClientError,
  confirmAffected,
  createCitizenReport,
  getPublicConfig,
  listPublicIncidents,
  transcribeVoiceReport,
} from "@/lib/api";
import { LanguageToggle, useLocale } from "@/lib/i18n";
import { enqueueReport, flushReportQueue, getQueuedReports } from "@/lib/report-queue";
import type { CreateReportRequest, CreateReportResponse, PublicIncident } from "../../../../packages/contracts/dist/index.js";

type ReportMode = "idle" | "text" | "recording" | "transcribing" | "voiceReady" | "sending" | "sent" | "queued" | "retrying" | "error" | "voiceError";
type CitizenTab = "status" | "report" | "activity" | "profile";
type Receipt = CreateReportResponse["receipt"];
type PublicState = "loading" | "live" | "error";

const MAX_AUDIO_BYTES = 1_000_000;
const audioTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

export default function CitizenPage() {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<ReportMode>("idle");
  const [tab, setTab] = useState<CitizenTab>("status");
  const [text, setText] = useState("");
  const [reportChannel, setReportChannel] = useState<"WEB_TEXT" | "WEB_VOICE">("WEB_TEXT");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [history, setHistory] = useState<Receipt[]>([]);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [publicState, setPublicState] = useState<PublicState>("loading");
  const [publicIncidents, setPublicIncidents] = useState<PublicIncident[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentIncident = publicIncidents.find(incident => !["RESOLVED", "CLOSED"].includes(incident.status)) ?? null;
  const hasDisruption = currentIncident?.severity === "CRITICAL" || currentIncident?.severity === "MAJOR";

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueuedCount(getQueuedReports().length);
    void loadPublicData();

    const onOnline = () => {
      setOnline(true);
      void retryQueuedReports();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      recorderRef.current?.stop();
    };
    // Initial queue and public runtime status are intentionally read only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPublicData() {
    setPublicState("loading");
    try {
      const [config, incidents] = await Promise.all([getPublicConfig(), listPublicIncidents()]);
      setVoiceAvailable(config.features.elevenLabs);
      setPublicIncidents(incidents.incidents);
      setPublicState("live");
    } catch {
      setPublicState("error");
      setVoiceAvailable(false);
    }
  }

  function buildReport(message: string): CreateReportRequest {
    return {
      clientReportId: crypto.randomUUID(),
      channel: reportChannel,
      text: message,
      serviceId: null,
      areaCode: currentIncident?.affectedAreaCodes[0] ?? "OTT-CENTRETOWN",
      latitude: null,
      longitude: null,
      sourceLanguage: locale,
    };
  }

  async function submitPayload(input: CreateReportRequest) {
    if (mode === "sending" || mode === "retrying") return;
    setMode("sending");
    setReceipt(null);
    setCorrelationId(null);
    const idempotencyKey = crypto.randomUUID();

    if (!navigator.onLine) {
      enqueueReport(input, idempotencyKey);
      setQueuedCount(getQueuedReports().length);
      setOnline(false);
      setMode("queued");
      return;
    }

    try {
      const response = await createCitizenReport(input, idempotencyKey);
      setReceipt(response.receipt);
      setHistory(items => [response.receipt, ...items.filter(item => item.reportId !== response.receipt.reportId)]);
      setMode("sent");
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "NETWORK_ERROR") {
        enqueueReport(input, idempotencyKey);
        setQueuedCount(getQueuedReports().length);
        setMode("queued");
        return;
      }
      if (error instanceof ApiClientError) setCorrelationId(error.correlationId);
      setMode("error");
    }
  }

  async function submit() {
    if (text.trim().length < 3) return;
    await submitPayload(buildReport(text.trim()));
  }

  async function confirmImpact() {
    if (!currentIncident || confirmationState === "sending") return;
    setConfirmationState("sending");
    try {
      await confirmAffected(currentIncident.id, {
        serviceId: null,
        areaCode: currentIncident.affectedAreaCodes[0] ?? "OTT-CENTRETOWN",
      });
      setConfirmationState("sent");
    } catch {
      setConfirmationState("error");
    }
  }

  async function startRecording() {
    setVoiceError(null);
    if (!voiceAvailable || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMode("voiceError");
      setVoiceError(t("voiceUnavailable"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = audioTypes.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        recorderRef.current = null;
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void transcribe(audio);
      };
      recorder.start();
      setMode("recording");
    } catch {
      setMode("voiceError");
      setVoiceError(t("voiceUnavailable"));
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function transcribe(audio: Blob) {
    if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
      setMode("voiceError");
      setVoiceError(t("audioTooLarge"));
      return;
    }
    setMode("transcribing");
    try {
      const transcription = await transcribeVoiceReport(audio, locale);
      setText(transcription.text);
      setReportChannel("WEB_VOICE");
      setMode("voiceReady");
    } catch (error) {
      if (error instanceof ApiClientError) setCorrelationId(error.correlationId);
      setMode("voiceError");
      setVoiceError(t("voiceTranscriptionError"));
    }
  }

  async function retryQueuedReports() {
    const count = getQueuedReports().length;
    setQueuedCount(count);
    if (!count || !navigator.onLine) return;
    setMode("retrying");
    try {
      const result = await flushReportQueue();
      setQueuedCount(result.remaining);
      if (result.sentReceipts.length) {
        const latest = result.sentReceipts[result.sentReceipts.length - 1];
        setReceipt(latest);
        setHistory(items => [...result.sentReceipts.slice().reverse(), ...items].filter((item, index, all) => all.findIndex(other => other.reportId === item.reportId) === index));
      }
      setMode(result.remaining ? "queued" : result.sentReceipts.length ? "sent" : "idle");
    } catch {
      setMode("queued");
    }
  }

  function resetReport() {
    setMode("text");
    setReportChannel("WEB_TEXT");
    setReceipt(null);
    setCorrelationId(null);
    setVoiceError(null);
  }

  function openReport(prefill?: string) {
    setTab("report");
    setReportChannel("WEB_TEXT");
    if (prefill) setText(prefill);
    setMode("text");
    window.setTimeout(() => document.getElementById("citizen-report")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  return (
    <main className="citizen-page">
      <div className="citizen-shell">
        <header className="citizen-header"><Brand compact /><LanguageToggle /></header>

        <section className="citizen-intro"><small>{t("serviceStatus")}</small><h1>{hasDisruption ? t("degradation") : t("operational")}</h1></section>

        <section className="service-card">
          <div className="service-state">
            <span className={`round-icon ${hasDisruption ? "critical" : "healthy"}`}><Wifi size={19}/></span>
            <div><small>{t("serviceStatus")}</small><strong>{hasDisruption ? t("degradation") : t("operational")}</strong></div>
          </div>
          <b>{publicState === "live" && currentIncident ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(currentIncident.updatedAt)) : publicState === "loading" ? "…" : "—"}</b>
        </section>

        <div className="investigating" role="status">
          <span />
          {publicState === "loading" ? t("publicStatusLoading") : publicState === "error" ? t("publicStatusUnavailable") : online ? t("onlineReady") : t("offlineMode")}
          {queuedCount > 0 && <> · {queuedCount} {t("queuedReports")}</>}
          {online && queuedCount > 0 && <button className="text-action" onClick={() => void retryQueuedReports()}><RotateCcw size={14}/>{t("retry")}</button>}
          {publicState === "error" && <button className="text-action" onClick={() => void loadPublicData()}><RotateCcw size={14}/>{t("refresh")}</button>}
        </div>

        <div className="citizen-grid">
          <section className="light-card" id="citizen-report">
            <small className="light-kicker">{t("reportProblem")}</small><p>{t("reportHint")}</p>

            {mode === "idle" && <div className="report-actions">
              <button onClick={() => void startRecording()}><span><Mic size={21}/></span><b>{t("speak")}</b></button>
              <button onClick={() => openReport()}><span><Type size={21}/></span><b>{t("type")}</b></button>
              <button onClick={() => openReport(locale === "fr" ? "Ma connexion Internet est lente ou instable." : "My Internet connection is slow or unstable.")}><span><Activity size={21}/></span><b>{t("quick")}</b></button>
            </div>}

            {mode === "recording" && <div className="voice-state" role="status"><span className="voice-orb"><Mic size={25}/></span><strong>{t("recordingVoice")}</strong><button className="btn light" onClick={stopRecording}><Square size={15}/>{t("stopRecording")}</button></div>}
            {mode === "transcribing" && <div className="voice-state" role="status"><span className="voice-orb"><RotateCcw size={25}/></span><strong>{t("transcribingVoice")}</strong></div>}

            {(mode === "text" || mode === "voiceReady" || mode === "sending") && <div className="text-report">
              {mode === "voiceReady" && <p>{t("voiceReady")}</p>}
              <textarea value={text} onChange={event => setText(event.target.value)} placeholder={t("placeholder")} rows={5} disabled={mode === "sending"} />
              <button className="btn primary full" onClick={() => void submit()} disabled={text.trim().length < 3 || mode === "sending"}><Send size={17}/>{mode === "sending" ? t("sendingReport") : t("sendReport")}</button>
            </div>}

            {mode === "retrying" && <div className="voice-state" role="status"><span className="voice-orb"><RotateCcw size={25}/></span><strong>{t("retryingQueued")}</strong></div>}
            {mode === "queued" && <div className="voice-state" role="status"><span className="voice-orb"><CloudOff size={25}/></span><strong>{t("queuedOffline")}</strong><p>{t("queuedOfflineDetail")}</p>{online && <button className="text-action" onClick={() => void retryQueuedReports()}><RotateCcw size={15}/>{t("retry")}</button>}</div>}
            {mode === "sent" && receipt && <div className="receipt" role="status"><span><Activity size={19}/></span><div><strong>{t("received")}</strong><small>{t("receipt")} {t("reportReference")}: <span className="mono">{receipt.reportId}</span></small></div></div>}
            {mode === "error" && <div className="voice-state" role="alert"><span className="voice-orb"><TriangleAlert size={25}/></span><strong>{t("apiUnavailable")}</strong><p>{t("reportError")}</p>{correlationId && <small className="mono">{correlationId}</small>}<button className="text-action" onClick={resetReport}><RotateCcw size={15}/>{t("retry")}</button></div>}
            {mode === "voiceError" && <div className="voice-state" role="alert"><span className="voice-orb"><TriangleAlert size={25}/></span><strong>{t("voiceIntake")}</strong><p>{voiceError ?? t("voiceUnavailable")}</p>{correlationId && <small className="mono">{correlationId}</small>}<button className="text-action" onClick={() => openReport()}>{t("type")}</button></div>}
          </section>

          <section className="light-card nearby">
            <div className="nearby-head"><div><small className="light-kicker">{t("nearby")}</small><h2>{currentIncident?.title ?? t("noKnownIncident")}</h2></div>{currentIncident && <span className="critical-pill"><TriangleAlert size={14}/>{currentIncident.severity === "CRITICAL" ? t("critical") : currentIncident.severity}</span>}</div>
            {currentIncident ? <><p className="location"><MapPin size={15}/>{currentIncident.affectedAreaCodes[0] ?? "—"}</p><div className="investigating"><span/>{currentIncident.status}</div></> : <p>{publicState === "error" ? t("publicStatusUnavailable") : t("noKnownIncident")}</p>}
            <button className="btn light full" onClick={() => void confirmImpact()} disabled={!currentIncident || confirmationState === "sending" || confirmationState === "sent"}>{confirmationState === "sending" ? t("confirmingAffected") : confirmationState === "sent" ? t("affectedConfirmed") : t("affectedToo")}</button>
            {confirmationState === "error" && <p role="alert">{t("publicStatusUnavailable")}</p>}
          </section>
        </div>

        {tab === "activity" && <section className="light-card"><small className="light-kicker">{t("activity")}</small><h2>{t("reportActivity")}</h2><p>{queuedCount > 0 ? `${queuedCount} ${t("queuedReports")}` : t("noQueuedReports")}</p><div className="evidence-list">{history.length ? history.map(item => <span key={item.reportId}><Activity size={15}/><span className="mono">{item.reportId}</span></span>) : <span>{t("noConfirmedReports")}</span>}</div></section>}
        {tab === "profile" && <section className="light-card"><small className="light-kicker">{t("profile")}</small><h2>{t("citizenPreferences")}</h2><p>{t("citizenProfileDetail")}</p><LanguageToggle /></section>}

        <nav className="citizen-nav" aria-label={t("citizenNavigation")}>
          <button className={tab === "status" ? "active" : ""} onClick={() => { setTab("status"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Wifi size={19}/><span>{t("status")}</span></button>
          <button className={tab === "report" ? "active" : ""} onClick={() => openReport()}><TriangleAlert size={19}/><span>{t("report")}</span></button>
          <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}><Activity size={19}/><span>{t("activity")}</span></button>
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><CircleUserRound size={19}/><span>{t("profile")}</span></button>
        </nav>
      </div>
    </main>
  );
}
