# 08 — Demo, Judging & Acceptance

Version: 0.1.0  
Status: NORMATIVE

## 1. Event constraints

Submission deadline: **Sunday 27 September 2026, 10:00 EDT**.

Judging is in person.

Total judge interaction: **7 minutes**:
- 4 minutes presentation/demo;
- 3 minutes questions.

Demo must be the same project submitted to Devpost.

All teammates must be added to Devpost submission according to event rules.

## 2. Demo principle

No slide-heavy explanation can substitute for the product.

The demo must visibly prove:

```text
many symptoms
→ one correlated incident
→ evidence-backed probable root cause
→ measurable impact
→ controlled human-approved remediation
→ verified recovery
→ user communication
```

## 3. Canonical demo dataset

Required deterministic scenario:

- services and topology seeded;
- target node `NODE-17`;
- baseline healthy telemetry;
- degradation begins;
- multiple reports arrive with distinct language/symptoms;
- reports share enough time/service/topology evidence to correlate;
- root-cause evidence points toward NODE-17;
- approved simulator action restores metrics.

The same seed/scenario must reproduce the same major result.

## 4. Four-minute script

### 0:00–0:25 — Problem

Show command center:
- many customer complaints;
- fewer technical anomalies.

Message:
“Operators often treat symptoms as separate tickets. ServiceGraph correlates people’s reports with infrastructure evidence to find the shared incident.”

### 0:25–0:55 — Citizen report

Mobile/PWA:
- citizen checks status;
- submits text or voice report;
- receipt appears;
- if voice is live, ElevenLabs path is shown truthfully.

### 0:55–1:30 — Live operations

NOC:
- report appears without reload;
- telemetry degradation visible;
- multiple reports correlate;
- incident opens/updates.

### 1:30–2:10 — Evidence + AI

Incident workspace:
- evidence graph converges reports/services/telemetry/node;
- Gemini hypothesis shows probable root cause, confidence, rationale and evidence;
- blast radius visible;
- prior memory/runbook shown if Backboard is available.

### 2:10–2:55 — Human control

Show remediation proposal:
- action;
- target;
- risk;
- expected effect.

Demonstrate unauthorized boundary if practical, then authenticated incident manager approval.

AI does NOT execute before approval.

### 2:55–3:30 — Recovery

Approved simulator action:
- state moves to REMEDIATING/VERIFYING;
- telemetry recovers;
- deterministic verification passes;
- incident resolves.

### 3:30–4:00 — Value + communication

Citizen/public status updates.
Show concise value metrics:
- duplicate reports grouped;
- estimated users affected;
- triage time reduction estimate;
- time-to-detect/resolve demo metric;
- explicit assumptions.

Close:
“ServiceGraph turns fragmented symptoms into an explainable, governed operational response.”

## 5. CGI value case requirements

One-page value case must explicitly include:
- current/problem baseline assumption;
- duplicate complaint handling cost assumption;
- analyst/operator time assumption;
- expected reduction;
- implementation/operating cost categories;
- estimated annual/period benefit;
- payback calculation;
- assumptions and uncertainty.

No unsupported “millions saved” claims.

## 6. Challenge eligibility evidence

### General
Product completeness, technical quality, usefulness and demo strength.

### CGI
- root business problem analysis;
- working build;
- value case;
- executive-style narrative;
- ability to adapt to Saturday 15:00 update.

### Civic Technology
Demo must clearly show people ↔ public institution/public-service operator connection. It is not enough that the backend resembles civic infrastructure.

### Best UI/UX
Demonstrate:
- citizen flow simplicity;
- operations information hierarchy;
- evidence graph;
- live state transitions;
- accessibility/error/degraded states.

### Gemini
Show a real Gemini call/result with structured validation and evidence grounding.

### TigerData
Show real time-series storage/query/analytics path in code/runtime.

### Auth0
Show real authenticated role/permission boundary for approval.

### ElevenLabs
Show real voice/transcription or generated voice feature if integrated.

### Vultr
Show application/runtime hosted on Vultr and deployment evidence.

### GoDaddy
Only claim if an eligible domain is actually registered/used.

## 7. Hard Definition of Done

Project is demo-ready only if all mandatory checks pass:

1. clean documented startup works;
2. citizen page loads on phone viewport;
3. report creation works;
4. report appears in operations view;
5. simulator degradation works;
6. incident creation/correlation works;
7. evidence is inspectable;
8. root-cause hypothesis is structured and evidence-linked;
9. blast radius shown;
10. remediation proposal exists;
11. unauthorized approval is rejected server-side;
12. authorized approval works;
13. simulator execution is idempotent;
14. verification reads post-action telemetry;
15. incident resolves only after verification;
16. citizen/public update reflects verified state;
17. audit history exists;
18. external-service failure has explicit degraded UI;
19. no real secrets in repository;
20. Vultr demo endpoint is reachable;
21. Devpost content is complete before deadline.

## 8. Pre-judging smoke checklist

Immediately before judging:
- phone/laptop charged;
- demo URL open;
- logged-in operator session valid;
- backup login path available;
- seed/reset command tested;
- simulator reset to known state;
- external API quotas checked;
- browser tabs minimized to required views;
- local fallback environment available if Internet/provider failure occurs;
- value-case PDF/page available;
- repository visible;
- final Devpost submission confirmed.

## 9. Q&A preparation

Expected questions:
- Why is AI needed instead of rules only?
- How do you prevent AI from taking unsafe action?
- How is confidence calculated/communicated?
- What is simulated vs real?
- Why TigerData?
- What happens if Gemini/ElevenLabs/Backboard fails?
- How does Auth0 protect privileged actions?
- How would this integrate with a real carrier/utility?
- What measurable value does it create?
- How is citizen data/location protected?
- What changes after the CGI Saturday update?

Answers must distinguish implemented facts, simulation, assumptions and future production work.
