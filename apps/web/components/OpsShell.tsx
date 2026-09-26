"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { BarChart3, FileWarning, LayoutDashboard, Menu, Network, ScrollText, Siren, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LanguageToggle, useLocale } from "@/lib/i18n";

export function OpsShell({ children, active = "overview" }: { children: ReactNode; active?: "overview"|"incidents" }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const items = [
    ["/ops", t("overview"), LayoutDashboard, "overview"],
    ["/ops/incidents/INC-2048", t("incidents"), Siren, "incidents"],
    ["/ops", t("network"), Network, "network"],
    ["/ops", t("reports"), FileWarning, "reports"],
    ["/ops", t("analytics"), BarChart3, "analytics"],
    ["/ops", t("audit"), ScrollText, "audit"]
  ] as const;

  return (
    <div className="ops-layout">
      <aside className={open ? "ops-sidebar open" : "ops-sidebar"}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label={t("closeMenu")}><X size={18}/></button>
        </div>
        <nav>
          {items.map(([href,label,Icon,key]) => (
            <Link href={href} key={key} className={active === key ? "active" : ""} onClick={() => setOpen(false)}>
              <Icon size={18}/><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="operator">
          <span className="avatar">HG</span>
          <div><strong>Hadi Gning</strong><small>{t("incidentManager")}</small></div>
        </div>
      </aside>

      {open && <button className="scrim" onClick={() => setOpen(false)} aria-label={t("closeNavigation")}/>}

      <div className="ops-main">
        <header className="ops-topbar">
          <div className="topbar-title">
            <button className="icon-btn mobile-menu" onClick={() => setOpen(true)} aria-label={t("openNavigation")}><Menu size={20}/></button>
            <div><small className="live-label">{t("live")}</small><h1>{t("commandCenter")}</h1></div>
          </div>
          <LanguageToggle />
        </header>
        {children}
      </div>
    </div>
  );
}
