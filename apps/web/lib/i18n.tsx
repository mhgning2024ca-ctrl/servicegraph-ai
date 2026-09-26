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
    receipt: "The API confirmed your report.",
    status: "Status",
    report: "Report",
    activity: "Activity",
    profile: "Profile",
    critical: "Critical",
    voiceIntake: "Voice report",
    voiceUnavailable: "Voice intake is not available yet. No audio has been sent. Use the text path while the secure server-side transcription route is unavailable.",
    sendingReport: "Sending report…",
    reportError: "The report could not be sent. Nothing has been marked as received.",
    retry: "Retry",
    reportReference: "Report ID",
    apiUnavailable: "ServiceGraph API unavailable",
    loadingIncident: "Loading incident from the ServiceGraph API…",
    incidentUnavailable: "Live incident data is unavailable.",
    authenticationRequired: "Operator authentication is required for this action.",
    contractMismatch: "The API response does not match the frozen contract.",
    target: "Target",
    expectedEffectLabel: "Expected effect",
    telemetry: "Telemetry",
    latency: "Latency",
    packetLoss: "Packet loss",
    blastRadius: "Blast radius",
    reportsLabel: "reports",
    servicesLabel: "services",
    approvedAwaitingExecution: "Approval confirmed by the backend — awaiting simulator execution",
    approvalDialogText: "You are approving this simulator proposal. No real carrier equipment is controlled.",
    cancel: "Cancel",
    close: "Close",
    operationFailed: "The operation failed. The interface has not assumed success.",
    refresh: "Refresh",
    liveData: "Live API data",
    demoSnapshot: "Deterministic demo snapshot",
    execution: "Execute remediation",
    verification: "Verify recovery",
    signIn: "Sign in with Auth0",
    runAnalysis: "Run incident analysis",
    analysisQueued: "Analysis accepted by the backend",
    createProposal: "Create controlled remediation proposal",
    proposalCreated: "Remediation proposal confirmed by the backend",
    backendConfirmed: "Operation confirmed by the backend",
    publishRecovery: "Publish verified recovery update",
    communicationCreated: "Recovery communication confirmed by the backend"
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
    receipt: "L’API a confirmé votre signalement.",
    status: "État",
    report: "Signaler",
    activity: "Activité",
    profile: "Profil",
    critical: "Critique",
    voiceIntake: "Signalement vocal",
    voiceUnavailable: "Le signalement vocal n’est pas encore disponible. Aucun audio n’a été envoyé. Utilisez le texte tant que la route sécurisée de transcription côté serveur n’est pas disponible.",
    sendingReport: "Envoi du signalement…",
    reportError: "Le signalement n’a pas pu être envoyé. Rien n’a été présenté comme reçu.",
    retry: "Réessayer",
    reportReference: "ID du signalement",
    apiUnavailable: "API ServiceGraph indisponible",
    loadingIncident: "Chargement de l’incident depuis l’API ServiceGraph…",
    incidentUnavailable: "Les données réelles de l’incident sont indisponibles.",
    authenticationRequired: "Une authentification opérateur est requise pour cette action.",
    contractMismatch: "La réponse API ne respecte pas le contrat figé.",
    target: "Cible",
    expectedEffectLabel: "Effet attendu",
    telemetry: "Télémétrie",
    latency: "Latence",
    packetLoss: "Perte de paquets",
    blastRadius: "Rayon d’impact",
    reportsLabel: "signalements",
    servicesLabel: "services",
    approvedAwaitingExecution: "Approbation confirmée par le backend — exécution du simulateur en attente",
    approvalDialogText: "Vous approuvez cette proposition pour le simulateur. Aucun équipement réel d’opérateur n’est contrôlé.",
    cancel: "Annuler",
    close: "Fermer",
    operationFailed: "L’opération a échoué. L’interface n’a pas supposé de succès.",
    refresh: "Actualiser",
    liveData: "Données API réelles",
    demoSnapshot: "Instantané de démo déterministe",
    execution: "Exécuter la remédiation",
    verification: "Vérifier le rétablissement",
    signIn: "Se connecter avec Auth0",
    runAnalysis: "Lancer l’analyse de l’incident",
    analysisQueued: "Analyse acceptée par le backend",
    createProposal: "Créer une proposition de remédiation contrôlée",
    proposalCreated: "Proposition de remédiation confirmée par le backend",
    backendConfirmed: "Opération confirmée par le backend",
    publishRecovery: "Publier le rétablissement vérifié",
    communicationCreated: "Communication de rétablissement confirmée par le backend"
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
