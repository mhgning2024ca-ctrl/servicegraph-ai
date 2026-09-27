"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Bus,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CloudOff,
  Droplets,
  Home,
  LoaderCircle,
  Map,
  MapPin,
  Mic,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  TriangleAlert,
  Type,
  UserRound,
  Wifi,
  Zap,
} from "lucide-react";

import {
  ApiClientError,
  createCitizenReport,
  getPublicConfig,
  listPublicIncidents,
  transcribeVoiceReport,
} from "@/lib/api";
import { enqueueReport, flushReportQueue, getQueuedReports } from "@/lib/report-queue";
import type {
  CreateReportRequest,
  CreateReportResponse,
  PublicIncident,
} from "../../../../packages/contracts/dist/index.js";
import styles from "./citizen-v3.module.css";

type Tab = "home" | "map" | "report" | "track" | "profile";
type ServiceCategory = "internet" | "electricity" | "water" | "transport";
type InputMode = "text" | "voice";
type RuntimeState = "loading" | "live" | "error";
type ReportState =
  | "ready"
  | "recording"
  | "transcribing"
  | "sending"
  | "sent"
  | "queued"
  | "error";

type Receipt = CreateReportResponse["receipt"];

const MAX_AUDIO_BYTES = 1_000_000;
const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

const SERVICES: Array<{
  id: ServiceCategory;
  label: string;
  icon: typeof Wifi;
  hint: string;
}> = [
  { id: "internet", label: "Internet & connectivité", icon: Wifi, hint: "Connexion, réseau mobile, Wi-Fi" },
  { id: "electricity", label: "Électricité", icon: Zap, hint: "Coupure, tension, équipement" },
  { id: "water", label: "Eau", icon: Droplets, hint: "Pression, interruption, fuite" },
  { id: "transport", label: "Transport", icon: Bus, hint: "Ligne, station, service perturbé" },
];

const NAV_ITEMS: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "map", label: "Carte", icon: Map },
  { id: "report", label: "Signaler", icon: Plus },
  { id: "track", label: "Suivi", icon: Clock3 },
  { id: "profile", label: "Profil", icon: UserRound },
];

