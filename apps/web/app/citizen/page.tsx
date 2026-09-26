"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CloudOff,
  Compass,
  House,
  LoaderCircle,
  Map,
  MapPin,
  Mic,
  Navigation,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  TriangleAlert,
  UserRound,
  Wifi,
} from "lucide-react";
import { ApiClientError, createCitizenReport, transcribeVoiceReport } from "@/lib/api";
import { enqueueReport, flushReportQueue, getQueuedReports } from "@/lib/report-queue";
import type { CreateReportRequest, CreateReportResponse } from "../../../../packages/contracts/dist/index.js";
import styles from "./citizen-v2.module.css";

type Tab = "home" | "map" | "report" | "track" | "profile";
type ReportInputMode = "text" | "voice";
type ReportState = "ready" | "recording" | "transcribing" | "sending" | "sent" | "queued" | "error";
type Category = "internet" | "mobile" | "wifi" | "other";
type Receipt = CreateReportResponse["receipt"];

const categoryLabels: Record<Category, string> = {
  internet: "Internet",
  mobile: "Mobile",
  wifi: "Wi-Fi",
  other: "Autre",
};

const serviceItems = [
  { name: "Internet", state: "Opérationnel", warn: false },
  { name: "Mobile", state: "Opérationnel", warn: false },
  { name: "Wi-Fi public", state: "Dégradation locale", warn: true },
  { name: "Portail citoyen", state: "Opérationnel", warn: false },
];

const navItems: Array<{ id: Tab; label: string; icon: typeof House }> = [
  { id: "home", label: "Accueil", icon: House },
  { id: "map", label: "Carte", icon: Map },
  { id: "report", label: "Signaler", icon: Plus },
  { id: "track", label: "Suivi", icon: Clock3 },
  { id: "profile", label: "Profil", icon: UserRound },
];

