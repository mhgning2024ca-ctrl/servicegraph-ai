# 09 — Frontend Implementation Specification

Version: 0.1.0
Status: NORMATIVE
Owner: Frontend Agent A1
Applies to: apps/web, packages/ui

## 1. Objective

Build two fully responsive product surfaces sharing one design system:

1. Citizen / customer PWA — mobile-first, simple, bilingual, resilient.
2. Operations / NOC command center — desktop-first, information-dense, bilingual, evidence-oriented.

Both surfaces MUST work on desktop and mobile. They are not separate products and must share branding, localization, domain semantics and reusable components.

The frontend MUST NOT be a generic dashboard, a collection of disconnected cards, or a static visual mock. Every interactive control visible in the MVP must have a defined state and eventual API contract.

## 2. Canonical brand

Product name: ServiceGraph AI

Tagline EN:
From complaint to root cause to safe resolution.

Tagline FR:
Du signalement à la cause racine, jusqu’à une résolution sécurisée.

Logo concept:
- graph/network structure
- nodes connected in a subtle S shape
- one critical/root-cause node
- one healthy/resolved node
- no robot, brain, shield-only or generic AI sparkle logo

Primary logo lockup:
[graph mark] ServiceGraph AI

Compact mobile mark:
graph mark only

## 3. Design tokens

### Core palette

Background / Deep Network:
#07111F

Deepest background:
#050B14

Primary surface:
#0D1B2A

Raised surface:
#12263A

Raised interaction surface:
#172F46

Primary text:
#F5F7FA

Secondary text:
#94A3B8

Muted metadata:
#64748B

Brand / Signal Cyan:
#23D5D2

AI / Intelligence Violet:
#A78BFA

Success:
#22C55E

Warning:
#F59E0B

Major:
#F97316

Critical:
#EF4444

Citizen light background:
#F8FAFC

Citizen light surface:
#FFFFFF

### Semantic rules

Brand cyan:
- primary actions
- active/live links
- selected navigation
- network active paths
- focus rings

AI violet:
- Gemini analysis
- AI confidence
- AI recommendation provenance
- never used as generic decoration

Critical red:
- confirmed critical incident
- dangerous state
- never used for normal CTA

Success green:
- verified recovery
- completed safe state
- never used to imply unverified success

Color must never be the only state indicator. Pair with icon, label, shape or text.

## 4. Typography

Primary UI font:
Inter or system fallback equivalent

Technical / identifiers:
JetBrains Mono or monospace fallback

Use tabular numerals for:
- latency
- percentages
- counts
- incident metrics
- timestamps where useful

Example technical labels:
NODE-17
INC-2048
CMP-10042
94%

## 5. Iconography

Preferred library:
Lucide

Approved examples:
Activity
Network
Radio
Server
TriangleAlert
ShieldCheck
BrainCircuit
MapPin
Users
Clock
Mic
Waveform
Database
Cloud
Lock
CheckCircle
GitBranch
Menu
X

Do not mix multiple icon libraries.

Emoji rule:
- no emoji in the operations/NOC product surface
- citizen surface may use an emoji only if it adds plain-language clarity
- prefer semantic icons over emoji

## 6. Bilingual system — mandatory

Every user-facing screen must support:
FR | EN

The control is always visible:
- landing: header right
- citizen PWA: top app bar
- operations: global top-right utility area

Switching language must:
- preserve current route
- preserve active form data
- preserve selected incident
- preserve modal/drawer context
- update all visible UI text immediately
- persist across refresh

All user-facing text must come through one localization system.

Mandatory localized content:
- navigation
- buttons
- forms
- placeholders
- validation
- tooltips
- toasts
- loading states
- empty states
- degraded states
- error states
- confirmation dialogs
- accessibility labels
- public incident updates
- demo copy

Technical identifiers are never translated.

## 7. Responsive breakpoints

Phone:
0–639 px

Tablet:
640–1023 px

Desktop:
1024–1439 px

Large desktop:
1440 px+

Behavior:
- mobile uses one primary column
- tablet may use two content regions
- desktop NOC uses sidebar + multi-pane workspace
- large desktop increases useful information density, not empty whitespace

No fixed canvas design.

## 8. Landing page

Route:
/

### Desktop

Header:
- logo left
- FR | EN right

Hero left:
- eyebrow: AI-assisted service operations
- large headline
- one paragraph
- Open operations center CTA
- Open citizen portal secondary CTA
- three credibility labels:
  Human authorization
  Live telemetry
  Evidence correlation

Hero right:
signature causal graph visual:
- customer reports
- telemetry
- topology
- converge on NODE-17
- confidence 94%
- then human-approved action

Do not use stock photography.

### Mobile

Order:
1. header
2. hero copy
3. full-width primary CTA
4. full-width secondary CTA
5. credibility labels
6. causal graph visual

