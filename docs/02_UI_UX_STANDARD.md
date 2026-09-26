# 02 — UI/UX Standard

Version: 0.1.0
Status: NORMATIVE
Applies to: `apps/web`, `packages/ui`

## 1. Design objective

ServiceGraph AI must look and behave like a credible 2026 operations product, not a generic hackathon dashboard and not a collection of decorative cards.

The design has two distinct surfaces that share one visual system:

1. **Citizen mobile-first PWA** — simple, fast, reassuring, accessible, resilient to weak connectivity.
2. **Operations/NOC command center** — dense, evidence-oriented, live, keyboard-friendly and optimized for rapid investigation.

The same design tokens, status language and incident semantics must be used across both surfaces.

## 2. Visual principles

### 2.1 Functional hierarchy

Every screen must answer one primary question.

Examples:

- Citizen home: “Is my service affected right now?”
- Report flow: “What is happening, and can I send enough information?”
- Incident detail: “What do we know, what is the probable cause, and what is the next controlled action?”
- Command center: “What requires attention right now?”

### 2.2 Density by role

Citizen UI uses progressive disclosure and large touch targets.
Operations UI uses information density, structured tables/graphs and compact controls without sacrificing readability.

### 2.3 Evidence before spectacle

AI output must visibly connect to evidence. Do not show glowing “AI magic” components with unexplained conclusions.

### 2.4 Motion with meaning

Motion is permitted only for:

- state transition;
- continuity between views;
- live event arrival;
- causality/relationship emphasis;
- progress/loading;
- focus/attention on a changed operational condition.

No looping decorative particles, unnecessary parallax, gratuitous 3D, or animation that hides latency.

## 3. Design system

### 3.1 Tokens

Implement tokens for:

- background canvas;
- elevated surface;
- border/subtle separator;
- primary text;
- secondary/muted text;
- accent/brand;
- info;
- success;
- warning;
- critical;
- offline/degraded;
- focus ring.

Use semantic token names rather than hard-coded component colors.

### 3.2 Typography

Requirements:

- highly legible sans-serif UI font stack;
- tabular numerals for operational metrics;
- clear title/body/label/metadata hierarchy;
- avoid excessive font weights;
- no extremely small text for critical evidence.

### 3.3 Radius and elevation

Use restrained modern radii and elevation. Cards must not all appear as disconnected floating tiles. Prefer sections, grouped panels, split panes and tables where the information relationship requires it.

### 3.4 Iconography

Use a single coherent icon library. Icons supplement labels; critical actions may not rely on icon-only meaning without accessible name/tooltip.

## 4. Citizen mobile navigation

Canonical bottom navigation after initial onboarding:

```text
Status | Report | Activity | Profile
```

If authenticated profile is not part of the current build, `Profile` may remain a minimal account/settings surface, but the slot/name must not be replaced ad hoc.

### 4.1 Citizen home / Status

Required hierarchy:

1. service-state hero;
2. known nearby/relevant incident if one exists;
3. primary `Report a problem` action;
4. latest personal/relevant activity;
5. compact connectivity/offline indicator.

Avoid showing network-engineering jargon to citizens unless expanded under “technical details”.

### 4.2 Report entry

Primary options:

- `Speak`;
- `Type`;
- `Quick diagnostic`.

Voice and text are equal first-class paths.

### 4.3 Report flow states

Canonical client states:

```text
DRAFT
QUEUED_OFFLINE
SENDING
SENT
CORRELATED
NEEDS_MORE_INFO
RESOLVED
FAILED_RETRYABLE
FAILED_FINAL
```

These are presentation states and do not replace backend domain enums.

Required visual behavior:

- `QUEUED_OFFLINE`: explicit local-save confirmation, not an error panic;
- `SENDING`: progress, no double-submit;
- `SENT`: report ID/receipt;
- `CORRELATED`: known incident link and status;
- retry action only where safe.

### 4.4 “I’m affected too”

When a known incident matches the citizen context, show a lightweight confirmation action. It must call a real endpoint and affect incident evidence/impact data; it cannot be a decorative button.

## 5. Operations information architecture

Canonical primary navigation:

```text
Overview
Incidents
Network
Reports
Analytics
Audit
```

`Settings` is available to authorized users through account/admin navigation, not necessarily as a primary operational tab.

### 5.1 Overview

Must contain:

- global service health summary;
- active/critical incident metrics;
- affected-user count;
- mean detection/triage metric if data exists;
- live incident list ranked by severity/recency;
- network/service map or topology summary;
- event activity strip/stream.

Do not fabricate KPI trends if historical data is insufficient. Show `Not enough history` rather than fake percentages.

### 5.2 Incident workspace

Incident detail is the core product screen.

Desktop layout target:

```text
┌──────────────────────────────────────────────────────────────┐
│ Incident header: ID / severity / status / duration / actions │
├───────────────────────┬──────────────────────────────────────┤
│ Evidence / causal     │ Investigation                         │
│ graph + topology      │ hypothesis / confidence / rationale  │
│                       │ blast radius / related reports        │
├───────────────────────┼──────────────────────────────────────┤
│ Timeline              │ Remediation / approval / verification │
└───────────────────────┴──────────────────────────────────────┘
```

The exact responsive composition may change, but the information areas are mandatory.

### 5.3 Evidence graph

Graph must derive from backend graph/evidence response.

Required interactions:

- select node;
- inspect node type and timestamp;
- highlight connected evidence path;
- fit/reset view;
- accessible list/table fallback or detail pane for non-pointer/assistive use.

