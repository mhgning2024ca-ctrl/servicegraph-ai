"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  Bus,
  Clock3,
  Droplets,
  Layers3,
  RotateCcw,
  Siren,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

import { OpsShell } from "@/components/OpsShell";
import { getOperatorAccessToken, listIncidents, subscribeToOperationalEvents } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Incident = Awaited<ReturnType<typeof listIncidents>>["items"][number];
type SourceState = "loading" | "live" | "auth" | "error";
type Domain = "telecom" | "electricity" | "water" | "transport" | "other";

const DOMAIN_META: Record<Domain, { fr: string; en: string; icon: typeof Wifi }> = {
  telecom: { fr: "Télécom & connectivité", en: "Telecom & connectivity", icon: Wifi },
  electricity: { fr: "Électricité", en: "Electricity", icon: Zap },
  water: { fr: "Eau", en: "Water", icon: Droplets },
  transport: { fr: "Transport", en: "Transport", icon: Bus },
  other: { fr: "Autres services", en: "Other services", icon: Building2 },
};

export default function OpsPage() {
  const { t, locale } = useLocale();
  const [sourceState, setSourceState] = useState<SourceState>("loading");
  const [items, setItems] = useState<Incident[]>([]);

  async function load(silent = false) {
    if (!silent) setSourceState("loading");
    try {
      const token = await getOperatorAccessToken();
      if (!token) {
        setItems([]);
        setSourceState("auth");
        return;
      }

      const response = await listIncidents(token);
      setItems(response.items);
      setSourceState("live");
    } catch {
      setItems([]);
      setSourceState("error");
    }
  }

  useEffect(() => {
    void load();

    let unsubscribe: (() => void) | undefined;
    let refreshTimer: number | undefined;

    async function connectStream() {
      const token = await getOperatorAccessToken();
      if (!token) return;

      unsubscribe = subscribeToOperationalEvents(token, () => {
        if (refreshTimer !== undefined) return;
        refreshTimer = window.setTimeout(() => {
          refreshTimer = undefined;
          void load(true);
        }, 250);
      });
    }

    void connectStream();

    return () => {
      unsubscribe?.();
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
    // The token and stream are initialized once for this operations session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(
    () => items.filter(item => !["RESOLVED", "CLOSED"].includes(item.status)),
    [items],
  );

  const affected = useMemo(
    () => active.reduce((sum, item) => sum + item.affectedUsersEstimate, 0),
    [active],
  );

  const domainCounts = useMemo(() => {
    const initial: Record<Domain, number> = {
      telecom: 0,
      electricity: 0,
      water: 0,
      transport: 0,
      other: 0,
    };

    active.forEach(item => {
      initial[detectDomain(item.title)] += 1;
    });
    return initial;
  }, [active]);

  const domainsAffected = Object.values(domainCounts).filter(value => value > 0).length;

  return (
    <OpsShell active="overview">
      <main className="ops-content">
        <div className="investigating" role="status">
          <span/>
          {sourceState === "loading" && t("nocLoading")}
          {sourceState === "live" && (locale === "fr" ? "Données opérationnelles connectées" : "Operational data connected")}
          {sourceState === "auth" && (
            <>
              <a href="/auth/login">{t("signIn")}</a>
              {" — "}
              {locale === "fr"
                ? "aucune donnée d’exploitation n’est simulée tant que vous n’êtes pas connecté"
                : "no operational data is simulated while signed out"}
            </>
          )}
          {sourceState === "error" && (
            <>
              {t("nocUnavailable")}
              {" "}
              <button className="text-action" onClick={() => void load()}>
                <RotateCcw size={14}/>{t("refresh")}
              </button>
            </>
          )}
        </div>

        <section className="health-strip">
          <div>
            <small className="section-kicker">
              {locale === "fr" ? "État global" : "Global state"}
            </small>
            <div className="health-value">
              <span/>
              {sourceState === "live" ? active.length : "—"}
            </div>
            <p>
              {locale === "fr"
                ? "incidents actifs issus du backend"
                : "active incidents from the backend"}
            </p>
          </div>

          <div className="spark-bars" aria-label={locale === "fr" ? "Activité opérationnelle" : "Operational activity"}>
            {[34,42,38,51,46,59,66,61,72,69,78,83,76].map((n, i) => (
              <span key={i} style={{ height: n + "%" }}/>
            ))}
          </div>

          <span className="live-chip">
            <Activity size={14}/>
            {sourceState === "live" ? t("live") : (locale === "fr" ? "indisponible" : "unavailable")}
          </span>
        </section>

        <section className="metric-grid">
          <article>
            <span className="metric-icon danger"><Siren size={18}/></span>
            <div>
              <small>{t("activeIncidents")}</small>
              <strong>{sourceState === "live" ? active.length : "—"}</strong>
            </div>
            <p>{locale === "fr" ? "Aucun incident fictif injecté dans cette vue." : "No fabricated incident is injected in this view."}</p>
          </article>

          <article>
            <span className="metric-icon"><Users size={18}/></span>
            <div>
              <small>{t("affectedUsers")}</small>
              <strong>{sourceState === "live" ? affected.toLocaleString(locale) : "—"}</strong>
            </div>
            <p>{sourceState === "live" ? t("liveData") : t("noBackendData")}</p>
          </article>

          <article>
            <span className="metric-icon ai"><Layers3 size={18}/></span>
            <div>
              <small>{locale === "fr" ? "Domaines touchés" : "Affected domains"}</small>
              <strong>{sourceState === "live" ? domainsAffected : "—"}</strong>
            </div>
            <p>{locale === "fr" ? "Télécom, électricité, eau, transport ou autres services." : "Telecom, electricity, water, transport or other services."}</p>
          </article>
        </section>

        <section className="ops-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <small className="section-kicker">{locale === "fr" ? "Portefeuille de services" : "Service portfolio"}</small>
                <h2>{locale === "fr" ? "Où se concentrent les incidents ?" : "Where are incidents concentrated?"}</h2>
              </div>
            </div>

            <div className="incident-list">
              {(Object.keys(DOMAIN_META) as Domain[]).map(domain => {
                const Icon = DOMAIN_META[domain].icon;
                return (
                  <div className="incident-row" key={domain}>
                    <span className="severity-bar"/>
                    <div className="incident-id">
                      <div>
                        <Icon size={16}/>
                        <strong>{locale === "fr" ? DOMAIN_META[domain].fr : DOMAIN_META[domain].en}</strong>
                      </div>
                      <small>{locale === "fr" ? "Incidents actuellement classés dans ce domaine" : "Incidents currently classified in this domain"}</small>
                    </div>
                    <div className="incident-stat">
                      <strong>{sourceState === "live" ? domainCounts[domain] : "—"}</strong>
                      <small>{t("activeIncidents")}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel incidents-panel">
            <div className="panel-head">
              <div>
                <small className="section-kicker">{locale === "fr" ? "File opérationnelle" : "Operational queue"}</small>
                <h2>{locale === "fr" ? "Incidents nécessitant une attention" : "Incidents requiring attention"}</h2>
              </div>
              <span className="live-dot">
                {sourceState === "live" ? t("live") : t("noBackendData")}
              </span>
            </div>

            <div className="incident-list">
              {sourceState === "live" && active.length > 0 ? (
                active.slice(0, 10).map(item => (
                  <Link
                    href={`/ops/incidents/${encodeURIComponent(item.incidentNumber)}`}
                    key={item.id}
                    className="incident-row"
                  >
                    <span className={"severity-bar " + item.severity.toLowerCase()}/>
                    <div className="incident-id">
                      <div>
                        <strong>{item.incidentNumber}</strong>
                        <span>{formatStatus(item.status, locale)}</span>
                      </div>
                      <small>
                        <Clock3 size={13}/>
                        {ageMinutes(item.createdAt)} min · {formatDomain(detectDomain(item.title), locale)}
                      </small>
                    </div>
                    <div className="incident-stat">
                      <strong>{item.affectedUsersEstimate.toLocaleString(locale)}</strong>
                      <small>{t("affectedUsers")}</small>
                    </div>
                    <div className="incident-stat confidence">
                      <strong>{item.rootCauseConfidence == null ? "—" : `${Math.round(item.rootCauseConfidence * 100)}%`}</strong>
                      <small>{locale === "fr" ? "hypothèse principale" : "leading hypothesis"}</small>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="voice-state">
                  <Activity size={25}/>
                  <strong>
                    {sourceState === "live"
                      ? (locale === "fr" ? "Aucun incident actif" : "No active incidents")
                      : t("noBackendData")}
                  </strong>
                </div>
              )}
            </div>
          </article>
        </section>
      </main>
    </OpsShell>
  );
}

function ageMinutes(timestamp: string) {
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000));
}

function detectDomain(title: string): Domain {
  const value = title.toLowerCase();
  if (value.includes("élect") || value.includes("power") || value.includes("electric")) return "electricity";
  if (value.includes("eau") || value.includes("water") || value.includes("pression")) return "water";
  if (value.includes("transport") || value.includes("bus") || value.includes("train") || value.includes("station")) return "transport";
  if (value.includes("internet") || value.includes("network") || value.includes("connect") || value.includes("wifi") || value.includes("wi-fi")) return "telecom";
  return "other";
}

function formatDomain(domain: Domain, locale: "fr" | "en") {
  return locale === "fr" ? DOMAIN_META[domain].fr : DOMAIN_META[domain].en;
}

function formatStatus(value: Incident["status"], locale: "fr" | "en") {
  const fr: Record<Incident["status"], string> = {
    DETECTED: "Détecté",
    INVESTIGATING: "En investigation",
    CONFIRMED: "Confirmé",
    REMEDIATION_PROPOSED: "Solution proposée",
    AWAITING_APPROVAL: "Approbation requise",
    REJECTED: "Rejeté",
    REMEDIATING: "Intervention",
    VERIFYING: "Vérification",
    RESOLVED: "Résolu",
    CLOSED: "Fermé",
  };
  if (locale === "fr") return fr[value];
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
}
