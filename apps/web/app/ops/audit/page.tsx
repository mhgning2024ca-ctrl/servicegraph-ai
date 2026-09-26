"use client";

import { ScrollText, ShieldCheck } from "lucide-react";
import { OpsShell } from "@/components/OpsShell";
import { useLocale } from "@/lib/i18n";

export default function AuditPage() {
  const { t } = useLocale();

  return (
    <OpsShell active="audit">
      <main className="ops-content">
        <header className="incident-header">
          <div><small className="section-kicker">{t("audit")}</small><h2>{t("auditViewTitle")}</h2><p>{t("auditViewBody")}</p></div>
          <ScrollText size={24}/>
        </header>

        <section className="panel ai-panel">
          <div className="panel-head"><div><small className="section-kicker">{t("audit")}</small><h3>{t("auditUnavailable")}</h3></div><ShieldCheck size={20}/></div>
          <p>{t("auditViewBody")}</p>
          <div className="evidence-list">
            <span><ShieldCheck size={15}/>remediation:approve</span>
            <span><ShieldCheck size={15}/>remediation:execute</span>
            <span><ShieldCheck size={15}/>audit:read</span>
          </div>
        </section>
      </main>
    </OpsShell>
  );
}