Do not use graph animation purely for appearance.

### 5.4 AI hypothesis card

Mandatory fields shown:

- probable cause label;
- confidence as percentage/score;
- evidence count;
- model analysis timestamp;
- concise rationale;
- expandable supporting evidence;
- provenance/model label;
- degraded/error state.

Forbidden design:

```text
AI says: NODE-17 is broken ✨
```

Required design communicates uncertainty and grounding.

### 5.5 Remediation panel

The approval boundary must be visually unmistakable.

Show:

- proposed action;
- exact target;
- parameters;
- expected effect;
- risk;
- proposal version;
- evidence/rationale;
- authorization requirement;
- approve/reject actions only to eligible user.

After approval, disable duplicate action and show execution lifecycle.

## 6. Button system

Canonical variants:

- `primary` — one primary task in a region;
- `secondary` — safe alternate;
- `ghost` — low-emphasis utility;
- `destructive` — irreversible/high-risk non-remediation action;
- `critical-approval` — sensitive operational approval with explicit context;
- `icon` — only when accessible name/tooltip exists.

Buttons require:

- default;
- hover (pointer devices);
- focus-visible;
- pressed;
- disabled;
- loading;
- success/confirmation only if the action actually succeeded.

Never use a spinner-only button without maintaining its accessible label/context.

## 7. Loading strategy

Use the lightest truthful state:

- skeletons for predictable page structure;
- inline pending indicator for mutations;
- streamed/partial sections where architecture supports it;
- timeout/error messaging for external AI calls.

Do not block an entire incident page because one AI integration is slow.

## 8. Error/degraded states

Every external integration component has three mandatory states:

1. available;
2. pending;
3. unavailable/degraded.

The UI must name the affected capability without exposing secrets or raw stack traces.

Example:

> Historical AI memory is temporarily unavailable. Current incident evidence and telemetry remain available.

## 9. Live update behavior

When an SSE event changes the current page:

- update affected data without full page reload;
- briefly indicate changed region if useful;
- preserve user scroll/focus unless safety requires attention;
- critical severity escalation may show a restrained toast/banner;
- do not produce a toast for every telemetry sample.

## 10. Map/topology behavior

Use map/topology only where it clarifies impact.

Required status encoding combines color + shape/icon/text. Example:

- operational;
- degraded;
- critical;
- unknown.

A map is not accepted if it is static decoration unrelated to incident data.

## 11. Responsive breakpoints and composition

Do not hard-code one desktop canvas width.

Behavior:

- phone: single primary column, bottom nav, sheets/drawers for detail;
- tablet: adaptive two-region layouts where useful;
- desktop: multi-pane investigation workspace;
- large desktop: increase information density, not merely whitespace.

## 12. PWA requirements

Minimum installable PWA requirements:

- manifest with product name/icons/theme metadata;
- service worker strategy documented and tested;
- offline application shell where practical;
- offline report queue in IndexedDB;
- reconnect/retry UI;
- connectivity badge;
- no claim of successful server submission while queued locally.

The PWA must remain usable as a normal website without installation.

## 13. Accessibility requirements

Target WCAG 2.2 AA practices for the implemented scope.

Mandatory:

- semantic landmarks;
- correct form labels and errors;
- logical heading hierarchy;
- visible focus;
- keyboard operation of command-center core actions;
- reduced-motion mode;
- touch targets sized appropriately;
- screen-reader labels for status/icon controls;
- charts/graphs expose textual summary or structured alternative;
- color is never the only severity signal.

## 14. Animation specification

Approved examples:

- report card smoothly transitions `Queued → Sending → Sent`;
- new incident row enters with subtle emphasis;
- evidence path highlights from reports → service → node;
- remediation timeline advances after confirmed backend events;
- drawer transitions maintain spatial context.

Forbidden examples:

- pulsing every card continuously;
- fake waveform disconnected from real recording;
- random particles;
- infinite glowing AI borders;
- animated metrics that count up from zero on every render;
- fake progress bars not tied to actual progress/state.

## 15. Microcopy rules

Citizen copy:

- plain language;
- short sentences;
- do not expose internal confidence score as certainty without explanation;
- distinguish “reported”, “detected”, “confirmed” and “resolved”.

Operator copy:

- precise technical terminology;
- IDs visible/copyable;
- timestamps include timezone or relative+absolute detail;
- actions use verbs and exact targets.

## 16. Demo visual moments

The UI must support these memorable demo beats:

1. mobile voice/text report submitted;
2. report appears live in NOC;
3. multiple reports collapse into one incident context;
4. evidence graph visually converges on probable node;
5. Gemini hypothesis appears with evidence/confidence;
6. approval boundary visibly blocks automatic action;
7. authorized approval advances remediation timeline;
8. telemetry recovers and visualization changes from degraded to healthy;
9. citizen mobile view receives resolution update.

These moments must be backed by real state transitions.

## 17. Frontend acceptance checklist

A frontend implementation is not accepted unless:

- no route is a blank placeholder;
- primary mobile report flow works at phone width;
- ops incident workspace works at desktop width;
- all async components have loading and failure state;
- forms have validation/error messaging;
- offline queue behavior is observable/testable;
- AI evidence/confidence is visible;
- approval UI cannot bypass backend authorization;
- motion respects reduced-motion;
- at least one keyboard-only path covers core incident investigation/approval flow;
- no decorative button exists without an implemented action.