Graph must remain understandable at narrow width.

## 9. Citizen PWA

Route:
 /citizen

### Mobile canonical layout

Top bar:
- compact logo
- FR | EN

Block 1:
Greeting
Your service / Votre service

Block 2:
Service status hero
- operational/degraded state
- availability metric where valid
- no technical jargon

Block 3:
Report a problem
Three actions:
- Speak / Parler
- Type / Écrire
- Quick diagnostic / Diagnostic rapide

Block 4:
Nearby or correlated incident
- severity
- location
- incident status
- I am affected too action

Block 5:
offline-safe reporting indicator

Bottom navigation:
Status | Report | Activity | Profile
État | Signaler | Activité | Profil

### Desktop citizen behavior

On desktop, citizen experience remains simple:
- centered content width
- no NOC sidebar
- bottom nav may become compact top/side navigation if breakpoint requires
- report and incident cards can become two columns
- all mobile actions remain available

## 10. Citizen report flow

Text path:
DRAFT
→ SENDING
→ SENT
→ CORRELATED when applicable

Voice path:
READY
→ RECORDING
→ UPLOADING
→ TRANSCRIBING
→ READY_TO_SEND
→ SENT

Offline:
DRAFT
→ QUEUED_OFFLINE
→ RETRYING
→ SENT

The UI must never claim server success while only locally queued.

Required states:
- loading
- invalid input
- integration unavailable
- retryable error
- successful receipt

Receipt shows:
- report reference
- timestamp
- known incident link if available

## 11. Operations shell

Routes begin:
 /ops

### Desktop

Left sidebar:
- logo
- Overview
- Incidents
- Network
- Reports
- Analytics
- Audit

Bottom of sidebar:
- operator identity
- role

Top bar:
- live state
- page/command-center title
- FR | EN
- user/utility controls

### Mobile operations

Sidebar becomes off-canvas drawer.
Top bar contains:
- menu
- condensed page title
- FR | EN

No desktop-only page may become unusable on mobile.

## 12. Operations overview

Route:
 /ops

Desktop hierarchy:

1. Global service health strip
2. KPI row
3. Network topology
4. Live incident stream
5. optional event activity region after core content

Health strip:
- global operational percentage
- status label
- compact recent trend
- live indicator

KPI row:
- active incidents
- affected users
- median triage time

Network topology:
- real data from backend/simulator contract
- node state by label + color
- NODE-17 visibly critical in demo scenario
- packet loss
- latency
- latest sample age

Incident stream:
- incident number
- severity
- root/candidate node
- age
- affected users
- AI confidence when available
- click opens incident workspace

### Mobile overview

Order:
1. health strip
2. KPI cards stacked
3. incident stream
4. topology

Do not squeeze desktop multi-column layout into a phone viewport.

## 13. Incident workspace

Route:
 /ops/incidents/:id

This is the signature screen.

### Desktop structure

Header:
- breadcrumb
- incident ID
- title
- severity
- state
- duration
- affected users

Grid:
A. causal evidence graph
B. AI investigation
C. telemetry
D. controlled remediation

Below:
incident timeline

### Mobile structure

Order:
1. incident header
2. severity / status / impact
3. AI investigation
4. causal evidence
5. telemetry
6. remediation
7. timeline horizontally scrollable or vertical

No essential content is hidden only because viewport is narrow.

## 14. Causal evidence graph

This is a signature visual.

Example concept:

37 reports
→ 3 affected services
→ telemetry anomaly
→ NODE-17
→ probable root cause 94%

Graph nodes must derive from backend graph response.

Interactions:
- select node
- inspect details
- highlight connected evidence path
- reset/fit graph
- provide accessible text/table fallback

No random animated network.

## 15. AI investigation card

Must display:
- probable cause
- confidence
- model/provider
- analysis timestamp
- rationale
- evidence count
- expandable evidence
- assumptions if present
- unavailable/degraded state

Example:
NODE-17
94% confidence

Supporting evidence:
- 37 related reports
- packet loss 1% → 21%
- 3 affected services depend on NODE-17

Never show:
AI says NODE-17 is broken.

## 16. Telemetry visualization

Minimum metrics:
- latency
- packet loss
- error rate
- availability

Requirements:
- show time context
- show anomaly threshold
- distinguish normal vs degraded
- support recovery view after remediation
- display textual summary for accessibility

No fake random chart values.

Frontend mock data must use deterministic scenario values defined in the project docs.

## 17. Remediation / approval UI

Must visibly separate:
AI recommendation
from
human authorization

Panel displays:
- proposal version
- action
- target
- parameters
- risk
- expected effect
- evidence
- authorization requirement

Approval CTA:
Approve simulated reroute
Approuver le reroutage simulé