export default function CitizenPage() {
  const [tab, setTab] = useState<Tab>("home");
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("loading");
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [online, setOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);

  const [service, setService] = useState<ServiceCategory>("internet");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [message, setMessage] = useState("");
  const [reportState, setReportState] = useState<ReportState>("ready");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportChannel, setReportChannel] = useState<"WEB_TEXT" | "WEB_VOICE">("WEB_TEXT");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const activeIncidents = useMemo(
    () => incidents.filter(incident => !["RESOLVED", "CLOSED"].includes(incident.status)),
    [incidents],
  );

  const criticalCount = useMemo(
    () => activeIncidents.filter(incident => incident.severity === "CRITICAL" || incident.severity === "MAJOR").length,
    [activeIncidents],
  );

  const domainCounts = useMemo(() => {
    const counts: Record<ServiceCategory, number> = {
      internet: 0,
      electricity: 0,
      water: 0,
      transport: 0,
    };
    activeIncidents.forEach(incident => {
      counts[detectServiceDomain(incident.title)] += 1;
    });
    return counts;
  }, [activeIncidents]);

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
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
    // Runtime hydration only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPublicData() {
    setRuntimeState("loading");
    try {
      const [config, response] = await Promise.all([getPublicConfig(), listPublicIncidents()]);
      setVoiceAvailable(config.features.elevenLabs);
      setIncidents(response.incidents);
      setRuntimeState("live");
    } catch {
      setVoiceAvailable(false);
      setIncidents([]);
      setRuntimeState("error");
    }
  }

  function navigate(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openReport(category?: ServiceCategory, prefill?: string) {
    if (category) setService(category);
    if (prefill) setMessage(prefill);
    setInputMode("text");
    setReportChannel("WEB_TEXT");
    setReportState("ready");
    setErrorMessage(null);
    navigate("report");
  }

  function buildReport(): CreateReportRequest {
    const prefix = SERVICES.find(item => item.id === service)?.label ?? "Service";
    return {
      clientReportId: crypto.randomUUID(),
      channel: reportChannel,
      text: `[${prefix}] ${message.trim()}`,
      serviceId: null,
      areaCode: activeIncidents[0]?.affectedAreaCodes[0] ?? "OTT-CENTRETOWN",
      latitude: null,
      longitude: null,
      sourceLanguage: "fr",
    };
  }

  async function submitReport() {
    if (message.trim().length < 3 || reportState === "sending") return;

    const payload = buildReport();
    const idempotencyKey = crypto.randomUUID();
    setReportState("sending");
    setErrorMessage(null);

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

    if (!voiceAvailable) {
      setErrorMessage("La transcription vocale n’est pas disponible sur cet environnement.");
      setReportState("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage("L’enregistrement vocal n’est pas pris en charge par ce navigateur.");
      setReportState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = AUDIO_TYPES.find(type => MediaRecorder.isTypeSupported(type));
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
      setReportState("recording");
    } catch {
      setErrorMessage("Autorisez l’accès au microphone pour utiliser le signalement vocal.");
      setReportState("error");
    }
  }

  function stopVoiceRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function transcribe(audio: Blob) {
    if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
      setErrorMessage("L’enregistrement est vide ou trop volumineux.");
      setReportState("error");
      return;
    }

    setReportState("transcribing");
    try {
      const transcription = await transcribeVoiceReport(audio, "fr");
      setMessage(transcription.text);
      setInputMode("text");
      setReportChannel("WEB_VOICE");
      setReportState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "La transcription vocale a échoué.");
      setReportState("error");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark}><Activity size={22} /></span>
            <div>
              <strong>ServiceGraph IA</strong>
              <small>Signalement, corrélation et suivi des services</small>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /></button>
            <button className={styles.iconButton} aria-label="Profil" onClick={() => navigate("profile")}><CircleUserRound size={20} /></button>
          </div>
        </header>

        <div className={styles.runtimeBar} data-state={runtimeState} role="status">
          {runtimeState === "loading" && <><LoaderCircle size={14} /> Chargement de l’état des services…</>}
          {runtimeState === "live" && <><CheckCircle2 size={14} /> Données publiques connectées</>}
          {runtimeState === "error" && <><TriangleAlert size={14} /> État public indisponible <button className={styles.linkButton} onClick={() => void loadPublicData()}><RefreshCcw size={13} /> Réessayer</button></>}
        </div>

        {!online && (
          <div className={styles.runtimeBar} data-state="error" role="status">
            <CloudOff size={14} /> Hors ligne — les signalements peuvent être conservés localement.
          </div>
        )}

        {queuedCount > 0 && (
          <div className={styles.queueBar}>
            {queuedCount} signalement{queuedCount > 1 ? "s" : ""} en attente.
            {online && <button className={styles.linkButton} onClick={() => void retryQueuedReports()}><RefreshCcw size={13} /> Renvoyer</button>}
          </div>
        )}

        {tab === "home" && (
          <>
            <section className={styles.hero}>
              <div className={styles.heroMain}>
                <span className={styles.kicker}><ShieldCheck size={15} /> Services essentiels · Vue citoyenne</span>
                <h1 className={styles.heroTitle}>Signalez. Comprenez. Suivez la résolution.</h1>
                <p className={styles.heroText}>
                  ServiceGraph IA centralise les problèmes rencontrés par les clients et citoyens, cherche les relations entre les signalements,
                  identifie les services ou ressources potentiellement affectés et facilite le travail des équipes jusqu’à la résolution.
                </p>
                <div className={styles.actions}>
                  <button className={styles.primary} onClick={() => openReport()}><Plus size={18} /> Signaler un problème</button>
                  <button className={styles.secondary} onClick={() => navigate("map")}><Map size={17} /> Voir les incidents</button>
                </div>
              </div>

              <aside className={styles.heroStatus}>
                <div className={styles.healthRow}>
                  <span className={`${styles.healthIcon} ${criticalCount > 0 ? styles.alert : ""}`}>
                    {criticalCount > 0 ? <TriangleAlert size={22} /> : <CheckCircle2 size={22} />}
                  </span>
                  <span className={criticalCount > 0 ? styles.alertPill : styles.pill}>
                    {runtimeState === "live" ? (criticalCount > 0 ? `${criticalCount} incident(s) prioritaire(s)` : "Aucune alerte critique") : "État à confirmer"}
                  </span>
                </div>
                <div>
                  <span className={styles.healthValue}>{runtimeState === "live" ? activeIncidents.length : "—"}</span>
                  <span className={styles.healthLabel}>incident(s) actif(s) actuellement visibles dans le portail public</span>
                </div>
              </aside>
            </section>

            <section className={styles.grid}>
              <div className={styles.stack}>
                <article className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.kicker}>Domaines couverts</span>
                      <h2>Un même moteur, plusieurs services</h2>
                      <p>Le réseau est un cas d’usage, pas la limite du produit.</p>
                    </div>
                  </div>

                  <div className={styles.domainGrid}>
                    {SERVICES.map(item => {
                      const Icon = item.icon;
                      const count = domainCounts[item.id];
                      return (
                        <button className={styles.domainCard} key={item.id} onClick={() => openReport(item.id)} type="button">
                          <div className={styles.domainTop}>
                            <span className={styles.domainIcon}><Icon size={20} /></span>
                            <ChevronRight size={16} />
                          </div>
                          <span className={styles.domainName}>{item.label}</span>
                          <span className={styles.domainState}>
                            {runtimeState === "live" ? (count > 0 ? `${count} incident(s) actif(s)` : "Aucun incident public connu") : item.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.kicker}>Incidents publics</span>
                      <h2>Ce qui peut vous concerner</h2>
                      <p>Les signalements ne sont pas supposés avoir la même cause : ils sont regroupés seulement lorsque des éléments concordent.</p>
                    </div>
                    {activeIncidents.length > 0 && <span className={styles.alertPill}><TriangleAlert size={14} /> {activeIncidents.length} actif(s)</span>}
                  </div>

                  {activeIncidents.length > 0 ? (
                    <div className={styles.incidentList}>
                      {activeIncidents.slice(0, 4).map(incident => (
                        <button
                          key={incident.id}
                          className={styles.incidentRow}
                          onClick={() => navigate("map")}
                          type="button"
                        >
                          <span className={styles.incidentIcon}><TriangleAlert size={19} /></span>
                          <span className={styles.incidentCopy}>
                            <strong>{incident.title}</strong>
                            <small><MapPin size={13} /> {incident.affectedAreaCodes[0] ?? "Zone à confirmer"} · {formatStatus(incident.status)}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}>
                      <div>
                        <strong>{runtimeState === "live" ? "Aucun incident public actif" : "Les incidents ne sont pas disponibles"}</strong>
                        <span>{runtimeState === "live" ? "Vous pouvez tout de même signaler un problème observé." : "Réessayez lorsque le service public répond."}</span>
                      </div>
                    </div>
                  )}
                </article>
              </div>

              <aside className={styles.stack}>
                <article className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.kicker}>Carte des services</span>
                      <h2>Voir les zones concernées</h2>
                    </div>
                    <button className={styles.iconButton} onClick={() => navigate("map")} aria-label="Ouvrir la carte"><Map size={18} /></button>
                  </div>
                  <div className={styles.mapPreview} role="button" tabIndex={0} onClick={() => navigate("map")}>
                    <span className={styles.mapRiver} />
                    <span className={styles.mapRoad} />
                    <span className={styles.mapPin}><TriangleAlert size={16} /></span>
                    <span className={styles.mapPin2}><MapPin size={15} /></span>
                    <span className={styles.mapPin3}><MapPin size={15} /></span>
                    <div className={styles.mapCaption}>
                      <span>Internet</span><span>Électricité</span><span>Eau</span><span>Transport</span>
                    </div>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.kicker}>Mon suivi</span>
                      <h2>{receipt ? "Dernier signalement reçu" : "Rien à suivre pour le moment"}</h2>
                      <p>{receipt ? "Votre référence a été créée. Ouvrez le suivi pour voir la progression." : "Un signalement envoyé depuis cette session apparaîtra ici."}</p>
                    </div>
                  </div>
                  <button className={styles.secondary} onClick={() => navigate(receipt ? "track" : "report")}>
                    {receipt ? "Ouvrir le suivi" : "Créer un signalement"} <ChevronRight size={16} />
                  </button>
                </article>
              </aside>
            </section>
          </>
        )}

        {tab === "map" && (
          <section className={styles.panel}>
            <span className={styles.kicker}><Map size={15} /> Carte des services</span>
            <h1>Incidents et zones affectées</h1>
            <p>Cette vue regroupe les incidents publics par zone sans supposer qu’ils partagent la même cause.</p>

            <div className={styles.mapLarge}>
              <span className={styles.mapRiver} />
              <span className={styles.mapRoad} />
              <span className={styles.mapPin}><TriangleAlert size={16} /></span>
              <span className={styles.mapPin2}><MapPin size={15} /></span>
              <span className={styles.mapPin3}><MapPin size={15} /></span>
              <div className={styles.mapCaption}>
                {activeIncidents.length
                  ? activeIncidents.slice(0, 3).map(incident => <span key={incident.id}>{incident.title}</span>)
                  : <span>Aucun incident public actif à afficher</span>}
              </div>
            </div>
          </section>
        )}

        {tab === "report" && (
          <section className={styles.panel}>
            <div className={styles.reportIntro}>
              <div>
                <span className={styles.kicker}>Nouveau signalement</span>
                <h1>Expliquez ce que vous observez.</h1>
                <p>Choisissez le service concerné, puis écrivez ou parlez. Le système structure ensuite le signalement pour faciliter le traitement.</p>
              </div>
              <span className={styles.aiPill}><Sparkles size={14} /> Analyse assistée</span>
            </div>

            <div className={styles.serviceChooser}>
              {SERVICES.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`${styles.serviceChoice} ${service === item.id ? styles.active : ""}`}
                    onClick={() => setService(item.id)}
                    type="button"
                  >
                    <Icon size={21} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.inputModes}>
              <button
                className={`${styles.modeButton} ${inputMode === "text" ? styles.active : ""}`}
                onClick={() => { setInputMode("text"); setReportChannel("WEB_TEXT"); setReportState("ready"); }}
                type="button"
              >
                <Type size={21} />
                <span><strong>Écrire</strong><small>Décrivez le problème avec vos mots.</small></span>
              </button>
              <button
                className={`${styles.modeButton} ${inputMode === "voice" ? styles.active : ""}`}
                onClick={() => { setInputMode("voice"); setReportState("ready"); }}
                type="button"
              >
                <Mic size={21} />
                <span><strong>Parler</strong><small>Enregistrez puis relisez la transcription.</small></span>
              </button>
            </div>

            {inputMode === "text" ? (
              <textarea
                className={styles.textarea}
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder="Ex. Depuis environ dix minutes, le service est interrompu dans mon secteur…"
                disabled={reportState === "sending"}
              />
            ) : (
              <div className={styles.voiceBox}>
                <span className={styles.voiceOrb}>
                  {reportState === "recording" ? <Square size={26} /> : reportState === "transcribing" ? <LoaderCircle size={27} /> : <Mic size={28} />}
                </span>
                <strong>{reportState === "recording" ? "Enregistrement en cours" : reportState === "transcribing" ? "Transcription en cours" : "Dites ce qui se passe"}</strong>
                <p>La voix est transformée en texte avant l’envoi. Vous pouvez relire et corriger le résultat.</p>
                {reportState === "recording" ? (
                  <button className={styles.voiceButton} onClick={stopVoiceRecording}><Square size={16} /> Arrêter</button>
                ) : (
                  <button className={styles.voiceButton} onClick={() => void startVoiceRecording()} disabled={reportState === "transcribing"}><Mic size={17} /> Commencer</button>
                )}
              </div>
            )}

            {reportState === "queued" && (
              <div className={`${styles.feedback} ${styles.warn}`}>
                <CloudOff size={19} />
                <div><strong>Signalement conservé hors ligne</strong><small>Il sera renvoyé lorsque la connexion reviendra.</small></div>
              </div>
            )}

            {reportState === "error" && (
              <div className={`${styles.feedback} ${styles.error}`}>
                <TriangleAlert size={19} />
                <div><strong>Le signalement n’a pas été envoyé</strong><small>{errorMessage ?? "Réessayez dans quelques instants."}</small></div>
              </div>
            )}

            <div className={styles.submitBar}>
              <span className={styles.submitMeta}>
                Service : <strong>{SERVICES.find(item => item.id === service)?.label}</strong><br />
                Zone de démonstration : Ottawa–Gatineau
              </span>
              <button
                className={styles.submitButton}
                onClick={() => void submitReport()}
                disabled={message.trim().length < 3 || reportState === "sending" || reportState === "recording" || reportState === "transcribing"}
              >
                {reportState === "sending" ? <><LoaderCircle size={17} /> Envoi…</> : <><Send size={17} /> Envoyer le signalement</>}
              </button>
            </div>
          </section>
        )}

        {tab === "track" && (
          <section className={styles.panel}>
            <span className={styles.kicker}>Suivi citoyen</span>
            <h1>Du signalement à la résolution.</h1>
            <p>Le citoyen doit voir les étapes importantes sans avoir besoin de comprendre le fonctionnement interne de l’organisation.</p>

            {receipt ? (
              <>
                <div className={styles.trackSummary}>
                  <div className={styles.metric}><strong>Reçu</strong><small>État actuel</small></div>
                  <div className={styles.metric}><strong>{SERVICES.find(item => item.id === service)?.label}</strong><small>Service signalé</small></div>
                  <div className={styles.metric}><strong>Ottawa–Gatineau</strong><small>Zone suivie</small></div>
                </div>

                <div className={styles.feedback}>
                  <CheckCircle2 size={20} />
                  <div><strong>Signalement enregistré</strong><small>Référence : {receipt.reportId}</small></div>
                </div>

                <div className={styles.timeline}>
                  <TimelineItem state="done" title="Signalement reçu" detail="Votre problème a été enregistré." />
                  <TimelineItem state="current" title="Analyse des relations" detail="Le système vérifie s’il existe des signalements ou incidents liés." />
                  <TimelineItem state="future" title="Diagnostic" detail="Les équipes examinent les services, zones ou ressources susceptibles d’être affectés." />
                  <TimelineItem state="future" title="Intervention" detail="Une action est préparée lorsque le diagnostic le justifie." />
                  <TimelineItem state="future" title="Résolution vérifiée" detail="Le suivi est clôturé lorsque le rétablissement est confirmé." />
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <div>
                  <strong>Aucun signalement à suivre</strong>
                  <span>Créez un signalement pour voir sa progression ici.</span>
                  <div className={styles.actions}><button className={styles.primary} onClick={() => navigate("report")}><Plus size={17} /> Signaler un problème</button></div>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "profile" && (
          <section className={styles.panel}>
            <span className={styles.kicker}>Espace citoyen</span>
            <h1>Préférences et accès.</h1>
            <p>La plateforme reste utilisable en mode public, avec authentification lorsque l’organisation active un espace personnel.</p>

            <div className={styles.profileGrid}>
              <div className={styles.profileRow}><span><CircleUserRound size={18} /> Compte</span><small>Mode invité</small></div>
              <div className={styles.profileRow}><span><Bell size={18} /> Notifications</span><small>À configurer</small></div>
              <div className={styles.profileRow}><span><ShieldCheck size={18} /> Confidentialité</span><small>Contrôles visibles</small></div>
              <div className={styles.profileRow}><span><CloudOff size={18} /> Hors ligne</span><small>{online ? "Connexion disponible" : "Actif"}</small></div>
            </div>
          </section>
        )}
      </div>

      <nav className={styles.bottomNav} aria-label="Navigation citoyenne">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.navButton} ${active ? styles.active : ""} ${item.id === "report" ? styles.reportNav : ""}`}
              onClick={() => navigate(item.id)}
              aria-current={active ? "page" : undefined}
              type="button"
            >
              {item.id === "report"
                ? <span className={styles.reportIcon}><Plus size={19} /></span>
                : <Icon size={19} />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

function TimelineItem({
  state,
  title,
  detail,
}: {
  state: "done" | "current" | "future";
  title: string;
  detail: string;
}) {
  return (
    <div className={styles.timelineItem}>
      <span className={`${styles.timelineDot} ${state === "done" ? styles.done : state === "current" ? styles.current : ""}`}>
        {state === "done" ? <CheckCircle2 size={17} /> : state === "current" ? <Activity size={16} /> : "•"}
      </span>
      <div className={styles.timelineCopy}><strong>{title}</strong><small>{detail}</small></div>
    </div>
  );
}

function detectServiceDomain(title: string): ServiceCategory {
  const value = title.toLowerCase();
  if (value.includes("élect") || value.includes("power") || value.includes("outage")) return "electricity";
  if (value.includes("eau") || value.includes("water") || value.includes("pression")) return "water";
  if (value.includes("transport") || value.includes("bus") || value.includes("train") || value.includes("station")) return "transport";
  return "internet";
}

function formatStatus(status: PublicIncident["status"]) {
  const labels: Record<PublicIncident["status"], string> = {
    DETECTED: "Détecté",
    INVESTIGATING: "En analyse",
    CONFIRMED: "Confirmé",
    REMEDIATION_PROPOSED: "Solution proposée",
    AWAITING_APPROVAL: "Validation requise",
    REJECTED: "Rejeté",
    REMEDIATING: "Intervention en cours",
    VERIFYING: "Vérification",
    RESOLVED: "Résolu",
    CLOSED: "Fermé",
  };
  return labels[status];
}
