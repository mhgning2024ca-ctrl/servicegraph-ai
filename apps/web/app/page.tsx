"use client";

import Link from "next/link";
import { ArrowRight, GitMerge, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageToggle, useLocale } from "@/lib/i18n";

export default function HomePage() {
  const { locale } = useLocale();

  const copy = locale === "fr"
    ? {
        eyebrow: "Plateforme d’opérations de service assistée par IA",
        titleA: "Du signalement",
        titleB: "à une résolution compréhensible.",
        body: "ServiceGraph IA centralise les signalements clients et citoyens, recherche les relations entre les problèmes observés, aide les équipes à identifier les services ou ressources affectés et accompagne le suivi jusqu’à la résolution.",
        openOps: "Ouvrir le centre d’opérations",
        openCitizen: "Ouvrir l’espace citoyen",
        human: "Décisions sensibles validées par un humain",
        multi: "Télécom · électricité · eau · transport",
        evidence: "Relations appuyées par des preuves",
        reports: "Signalements",
        events: "Événements service",
        context: "Contexte opérationnel",
        analysis: "Relations & incidents",
        assumptions: "plusieurs hypothèses possibles",
        controlled: "Action contrôlée et suivi",
        aria: "Des signalements et événements convergent vers une analyse de relations et plusieurs incidents possibles avant une action contrôlée",
      }
    : {
        eyebrow: "AI-assisted service operations platform",
        titleA: "From reports",
        titleB: "to understandable resolution.",
        body: "ServiceGraph AI centralizes customer and citizen reports, searches for relationships between observed problems, helps teams identify affected services or resources, and supports transparent follow-up through resolution.",
        openOps: "Open operations center",
        openCitizen: "Open citizen portal",
        human: "Sensitive actions remain human-controlled",
        multi: "Telecom · electricity · water · transport",
        evidence: "Relationships backed by evidence",
        reports: "Reports",
        events: "Service events",
        context: "Operational context",
        analysis: "Relations & incidents",
        assumptions: "multiple hypotheses possible",
        controlled: "Controlled action and follow-up",
        aria: "Reports and service events converge into relationship analysis and potentially multiple incidents before controlled action",
      };

  return (
    <main className="landing">
      <header className="landing-header">
        <Brand />
        <LanguageToggle />
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={16} />{copy.eyebrow}</div>
          <h1>{copy.titleA} <span>{copy.titleB}</span></h1>
          <p>{copy.body}</p>

          <div className="hero-actions">
            <Link href="/ops" className="btn primary">{copy.openOps}<ArrowRight size={17}/></Link>
            <Link href="/citizen" className="btn secondary">{copy.openCitizen}</Link>
          </div>

          <div className="trust-row">
            <span><ShieldCheck size={15}/>{copy.human}</span>
            <span><Layers3 size={15}/>{copy.multi}</span>
            <span><GitMerge size={15}/>{copy.evidence}</span>
          </div>
        </div>

        <div className="causal-hero" aria-label={copy.aria}>
          <div className="grid-overlay"/>
          <div className="source-card source-a">{copy.reports} <b>37</b></div>
          <div className="source-card source-b">{copy.events} <b>12</b></div>
          <div className="source-card source-c">{copy.context} <b>4</b></div>

          <svg viewBox="0 0 620 420" aria-hidden="true">
            <path d="M88 96 C225 96 245 204 360 204"/>
            <path d="M88 205 C220 205 250 205 360 204"/>
            <path d="M88 316 C225 316 245 204 360 204"/>
            <path d="M395 204 C470 204 505 204 545 204"/>
            <circle cx="360" cy="204" r="34" className="root-ring"/>
            <circle cx="545" cy="204" r="26" className="safe-ring"/>
          </svg>

          <div className="root-label">
            <small>{copy.analysis}</small>
            <strong>1…n</strong>
            <span>{copy.assumptions}</span>
          </div>

          <div className="safe-label">
            <ShieldCheck size={16}/>
            <span>{copy.controlled}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
