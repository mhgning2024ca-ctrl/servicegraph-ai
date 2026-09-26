"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "fr" | "en";

const dictionary = {
  en: {
    tagline: "From complaint to root cause to safe resolution.",
    openOps: "Open operations center",
    openCitizen: "Open citizen portal",
    heroEyebrow: "AI-assisted service operations",
    heroTitleA: "Turn fragmented symptoms into",
    heroTitleB: "one explainable incident.",
    heroBody: "ServiceGraph correlates customer reports with live infrastructure telemetry, identifies probable root causes and keeps sensitive remediation under human control.",
    overview: "Overview",
    incidents: "Incidents",
    network: "Network",
    reports: "Reports",
    analytics: "Analytics",
    audit: "Audit",
    live: "Live",
    commandCenter: "Operations Command Center",
    globalHealth: "Global service health",
    operational: "Operational",
    activeIncidents: "Active incidents",
    affectedUsers: "Affected users",
    medianTriage: "Median triage",
    topology: "Network topology",
    liveStream: "Live incident stream",
    attention: "Requires attention",
    confidence: "confidence",
    incidentTitle: "Intermittent connectivity — Ottawa Centre",
    detected: "Detected 14 minutes ago",
    causalGraph: "Causal evidence graph",
    aiInvestigation: "AI investigation",
    probableCause: "Probable root cause",
    rationale: "37 reports overlap with packet-loss and latency anomalies on NODE-17 across the same service area.",
    supportingEvidence: "Supporting evidence",
    relatedReports: "37 related reports",
    packetLossEvidence: "Packet loss rose from 1% to 21%",
    topologyEvidence: "3 affected services depend on NODE-17",
    remediation: "Controlled remediation",
    action: "Simulate traffic reroute",
    risk: "Medium risk",
    expectedEffect: "Expected to restore service for ~1,284 users",
    approve: "Approve simulated reroute",
    reject: "Reject proposal",
    timeline: "Incident timeline",
    serviceStatus: "Your service",
    reportProblem: "Report a problem",
    reportHint: "Tell us what you are experiencing. We will connect your report to a known incident when possible.",
    speak: "Speak",
    type: "Type",
    quick: "Quick diagnostic",
    nearby: "Nearby service incident",
    degradation: "Internet degradation",
    investigating: "Investigating",
    affectedToo: "I'm affected too",
    location: "Ottawa Centre",
    sendReport: "Send report",
    placeholder: "Describe what is happening…",
    received: "Report received",
    receipt: "Reference CMP-10042",
    status: "Status",
    report: "Report",
    activity: "Activity",
    profile: "Profile",
    humanAuthorization: "Human authorization",
    liveTelemetry: "Live telemetry",
    evidenceCorrelation: "Evidence correlation",
    customerReports: "Customer reports",
    telemetry: "Telemetry",
    topologySource: "Topology",
    probableRootCause: "Probable root cause",
    humanApprovedAction: "Human-approved action",
    voiceIntakeTitle: "ElevenLabs voice intake",
    voiceIntakeBody: "Ready for provider integration. Text fallback remains available.",
    critical: "Critical",
    incidentManager: "Incident Manager",
    closeMenu: "Close menu",
    closeNavigation: "Close navigation",
    openNavigation: "Open navigation",
    latest: "Latest",
    packetLoss: "Packet loss",
    latency: "Latency",
    demoScenarioWindow: "Demo scenario window",
    reportsLabel: "reports",
    servicesLabel: "services",
    telemetryLabel: "Telemetry",
    blastRadius: "Blast radius",
    target: "Target",
    expectedEffectLabel: "Expected effect",
    approvedAwaiting: "Approved — awaiting simulator execution",
    approvalBody: "You are approving proposal v1 for the deterministic network simulator. No real carrier equipment is controlled.",
    cancel: "Cancel",
    detectedStage: "Detected",
    investigatedStage: "Investigated",
    proposalStage: "Proposal",
    approvedStage: "Approved",
    remediatingStage: "Remediating",
    verifyingStage: "Verifying",
    resolvedStage: "Resolved",
    major: "Major",
    minor: "Minor",
    riskLabel: "Risk",
    rootCauseDetail: "Packet-loss / latency degradation",
    latencyChartLabel: "Latency rises from normal to degraded",
    activityTitle: "Recent activity",
    activityEmpty: "Your submitted reports and status updates will appear here.",
    profileTitle: "Profile",
    profileBody: "Manage your language and account preferences.",
    affectedConfirmed: "Impact confirmed",
    backToStatus: "Back to status",
    loading: "Loading ServiceGraph…",
    errorTitle: "Something went wrong",
    errorBody: "This view could not be loaded. Your current incident data has not been modified.",
    retryView: "Retry",
    queuedOffline: "Saved offline",
    queuedOfflineBody: "Your report is stored on this device and will be retried when connectivity returns."
  },
  fr: {
    tagline: "Du signalement à la cause racine, jusqu’à une résolution sécurisée.",
    openOps: "Ouvrir le centre d’opérations",
    openCitizen: "Ouvrir le portail citoyen",
    heroEyebrow: "Opérations de service assistées par IA",
    heroTitleA: "Transformer des symptômes dispersés en",
    heroTitleB: "un incident explicable.",
    heroBody: "ServiceGraph corrèle les signalements avec la télémétrie d’infrastructure, identifie les causes racines probables et maintient les actions sensibles sous contrôle humain.",
    overview: "Vue d’ensemble",
    incidents: "Incidents",
    network: "Réseau",
    reports: "Signalements",
    analytics: "Analytique",
    audit: "Audit",
    live: "En direct",
    commandCenter: "Centre de commande des opérations",
    globalHealth: "Santé globale du service",
    operational: "Opérationnel",
    activeIncidents: "Incidents actifs",
    affectedUsers: "Utilisateurs affectés",
    medianTriage: "Triage médian",
    topology: "Topologie réseau",
    liveStream: "Flux d’incidents en direct",
    attention: "Attention requise",
    confidence: "de confiance",
    incidentTitle: "Connectivité intermittente — Centre d’Ottawa",
    detected: "Détecté il y a 14 minutes",
    causalGraph: "Graphe causal des preuves",
    aiInvestigation: "Investigation IA",
    probableCause: "Cause racine probable",
    rationale: "37 signalements coïncident avec des anomalies de perte de paquets et de latence sur NODE-17 dans la même zone de service.",
    supportingEvidence: "Preuves à l’appui",
    relatedReports: "37 signalements liés",
    packetLossEvidence: "Perte de paquets passée de 1 % à 21 %",
    topologyEvidence: "3 services affectés dépendent de NODE-17",
    remediation: "Remédiation contrôlée",
    action: "Simuler le reroutage du trafic",
    risk: "Risque moyen",
    expectedEffect: "Devrait rétablir le service pour ~1 284 utilisateurs",
    approve: "Approuver le reroutage simulé",
    reject: "Rejeter la proposition",
    timeline: "Chronologie de l’incident",
    serviceStatus: "Votre service",
    reportProblem: "Signaler un problème",
    reportHint: "Décrivez ce que vous observez. Nous relierons votre signalement à un incident connu lorsque c’est possible.",
    speak: "Parler",
    type: "Écrire",
    quick: "Diagnostic rapide",
    nearby: "Incident de service à proximité",
    degradation: "Dégradation Internet",
    investigating: "En investigation",
    affectedToo: "Je suis aussi affecté",
    location: "Centre d’Ottawa",
    sendReport: "Envoyer le signalement",
    placeholder: "Décrivez ce qui se passe…",
    received: "Signalement reçu",
    receipt: "Référence CMP-10042",
    status: "État",
    report: "Signaler",
    activity: "Activité",
    profile: "Profil",
    humanAuthorization: "Autorisation humaine",
    liveTelemetry: "Télémétrie en direct",
    evidenceCorrelation: "Corrélation des preuves",
    customerReports: "Signalements clients",
    telemetry: "Télémétrie",
    topologySource: "Topologie",
    probableRootCause: "Cause racine probable",
    humanApprovedAction: "Action approuvée par un humain",
    voiceIntakeTitle: "Entrée vocale ElevenLabs",
    voiceIntakeBody: "Prête pour l’intégration du fournisseur. Le texte reste disponible en solution de repli.",
    critical: "Critique",
    incidentManager: "Gestionnaire d’incident",
    closeMenu: "Fermer le menu",
    closeNavigation: "Fermer la navigation",
    openNavigation: "Ouvrir la navigation",
    latest: "Dernier signal",
    packetLoss: "Perte de paquets",
    latency: "Latence",
    demoScenarioWindow: "Fenêtre du scénario de démonstration",
    reportsLabel: "signalements",
    servicesLabel: "services",
    telemetryLabel: "Télémétrie",
    blastRadius: "Rayon d’impact",
    target: "Cible",
    expectedEffectLabel: "Effet attendu",
    approvedAwaiting: "Approuvé — en attente d’exécution du simulateur",
    approvalBody: "Vous approuvez la proposition v1 pour le simulateur réseau déterministe. Aucun équipement réel d’opérateur n’est contrôlé.",
    cancel: "Annuler",
    detectedStage: "Détecté",
    investigatedStage: "Investigé",
    proposalStage: "Proposition",
    approvedStage: "Approuvé",
    remediatingStage: "Remédiation",
    verifyingStage: "Vérification",
    resolvedStage: "Résolu",
    major: "Majeur",
    minor: "Mineur",
    riskLabel: "Risque",
    rootCauseDetail: "Dégradation de perte de paquets et de latence",
    latencyChartLabel: "La latence passe d’un niveau normal à un niveau dégradé",
    activityTitle: "Activité récente",
    activityEmpty: "Vos signalements et mises à jour d’état apparaîtront ici.",
    profileTitle: "Profil",
    profileBody: "Gérez votre langue et vos préférences de compte.",
    affectedConfirmed: "Impact confirmé",
    backToStatus: "Retour à l’état du service",
    loading: "Chargement de ServiceGraph…",
    errorTitle: "Une erreur est survenue",
    errorBody: "Cette vue n’a pas pu être chargée. Les données actuelles de l’incident n’ont pas été modifiées.",
    retryView: "Réessayer",
    queuedOffline: "Enregistré hors ligne",
    queuedOfflineBody: "Votre signalement est conservé sur cet appareil et sera retenté au retour de la connexion."
  }
} as const;

type Keys = keyof typeof dictionary.en;
type ContextValue = { locale: Locale; setLocale: (value: Locale) => void; t: (key: Keys) => string };

const LocaleContext = createContext<ContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("servicegraph.locale");
    const initial: Locale = saved === "fr" || saved === "en"
      ? saved
      : navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLocale = (value: Locale) => {
    setLocaleState(value);
    window.localStorage.setItem("servicegraph.locale", value);
    document.documentElement.lang = value;
  };

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key: Keys) => dictionary[locale][key]
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="language-toggle" aria-label="Language / Langue">
      <button type="button" className={locale === "fr" ? "active" : ""} onClick={() => setLocale("fr")} aria-pressed={locale === "fr"}>FR</button>
      <span>|</span>
      <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} aria-pressed={locale === "en"}>EN</button>
    </div>
  );
}
