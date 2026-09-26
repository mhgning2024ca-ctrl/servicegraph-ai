"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CircleUserRound, CloudOff, MapPin, Mic, RotateCcw, Send, Square, TriangleAlert, Type, Wifi } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ApiClientError, createCitizenReport, transcribeVoiceReport } from "@/lib/api";
import { LanguageToggle, useLocale } from "@/lib/i18n";
import { enqueueReport, flushReportQueue, getQueuedReports } from "@/lib/report-queue";
import type { CreateReportRequest, CreateReportResponse } from "../../../../packages/contracts/dist/index.js";

type ReportMode = "idle" | "text" | "voice" | "recording" | "transcribing" | "voice-error" | "sending" | "sent" | "queued" | "retrying" | "error";
type VoiceError = "permission" | "provider" | "unsupported" | "size" | null;
type CitizenTab = "status" | "report" | "activity" | "profile";
type Receipt = CreateReportResponse["receipt"];

export default function CitizenPage() {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<ReportMode>("idle");
  const [tab, setTab] = useState<CitizenTab>("status");
  const [text, setText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [history, setHistory] = useState<Receipt[]>([]);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [voiceError, setVoiceError] = useState<VoiceError>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueuedCount(getQueuedReports().length);

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
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
    // Initial queue state is intentionally read only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildReport(message: string): CreateReportRequest {
    return {
      clientReportId: crypto.randomUUID(),
      channel: "WEB_TEXT",
      text: message,
      serviceId: null,
      areaCode: "OTT-CENTRETOWN",
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

  async function confirmAffected() {
    const message = locale === "fr"
      ? "Je suis aussi affecté par la dégradation Internet signalée dans le Centre d’Ottawa."
      : "I am also affected by the reported Internet degradation in Ottawa Centre.";
    setTab("report");
    await submitPayload(buildReport(message));
  }

  async function startVoiceRecording() {
    setVoiceError(null);
    setCorrelationId(null);
    if (!navigator.onLine) {
      setVoiceError("provider");
      setMode("voice-error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("unsupported");
      setMode("voice-error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = preferredRecordingType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        void transcribeRecording(blob);
      };
      recorder.start(250);
      setMode("recording");
    } catch {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setVoiceError("permission");
      setMode("voice-error");
    }
  }

  function stopVoiceRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function transcribeRecording(blob: Blob) {
    setMode("transcribing");
    try {
      const result = await transcribeVoiceReport(blob, locale);
      setText(result.text);
      setMode("text");
      setTab("report");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setCorrelationId(error.correlationId);
        setVoiceError(error.code === "AUDIO_TOO_LARGE" ? "size" : "provider");
      } else {
        setVoiceError("provider");
      }
      setMode("voice-error");
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
    setReceipt(null);
    setCorrelationId(null);
  }

  function openReport(prefill?: string) {
    setTab("report");
    if (prefill) setText(prefill);
    setMode("text");
    window.setTimeout(() => document.getElementById("citizen-report")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
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

        <div className="investigating" role="status">
          <span/>
          {online ? t("onlineReady") : t("offlineMode")}
          {queuedCount > 0 && <> · {queuedCount} {t("queuedReports")}</>}
          {online && queuedCount > 0 && <button className="text-action" onClick={() => void retryQueuedReports()}><RotateCcw size={14}/>{t("retry")}</button>}
        </div>

        <div className="citizen-grid">
          <section className="light-card" id="citizen-report">
            <small className="light-kicker">{t("reportProblem")}</small>
            <p>{t("reportHint")}</p>

            {mode === "idle" && (
              <div className="report-actions">
                <button onClick={() => { setTab("report"); setMode("voice"); }}><span><Mic size={21}/></span><b>{t("speak")}</b></button>
                <button onClick={() => openReport()}><span><Type size={21}/></span><b>{t("type")}</b></button>
                <button onClick={() => openReport(locale === "fr" ? "Ma connexion Internet est lente ou instable." : "My Internet connection is slow or unstable.")}><span><Activity size={21}/></span><b>{t("quick")}</b></button>
              </div>
            )}

            {mode === "voice" && (
              <div className="voice-state" role="status">
                <span className="voice-orb"><Mic size={25}/></span>
                <strong>{t("voiceIntake")}</strong>
                <p>{t("voiceReady")}</p>
                <button className="btn primary full" onClick={() => void startVoiceRecording()} disabled={!online}><Mic size={17}/>{t("startRecording")}</button>
                <button className="text-action" onClick={() => openReport()}>{t("typeInstead")}</button>
              </div>
            )}

            {mode === "recording" && (
              <div className="voice-state" role="status" aria-live="polite">
                <span className="voice-orb"><Mic size={25}/></span>
                <strong>{t("recordingNow")}</strong>
                <p>{t("recordingHint")}</p>
                <button className="btn primary full" onClick={stopVoiceRecording}><Square size={16}/>{t("stopRecording")}</button>
              </div>
            )}

            {mode === "transcribing" && (
              <div className="voice-state" role="status" aria-live="polite">
                <span className="voice-orb"><RotateCcw size={25}/></span>
                <strong>{t("transcribingVoice")}</strong>
                <p>{t("transcriptionReviewHint")}</p>
              </div>
            )}

            {mode === "voice-error" && (
              <div className="voice-state" role="alert">
                <span className="voice-orb"><TriangleAlert size={25}/></span>
                <strong>{t("voiceTranscriptionFailed")}</strong>
                <p>{voiceError === "permission" ? t("microphoneDenied") : voiceError === "unsupported" ? t("microphoneUnsupported") : voiceError === "size" ? t("audioTooLarge") : t("voiceProviderUnavailable")}</p>
                {correlationId && <small className="mono">{correlationId}</small>}
                <button className="text-action" onClick={() => openReport()}>{t("typeInstead")}</button>
                {online && <button className="text-action" onClick={() => setMode("voice")}><RotateCcw size={15}/>{t("retry")}</button>}
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
                <button className="btn primary full" onClick={() => void submit()} disabled={text.trim().length < 3 || mode === "sending"}>
                  <Send size={17}/>{mode === "sending" ? t("sendingReport") : t("sendReport")}
                </button>
              </div>
            )}

            {mode === "retrying" && (
              <div className="voice-state" role="status"><span className="voice-orb"><RotateCcw size={25}/></span><strong>{t("retryingQueued")}</strong></div>
            )}

            {mode === "queued" && (
              <div className="voice-state" role="status">
                <span className="voice-orb"><CloudOff size={25}/></span>
                <strong>{t("queuedOffline")}</strong>
                <p>{t("queuedOfflineDetail")}</p>
                {online && <button className="text-action" onClick={() => void retryQueuedReports()}><RotateCcw size={15}/>{t("retry")}</button>}
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
            <button className="btn light full" onClick={() => void confirmAffected()} disabled={mode === "sending" || mode === "retrying" || mode === "recording" || mode === "transcribing"}>{t("affectedToo")}</button>
          </section>
        </div>

        {tab === "activity" && (
          <section className="light-card">
            <small className="light-kicker">{t("activity")}</small>
            <h2>{t("reportActivity")}</h2>
            <p>{queuedCount > 0 ? `${queuedCount} ${t("queuedReports")}` : t("noQueuedReports")}</p>
            <div className="evidence-list">
              {history.length ? history.map(item => <span key={item.reportId}><Activity size={15}/><span className="mono">{item.reportId}</span></span>) : <span>{t("noConfirmedReports")}</span>}
            </div>
          </section>
        )}

        {tab === "profile" && (
          <section className="light-card">
            <small className="light-kicker">{t("profile")}</small>
            <h2>{t("citizenPreferences")}</h2>
            <p>{t("citizenProfileDetail")}</p>
            <LanguageToggle />
          </section>
        )}

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

function preferredRecordingType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find(type => MediaRecorder.isTypeSupported(type));
}

function SignalIcon() {
  return <Activity size={19}/>;
}
