# 06 — Git & Integration Rules

Version: 0.1.0  
Status: NORMATIVE

## 1. Purpose

Preserve a clear hackathon-time history, prevent agents from overwriting each other, and keep `main` demonstrable.

## 2. Branch policy

Canonical branches:

- `main` — accepted integration baseline;
- `feature/frontend`;
- `feature/backend-core`;
- `feature/data-telemetry`;
- `feature/ai-engine`;
- `feature/auth-voice`;
- `feature/quality`;
- `feature/infrastructure`;
- temporary `integration/*` branches when required.

No implementation agent pushes feature work directly to `main`.

## 3. Commit policy

Commit after a coherent, reviewable unit.

Good examples:

```text
feat(web): add citizen report shell
feat(api): add incident list contract route
feat(data): add telemetry hypertable migration
feat(ai): validate root-cause Gemini output
test(auth): reject unauthorized remediation approval
fix(simulator): make node17 recovery deterministic
docs: freeze remediation proposal contract
```

Avoid:
- “update”
- “stuff”
- “final”
- enormous unrelated commits
- artificial one-line commit spam

Do not rewrite published history merely to make it look cleaner.

## 4. Hackathon traceability

Because event rules may inspect commit history:
- all project code must be authored during the allowed event window;
- do not import an old private project wholesale;
- open-source dependencies/frameworks are allowed according to event rules, but existing proprietary project code is not copied into this repository;
- keep meaningful timestamps/history;
- never falsify authorship or commit dates.

## 5. Pull requests

Every feature branch hands off through a PR to `main`.

PR body must contain:

```text
Agent:
Scope:
Base commit:
Files changed:
Contracts consumed:
Tests run:
Known limitations:
External integration status:
Screens/demo affected:
```

## 6. Merge strategy

Preferred: **merge commit**, not squash, so coherent feature-branch commit history remains visible.

Before merge:
1. branch is current enough to integrate;
2. build/typecheck passes for affected work;
3. contract tests pass;
4. no secret scan finding;
5. integration agent verifies demo-critical path if affected.

## 7. Conflict policy

Never resolve a semantic contract conflict by choosing one agent’s version arbitrarily.

Conflict categories:
- mechanical formatting/import conflict → A7 may resolve;
- public type/API/schema conflict → escalate;
- DB migration semantic conflict → escalate;
- role/permission conflict → escalate;
- UI copy/layout conflict that does not change flow → UI owner + A7 may resolve.

## 8. Main health

`main` should be able to:
- install;
- typecheck;
- build;
- start documented services;
- run smoke tests.

If a merge breaks `main`, revert or fix immediately before adding new scope.

## 9. Secrets

Never commit:
- `.env`;
- private SSH keys;
- API tokens;
- database passwords;
- Auth0 client secrets;
- Gemini/ElevenLabs/Backboard/Vultr credentials.

Commit:
- `.env.example`;
- variable names;
- setup instructions;
- public identifiers only when safe.

If a secret is committed:
1. rotate/revoke it immediately;
2. remove from code/history as appropriate;
3. document incident without exposing value.

## 10. Tags / checkpoints

Recommended demo checkpoints:

- `checkpoint/contracts-v1`
- `checkpoint/local-loop`
- `checkpoint/sponsor-integrations`
- `demo-final`

Tag only known-good commits.

## 11. Integration cadence

A7 should integrate small compatible PRs continuously rather than waiting for all agents to finish.

Priority order:
1. contracts;
2. app shells;
3. DB/simulator;
4. API;
5. citizen report;
6. incident view;
7. AI;
8. auth approval;
9. remediation/verification;
10. voice/memory;
11. polish.

## 12. Completion report

Every merged task retains:
- PR;
- commits;
- test evidence;
- known limitations.

The goal is an auditable build path from empty repository to final demo.