export default function CitizenPage() {
  const [tab, setTab] = useState<Tab>("home");
  const [inputMode, setInputMode] = useState<ReportInputMode>("text");
  const [reportState, setReportState] = useState<ReportState>("ready");
  const [category, setCategory] = useState<Category>("internet");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueuedCount(getQueuedReports().length);

    const handleOnline = () => {
      setOnline(true);
      void retryQueuedReports();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
    // Queue state is intentionally hydrated only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildReport(): CreateReportRequest {
    return {
      clientReportId: crypto.randomUUID(),
      channel: "WEB_TEXT",
      text: `[${categoryLabels[category]}] ${message.trim()}`,
      serviceId: null,
      areaCode: "OTT-CENTRETOWN",
      latitude: null,
      longitude: null,
      sourceLanguage: "fr",
    };
  }

  async function submitReport() {
    if (message.trim().length < 3 || reportState === "sending") return;

    const payload = buildReport();
    const idempotencyKey = crypto.randomUUID();
    setErrorMessage(null);
    setReportState("sending");

    if (!navigator.onLine) {
      enqueueReport(payload, idempotencyKey);
      setQueuedCount(getQueuedReports().length);
      setReportState("queued");
      return;
    }

    try {
      const response = await createCitizenReport(payload, idempotencyKey);
      setReceipt(response.receipt);
      setReportState("sent");
      navigate("track");
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "NETWORK_ERROR") {
        enqueueReport(payload, idempotencyKey);
        setQueuedCount(getQueuedReports().length);
        setReportState("queued");
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Le signalement n’a pas pu être envoyé.");
      setReportState("error");
    }
  }

  async function retryQueuedReports() {
    if (!navigator.onLine || getQueuedReports().length === 0) return;
    try {
      const result = await flushReportQueue();
      setQueuedCount(result.remaining);
      if (result.sentReceipts.length > 0) {
        setReceipt(result.sentReceipts[result.sentReceipts.length - 1]);
        setReportState("sent");
      }
    } catch {
      setReportState("queued");
    }
  }

  async function startVoiceRecording() {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage("L’enregistrement vocal n’est pas pris en charge par ce navigateur.");
      setReportState("error");
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        void transcribeRecording(blob);
      };
      recorder.start(250);
      setReportState("recording");
    } catch {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setErrorMessage("Autorise l’accès au microphone pour utiliser le signalement vocal.");
      setReportState("error");
    }
  }

  function stopVoiceRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  async function transcribeRecording(blob: Blob) {
    setReportState("transcribing");
    try {
      const result = await transcribeVoiceReport(blob, "fr");
      setMessage(result.text);
      setInputMode("text");
      setReportState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "La transcription vocale est indisponible.");
      setReportState("error");
    }
  }

  function prefillIncidentReport() {
    setCategory("internet");
    setMessage("Je suis également affecté par la dégradation Internet dans le Centre d’Ottawa.");
    setInputMode("text");
    setReportState("ready");
    navigate("report");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brandLockup}>
            <span className={styles.brandMark}><Activity size={22} /></span>
            <div>
              <span className={styles.brandName}>ServiceGraph IA</span>
              <span className={styles.brandSub}>Services publics, incidents et suivi citoyen</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /></button>
            <button className={styles.iconButton} aria-label="Profil" onClick={() => navigate("profile")}><CircleUserRound size={20} /></button>
          </div>
        </header>

        {!online && (
          <div className={styles.networkBanner} role="status">
            <CloudOff size={15} /> Mode hors ligne — les signalements seront conservés sur l’appareil.
          </div>
        )}

        {queuedCount > 0 && (
          <div className={styles.queueRow}>
            {queuedCount} signalement{queuedCount > 1 ? "s" : ""} en attente.
            {online && <button className={styles.ghostButton} onClick={() => void retryQueuedReports()}><RefreshCcw size={14} /> Renvoyer</button>}
          </div>
        )}

        {tab === "home" && (
          <>
            <section className={styles.hero}>
              <div className={styles.heroMain}>
                <span className={styles.eyebrow}><ShieldCheck size={15} /> Centre d’Ottawa · Maintenant</span>
                <h1 className={styles.heroTitle}>Vos services. Leur état. Une réponse claire.</h1>
                <p className={styles.heroText}>Consultez les perturbations autour de vous, signalez un problème en quelques secondes et suivez sa résolution sans perdre le fil.</p>
                <div className={styles.heroActions}>
                  <button className={styles.primaryButton} onClick={() => navigate("report")}><Plus size={18} /> Signaler un problème</button>
                  <button className={styles.secondaryButton} onClick={() => navigate("map")}><Map size={17} /> Voir la carte</button>
                </div>
              </div>

              <aside className={styles.heroSide}>
                <div className={styles.statusTop}>
                  <span className={styles.statusIcon}><Wifi size={22} /></span>
                  <span className={online ? styles.livePill : styles.offlinePill}>{online ? "● En ligne" : "Hors ligne"}</span>
                </div>
                <div>
                  <div className={styles.statusValue}>99,97 %</div>
                  <div className={styles.statusLabel}>Disponibilité globale des services</div>
                </div>
              </aside>
            </section>

            <section className={styles.sectionGrid}>
              <div className={styles.stack}>
                <article className={styles.card}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>Incident prioritaire</span>
                      <h2>Ce qui vous concerne maintenant</h2>
                    </div>
                    <span className={styles.warningPill}><TriangleAlert size={14} /> Dégradation</span>
                  </div>
                  <div className={styles.incidentCard}>
                    <div className={styles.incidentHeader}>
                      <span className={styles.eyebrow}>Réseau · Internet</span>
                      <span className={styles.livePill}>Analyse en cours</span>
                    </div>
                    <h3 className={styles.incidentTitle}>Connexion instable dans le Centre d’Ottawa</h3>
                    <p className={styles.incidentText}>Plusieurs signaux convergent vers une dégradation locale. Les équipes peuvent regrouper les signalements pour éviter les doublons et accélérer le diagnostic.</p>
                    <div className={styles.incidentMeta}>
                      <span><MapPin size={14} /> Centre d’Ottawa</span>
                      <span><Clock3 size={14} /> Mise à jour récente</span>
                      <span><Sparkles size={14} /> Corrélation assistée par IA</span>
                    </div>
                    <div className={styles.heroActions}>
                      <button className={styles.primaryButton} onClick={prefillIncidentReport}>Je suis aussi affecté</button>
                      <button className={styles.secondaryButton} onClick={() => navigate("track")}>Voir le suivi <ChevronRight size={16} /></button>
                    </div>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>État des services</span>
                      <h2>Comprendre en un coup d’œil</h2>
                    </div>
                    <span className={styles.livePill}><CheckCircle2 size={14} /> 3 stables</span>
                  </div>
                  <div className={styles.services}>
                    {serviceItems.map(service => (
                      <div className={styles.serviceRow} key={service.name}>
                        <div className={styles.serviceLeft}>
                          <span className={`${styles.serviceDot} ${service.warn ? styles.warn : ""}`} />
                          <span className={styles.serviceName}>{service.name}</span>
                        </div>
                        <span className={styles.serviceState}>{service.state}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <aside className={styles.stack}>
                <article className={styles.card}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>Carte du secteur</span>
                      <h2>Voir où ça se passe</h2>
                    </div>
                    <button className={styles.iconButton} aria-label="Ouvrir la carte" onClick={() => navigate("map")}><Navigation size={18} /></button>
                  </div>
                  <div className={styles.mapPreview} onClick={() => navigate("map")} role="button" tabIndex={0}>
                    <span className={styles.mapRiver} />
                    <span className={styles.mapRoad} />
                    <span className={styles.mapPin}><TriangleAlert size={17} /></span>
                    <span className={styles.mapPinSecondary}><MapPin size={14} /></span>
                    <span className={styles.mapLabel}>2 événements visibles · Centre d’Ottawa</span>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>Votre suivi</span>
                      <h2>{receipt ? "Dernier signalement reçu" : "Aucun signalement actif"}</h2>
                      <p>{receipt ? "Votre référence est enregistrée et prête à être suivie." : "Un signalement envoyé apparaîtra ici avec sa progression."}</p>
                    </div>
                  </div>
                  <button className={styles.secondaryButton} onClick={() => navigate(receipt ? "track" : "report")}>
                    {receipt ? "Ouvrir le suivi" : "Créer un signalement"} <ChevronRight size={16} />
                  </button>
                </article>
              </aside>
            </section>
          </>
        )}

        {tab === "map" && (
          <section className={styles.mapCard}>
            <span className={styles.eyebrow}><Compass size={15} /> Carte des services</span>
            <h1>Incidents et zones affectées</h1>
            <p>Une lecture simple de ce qui se passe autour de vous, avec les événements importants mis en avant.</p>
            <div className={styles.filterRow}>
              <button className={`${styles.filterChip} ${styles.filterChipActive}`}>Tous</button>
              <button className={styles.filterChip}>Internet</button>
              <button className={styles.filterChip}>Mobile</button>
              <button className={styles.filterChip}>Wi-Fi</button>
              <button className={styles.filterChip}>Résolus</button>
            </div>
            <div className={styles.mapLarge}>
              <span className={styles.mapRiver} />
              <span className={styles.mapRoad} />
              <span className={styles.mapPin}><TriangleAlert size={17} /></span>
              <span className={styles.mapPinSecondary}><MapPin size={14} /></span>
              <span className={styles.mapLabel}>Dégradation Internet · Centre d’Ottawa</span>
            </div>
          </section>
        )}

        {tab === "report" && (
          <section className={styles.reportPanel}>
            <div className={styles.reportHeader}>
              <div>
                <span className={styles.eyebrow}>Signalement citoyen</span>
                <h1>Expliquez le problème simplement.</h1>
                <p>Choisissez le service, parlez ou écrivez. Le signalement sera ensuite structuré côté service pour faciliter le traitement.</p>
              </div>
              <span className={styles.aiPill}><Sparkles size={14} /> Assisté par IA</span>
            </div>

            <div className={styles.categoryRow}>
              {(Object.keys(categoryLabels) as Category[]).map(item => (
                <button
                  key={item}
                  className={`${styles.categoryChip} ${category === item ? styles.categoryChipActive : ""}`}
                  onClick={() => setCategory(item)}
                >
                  {categoryLabels[item]}
                </button>
              ))}
            </div>

            <div className={styles.modeChooser}>
              <button className={`${styles.modeCard} ${inputMode === "text" ? styles.modeCardActive : ""}`} onClick={() => { setInputMode("text"); setReportState("ready"); }}>
                <span className={styles.modeIcon}><Send size={19} /></span>
                <span><span className={styles.modeTitle}>Écrire</span><span className={styles.modeHint}>Décrivez ce que vous observez avec vos mots.</span></span>
              </button>
              <button className={`${styles.modeCard} ${inputMode === "voice" ? styles.modeCardActive : ""}`} onClick={() => { setInputMode("voice"); setReportState("ready"); }}>
                <span className={styles.modeIcon}><Mic size={19} /></span>
                <span><span className={styles.modeTitle}>Parler</span><span className={styles.modeHint}>Dictez le problème puis relisez la transcription.</span></span>
              </button>
            </div>

            {inputMode === "text" && (
              <>
                <textarea
                  className={styles.textarea}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  placeholder="Ex. Depuis 10 minutes, ma connexion Internet coupe plusieurs fois et les pages chargent très lentement…"
                  disabled={reportState === "sending"}
                />
                <div className={styles.aiNote}><Sparkles size={17} /> <span>Après l’envoi, le moteur peut classer, résumer et corréler le signalement avec les incidents existants. Le texte reste visible avant confirmation.</span></div>
              </>
            )}

            {inputMode === "voice" && (
              <div className={styles.voiceBox}>
                <span className={`${styles.voiceOrb} ${reportState === "recording" ? styles.voiceOrbRecording : ""}`}>
                  {reportState === "transcribing" ? <LoaderCircle size={27} /> : reportState === "recording" ? <Square size={25} /> : <Mic size={28} />}
                </span>
                <strong>{reportState === "recording" ? "Enregistrement en cours" : reportState === "transcribing" ? "Transcription en cours" : "Dites ce qui se passe"}</strong>
                <p>{reportState === "recording" ? "Parlez naturellement, puis arrêtez l’enregistrement pour générer le texte." : "Votre voix est transformée en texte avant tout envoi afin que vous puissiez relire et corriger."}</p>
                {reportState === "recording" ? (
                  <button className={styles.voiceButton} onClick={stopVoiceRecording}><Square size={16} /> Arrêter</button>
                ) : (
                  <button className={styles.voiceButton} onClick={() => void startVoiceRecording()} disabled={reportState === "transcribing" || !online}><Mic size={17} /> Commencer à parler</button>
                )}
              </div>
            )}

            {reportState === "queued" && (
              <div className={`${styles.feedbackBox} ${styles.warn}`}><CloudOff size={19} /><div><strong>Signalement conservé hors ligne</strong><small>Il sera renvoyé automatiquement dès que la connexion revient.</small></div></div>
            )}

            {reportState === "error" && (
              <div className={`${styles.feedbackBox} ${styles.error}`}><TriangleAlert size={19} /><div><strong>Action non terminée</strong><small>{errorMessage ?? "Réessayez dans quelques instants."}</small></div></div>
            )}

            <div className={styles.submitBar}>
              <span className={styles.submitMeta}>Service : <strong>{categoryLabels[category]}</strong><br />Zone : Centre d’Ottawa</span>
              <button className={styles.submitButton} onClick={() => void submitReport()} disabled={message.trim().length < 3 || reportState === "sending" || reportState === "recording" || reportState === "transcribing"}>
                {reportState === "sending" ? <><LoaderCircle size={17} /> Envoi…</> : <><Send size={17} /> Envoyer le signalement</>}
              </button>
            </div>
          </section>
        )}

        {tab === "track" && (
          <section className={styles.trackPanel}>
            <span className={styles.eyebrow}>Suivi transparent</span>
            <h1>Du signalement à la résolution.</h1>
            <p>Chaque étape importante doit rester compréhensible pour le citoyen, sans jargon opérationnel inutile.</p>

            {receipt ? (
              <>
                <div className={styles.trackSummary}>
                  <div className={styles.metric}><span className={styles.metricValue}>Reçu</span><span className={styles.metricLabel}>État confirmé</span></div>
                  <div className={styles.metric}><span className={styles.metricValue}>Internet</span><span className={styles.metricLabel}>Service concerné</span></div>
                  <div className={styles.metric}><span className={styles.metricValue}>Ottawa</span><span className={styles.metricLabel}>Zone suivie</span></div>
                </div>
                <div className={styles.feedbackBox}><CheckCircle2 size={20} /><div><strong>Signalement enregistré</strong><small>Référence : <span className={styles.mono}>{receipt.reportId}</span></small></div></div>
                <div className={styles.timeline}>
                  <TimelineItem state="done" title="Signalé" detail="Votre signalement a été reçu par ServiceGraph." />
                  <TimelineItem state="current" title="Analyse et corrélation" detail="Étape de traitement suivante : vérifier s’il correspond à un incident déjà connu." />
                  <TimelineItem state="future" title="Équipe assignée" detail="Une équipe ou un service pourra être associé lorsque le traitement l’exige." />
                  <TimelineItem state="future" title="Intervention" detail="Les actions opérationnelles seront affichées lorsqu’elles seront disponibles." />
                  <TimelineItem state="future" title="Résolu" detail="La résolution finale clôturera le suivi citoyen." />
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <div>
                  <span className={styles.emptyIcon}><Clock3 size={27} /></span>
                  <h2>Aucun signalement à suivre</h2>
                  <p>Créez un signalement pour voir apparaître sa référence et sa progression ici.</p>
                  <button className={styles.primaryButton} onClick={() => navigate("report")}><Plus size={17} /> Signaler un problème</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "profile" && (
          <section className={styles.profilePanel}>
            <span className={styles.eyebrow}>Espace citoyen</span>
            <h1>Votre expérience ServiceGraph.</h1>
            <p>Les préférences, l’accessibilité et l’authentification doivent rester simples et compréhensibles.</p>
            <div className={styles.profileCard}>
              <div className={styles.profileRow}><span><CircleUserRound size={18} /> Compte citoyen</span><small>Mode invité</small></div>
              <div className={styles.profileRow}><span><Bell size={18} /> Notifications</span><small>Activables</small></div>
              <div className={styles.profileRow}><span><ShieldCheck size={18} /> Confidentialité</span><small>Contrôles visibles</small></div>
              <div className={styles.profileRow}><span><Wifi size={18} /> Fonctionnement hors ligne</span><small>{online ? "Connexion disponible" : "Actif"}</small></div>
            </div>
          </section>
        )}
      </div>

      <nav className={styles.bottomNav} aria-label="Navigation citoyenne">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.navButton} ${active ? styles.navActive : ""} ${item.id === "report" ? styles.reportNav : ""}`}
              onClick={() => navigate(item.id)}
              aria-current={active ? "page" : undefined}
            >
              {item.id === "report" ? <span className={styles.navIconWrap}><Plus size={19} /></span> : <Icon size={19} />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

function TimelineItem({ state, title, detail }: { state: "done" | "current" | "future"; title: string; detail: string }) {
  const dotClass = state === "done" ? styles.timelineDone : state === "current" ? styles.timelineCurrent : "";
  return (
    <div className={styles.timelineRow}>
      <span className={`${styles.timelineDot} ${dotClass}`}>{state === "done" ? <CheckCircle2 size={17} /> : state === "current" ? <Activity size={16} /> : <span>•</span>}</span>
      <div className={styles.timelineCopy}><strong>{title}</strong><small>{detail}</small></div>
    </div>
  );
}

function preferredRecordingType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find(type => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
}