Before approval, show confirmation dialog.

Dialog must repeat:
- exact target
- risk
- action
- fact that this is simulator action in MVP

Unauthorized actor:
button hidden or disabled for convenience BUT server rejection remains mandatory.

Approved state:
do not display success until backend confirms approval.

## 18. Incident timeline

Canonical stages:
Detected
Investigated
Proposal
Approved
Remediating
Verifying
Resolved

French:
Détecté
Investigé
Proposition
Approuvé
Remédiation
Vérification
Résolu

Visual state:
- complete
- current
- pending
- failed/reverted when applicable

Timeline updates only from backend state.

## 19. Button variants

Primary:
brand cyan
Use for one primary safe action in a region.

Secondary:
transparent/dark surface with border.

Ghost:
minimal utility action.

Destructive:
red only for actual destructive/revocation action.

Critical approval:
special operational approval style.
Must include action context.

Icon:
only with accessible name and tooltip where meaning is not obvious.

Required interaction states:
default
hover
focus-visible
pressed
disabled
loading
confirmed only after real success

## 20. Surfaces and radius

Cards/panels:
14 px radius

Buttons/inputs:
10 px radius

Pills/badges:
999 px

Avoid excessive floating cards.
Prefer:
- grouped panels
- tables
- split panes
- timelines
- graphs
- section boundaries

## 21. Images / media

Do NOT use:
- stock office photos
- generic smiling people
- decorative AI brains
- decorative robot illustrations
- random cyberpunk images

Use:
- real topology visualization
- real telemetry charts
- causal graph
- map when geographic impact is meaningful
- generated product-owned visual assets only when they communicate the system

## 22. Motion

Allowed:
- report queued → sent
- new live incident entry
- causal path highlight
- remediation timeline advance
- drawer transitions
- loading progress linked to real request
- healthy/degraded status transition

Forbidden:
- decorative particle fields
- continuous glowing borders
- fake waveforms
- fake progress bars
- count-up animation on every render
- unnecessary parallax

Reduced-motion preference is mandatory.

## 23. Loading and degraded states

Every async region has:
- pending
- success
- empty
- error
- degraded where external integration applies

Do not block an entire incident page while Gemini or ElevenLabs is slow.

Examples:
Gemini unavailable:
Current telemetry and deterministic correlation remain visible.

ElevenLabs unavailable:
Text reporting remains usable.

Backboard unavailable:
Current incident remains usable; historical memory panel displays explicit unavailable state.

## 24. Accessibility

Target WCAG 2.2 AA practices.

Mandatory:
- semantic landmarks
- form labels
- form errors
- visible focus
- keyboard operation
- reduced motion
- touch-sized controls
- screen-reader labels
- textual summary for charts/graphs
- status never conveyed by color alone

## 25. Frontend folder direction

Preferred structure:

apps/web/
  app/
    page.tsx
    citizen/
    ops/
      page.tsx
      incidents/[id]/
  components/
    brand/
    citizen/
    ops/
    incident/
    charts/
    common/
  lib/
    api/
    i18n/
    mocks/
  public/

packages/ui/
  shared design-system components if cross-app extraction is actually useful

Do not extract abstractions just for elegance during hackathon time.

## 26. Contract-mock phase

Frontend starts before backend using contract-valid deterministic mocks.

A visible developer/demo marker may state:
Contract mock mode

Rules:
- mock objects must validate against shared contracts
- no separate local enum definitions when shared contracts exist
- replacing mocks with real API must not require layout rewrite
- no fake external-service success

## 27. First frontend delivery

A1 must deliver in this order:

P0.1
- app shell
- tokens
- logo treatment
- FR | EN
- responsive foundations

P0.2
- landing desktop + mobile

P0.3
- citizen status/report desktop + mobile

P0.4
- operations overview desktop + mobile

P0.5
- incident workspace desktop + mobile

P0.6
- approval modal
- timeline
- causal graph
- telemetry mock

P0.7
- loading/error/degraded states
- accessibility pass
- reduced motion

Do not add secondary pages before P0.1–P0.7 are stable.

## 28. Frontend acceptance criteria

Frontend is accepted only if all are true:

- desktop landing works
- mobile landing works
- desktop citizen works
- mobile citizen works
- desktop operations works
- mobile operations works
- desktop incident workspace works
- mobile incident workspace works
- FR | EN works without route reset
- no visible untranslated core labels
- citizen report interaction has defined states
- topology is data-driven
- causal graph is data-driven or contract-valid deterministic mock
- AI confidence/evidence visible
- approval boundary visible
- reduced motion supported
- no decorative dead button
- no real secret in frontend code
- no mobile horizontal overflow except intentionally scrollable timeline/graph
- keyboard path exists for core operator flow
- frontend build/typecheck passes
