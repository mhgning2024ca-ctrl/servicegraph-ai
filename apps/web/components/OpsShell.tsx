"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { BarChart3, FileWarning, LayoutDashboard, Menu, Network, ScrollText, Siren, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { getPublicConfig } from "@/lib/api";
import { getOperatorProfile, type OperatorProfile } from "@/lib/auth";
import { LanguageToggle, useLocale } from "@/lib/i18n";

type Section = "overview" | "incidents" | "network" | "reports" | "analytics" | "audit";

export function OpsShell({ children, active = "overview" }: { children: ReactNode; active?: Section }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [authMode, setAuthMode] = useState<"auth0" | "mock" | null>(null);

  useEffect(() => {
    void getOperatorProfile().then(setProfile);
    void getPublicConfig().then(config => setAuthMode(config.auth.mode)).catch(() => setAuthMode(null));
  }, []);

  const items = [
    ["/ops", t("overview"), LayoutDashboard, "overview"],
    ["/ops/incidents/INC-2048", t("incidents"), Siren, "incidents"],
    ["/ops/network", locale === "fr" ? "Services & actifs" : "Services & assets", Network, "network"],
    ["/ops/reports", t("reports"), FileWarning, "reports"],
    ["/ops/analytics", t("analytics"), BarChart3, "analytics"],
    ["/ops/audit", t("audit"), ScrollText, "audit"]
  ] as const;

  const displayName = profile?.name ?? profile?.nickname ?? t("guestOperator");
  const role = profile?.roles[0] ? formatRole(profile.roles[0], locale) : profile ? t("authenticatedOperator") : t("guestSession");
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "OP";

  return (
    <div className="ops-layout">
      <aside className={open ? "ops-sidebar open" : "ops-sidebar"}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label={t("closeMenu")}><X size={18}/></button>
        </div>
        <nav aria-label={t("operationsNavigation")}>
          {items.map(([href,label,Icon,key]) => (
            <Link href={href} key={key} className={active === key ? "active" : ""} onClick={() => setOpen(false)} aria-current={active === key ? "page" : undefined}>
              <Icon size={18}/><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="operator">
          <span className="avatar">{initials}</span>
          <div><strong>{displayName}</strong><small>{role}</small>{profile ? <a className="operator-auth" href="/auth/logout">{t("signOut")}</a> : authMode === "auth0" ? <a className="operator-auth" href="/auth/login">{t("signIn")}</a> : authMode === "mock" ? <small>{t("auth0Unavailable")}</small> : null}</div>
        </div>
      </aside>

      {open && <button className="scrim" onClick={() => setOpen(false)} aria-label={t("closeNavigation")}/>} 

      <div className="ops-main">
        <header className="ops-topbar">
          <div className="topbar-title">
            <button className="icon-btn mobile-menu" onClick={() => setOpen(true)} aria-label={t("openNavigation")}><Menu size={20}/></button>
            <div><small className="live-label">ServiceGraph AI</small><h1>{t("commandCenter")}</h1></div>
          </div>
          <LanguageToggle />
        </header>
        {children}
      </div>
    </div>
  );
}

function formatRole(role: string, locale: "fr" | "en") {
  const normalized = role.toUpperCase();
  const labels: Record<string, { en: string; fr: string }> = {
    CITIZEN: { en: "Citizen", fr: "Citoyen" },
    OPERATOR: { en: "Operator", fr: "Opérateur" },
    INCIDENT_MANAGER: { en: "Incident Manager", fr: "Gestionnaire d’incident" },
    ADMINISTRATOR: { en: "Administrator", fr: "Administrateur" },
  };
  return labels[normalized]?.[locale] ?? role;
}
