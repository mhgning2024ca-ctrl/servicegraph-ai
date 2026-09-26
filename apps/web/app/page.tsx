"use client";

import Link from "next/link";
import { ArrowRight, GitMerge, ShieldCheck, Signal, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageToggle, useLocale } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useLocale();
  return (
    <main className="landing">
      <header className="landing-header">
        <Brand />
        <LanguageToggle />
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={16} />{t("heroEyebrow")}</div>
          <h1>{t("heroTitleA")} <span>{t("heroTitleB")}</span></h1>
          <p>{t("heroBody")}</p>
          <div className="hero-actions">
            <Link href="/ops" className="btn primary">{t("openOps")}<ArrowRight size={17}/></Link>
            <Link href="/citizen" className="btn secondary">{t("openCitizen")}</Link>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={15}/>{t("humanAuthorization")}</span>
            <span><Signal size={15}/>{t("liveTelemetry")}</span>
            <span><GitMerge size={15}/>{t("evidenceCorrelation")}</span>
          </div>
        </div>

        <div className="causal-hero" aria-label="Causal graph showing signals converging on NODE-17">
          <div className="grid-overlay"/>
          <div className="source-card source-a">{t("customerReports")} <b>37</b></div>
          <div className="source-card source-b">{t("telemetry")} <b>21%</b></div>
          <div className="source-card source-c">{t("topologySource")} <b>3 links</b></div>
          <svg viewBox="0 0 620 420" aria-hidden="true">
            <path d="M88 96 C225 96 245 204 360 204"/>
            <path d="M88 205 C220 205 250 205 360 204"/>
            <path d="M88 316 C225 316 245 204 360 204"/>
            <path d="M395 204 C470 204 505 204 545 204"/>
            <circle cx="360" cy="204" r="34" className="root-ring"/>
            <circle cx="545" cy="204" r="26" className="safe-ring"/>
          </svg>
          <div className="root-label"><small>{t("probableRootCause")}</small><strong>NODE-17</strong><span>94%</span></div>
          <div className="safe-label"><ShieldCheck size={16}/><span>{t("humanApprovedAction")}</span></div>
        </div>
      </section>
    </main>
  );
}
