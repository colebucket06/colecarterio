# Pathways.io — Prototype to Production Roadmap

This roadmap maps the current prototype (React SPA, client-side Zustand store, accounts and data living in the browser bundle/localStorage, static hosting on GitHub Pages) to a production system with real authentication, real data management, and industry-standard security. It is organized around the three pillars you named, followed by a phased delivery plan.

---

## Where the prototype stands today

Everything runs in the browser. Accounts (including passwords) ship inside the JavaScript bundle; projects, diagrams, test cases, executions, issues, bugs, and attachments live in Zustand state, persisted to localStorage and to exported project JSON files; attachments are base64 data-URLs inside that state; "email" notifications queue in a simulated outbox; role checks happen in the UI only. All of this was the right call for a prototype — it demos every workflow with zero infrastructure — but each item on that list is exactly what production replaces. The good news: the UI, the data shapes, and the workflows you have refined are the hard part, and they carry over nearly unchanged. Production work is almost entirely *behind* the screens you already have.

---

## Pillar 1 — Full User Account Administration (with Google / O365 sign-in)

**Do not build authentication yourself.** Use a managed identity provider (IdP) that speaks OpenID Connect (OIDC), and let it handle passwords, MFA, brute-force lockout, and the Google/Microsoft federation.

**Recommended options** (any of these fits; pick one):

| Option | Why it fits |
| --- | --- |
| **Supabase Auth** | Comes bundled with the database + storage recommendation in Pillar 2 — one platform for auth, data, and files. Google and Microsoft (Azure AD / O365) sign-in are configuration toggles. Best simplicity-per-dollar for a solo builder. |
| **Auth0 / Clerk** | Pure identity platforms with polished hosted login pages, organization/role features, and every social + enterprise connection. Slightly more moving parts since data lives elsewhere. |
| **Microsoft Entra External ID** | Natural if your user base is O365-heavy enterprises; heavier to configure. |

**How the flow works in the app:**

1. The SPA redirects to the IdP using the **Authorization Code + PKCE** flow (the standard for browser apps — no client secrets in the bundle).
2. The user signs in with Google, a Microsoft/O365 account, or email+password managed by the IdP. MFA and password policy are IdP settings, not your code.
3. The SPA receives a short-lived **JWT access token**; every API call carries it; the backend validates the signature and reads identity + role claims. Nothing about who the user is is ever trusted from the client.

**Preserving your access-request/approval model** — this is the part you've already designed well, and it maps cleanly:

- First sign-in with an external account creates a user row with `status = pending` and no role.
- Admins/Owner get a real email + an in-app inbox entry (your existing approval inbox UI, now backed by the database).
- Approval assigns a role (Owner / Admin / User / Viewer — same roles you have) which becomes a claim the backend enforces.
- Disabling a user flips a flag the backend checks on every request — no more client-side gating.

**What gets deleted:** every password in `store.js`, the client-side password policy checker (the IdP owns it), and the "Owner can view passwords" feature — in production nobody, including the Owner, can see a password; the equivalent admin power is "force reset" and "revoke sessions."

---

## Pillar 2 — Data Management (documents, attachments, diagrams, test cases)

**Backend recommendation:** **Supabase** (managed Postgres + Auth + file Storage + row-level security + realtime) as the fastest credible path, or a **Node API (Fastify/NestJS) + Postgres + S3** if you want full control. The rest of this section applies to either; Supabase just collapses three services into one.

**Data model** — your Zustand store is already the schema. It translates almost table-for-table:

```
users(id, email, name, role, status, profile_json, created_at)
projects(id, name, description, owner_id, settings_json, created_at)
project_members(project_id, user_id, role)          -- editor/viewer + community sharing
diagrams(id, project_id, name, nodes_jsonb, edges_jsonb, shared, updated_at, version)
suites(id, project_id, name, requirement_types_jsonb, shared)
cases(id, project_id, suite_id NULL, name, objective, preconditions, links_jsonb, assigned_to, due_date, shared)
steps(id, case_id, position, action, expected, requirements_jsonb, preds_jsonb, target_ids_jsonb, shared)
executions(id, case_id, plan_id NULL, started_at, ended_at, executed_by, overall_status, comment, step_results_jsonb)
plans(id, project_id, name, case_ids_jsonb, history_jsonb)
issues(id, project_id, seq, case_id, step_id, title, description, status, assigned_to, resolution, bug_id)
bugs(id, project_id, seq, title, description, severity, status, case_id, step_id, target_ids_jsonb)
attachments(id, owner_type, owner_id, name, mime, size, storage_key, uploaded_by, created_at)
change_log(id, project_id, ts, actor_id, category, action, summary)   -- server-written, append-only
notifications(id, to_user, kind, subject, body, read, created_at)
```

Diagrams' nodes/edges stay as JSONB — they are documents, not relational data, and Postgres JSONB handles them well (and lets you query into them later, e.g. "find diagrams containing Maximo attribution").

**Attachments become real files.** Replace base64 data-URLs with uploads to object storage (Supabase Storage or S3): the client uploads via a signed URL, the database keeps only metadata + storage key, and downloads use short-lived signed URLs. Add size caps, MIME validation, and virus scanning (ClamAV or the storage provider's scanning). This alone will shrink project payloads by 10–100×.

**How the SPA changes.** The Zustand store stays as the in-memory working state — the change is what's behind it. Actions that currently just `set(...)` also call the API (optimistic update, rollback on failure). "Save Project" becomes automatic persistence; export/import stays as a backup/portability feature and becomes your **migration path**: a one-time import endpoint ingests today's project JSON files so nothing you've built in the prototype is lost.

**Also unlocked at this layer:** the simulated email outbox becomes real (Resend / AWS SES / SendGrid — assignment notices, due-date nags, issue-validation requests you already generate), automated nightly Postgres backups with point-in-time recovery, and — later, if you want it — live multi-user collaboration via Supabase Realtime or websockets, since edits already flow through a single store.

---

## Pillar 3 — Security (industry-standard protections)

Layered, in rough priority order:

**Identity & session** — handled mostly by Pillar 1: OIDC + PKCE, short-lived JWTs with refresh rotation, MFA available (require it for Owner/Admin), IdP-managed lockout and breached-password checks.

**Authorization on the server.** This is the single biggest conceptual shift: every permission the UI enforces today (roles, project membership, 🌐 shared flags, Owner-only views) must be re-enforced in the backend — with Supabase that's **Row-Level Security policies** (e.g. *a user sees a diagram row only if they're a member of its project, or the row is shared to their community*); with a custom API it's middleware on every route. The client checks remain purely cosmetic.

**Transport & headers.** HTTPS everywhere (Pages already provides it; the API host will too), HSTS, a strict Content-Security-Policy, `X-Frame-Options: DENY`, and locked-down CORS (API accepts only `https://colecarter.io`).

**OWASP Top-10 hygiene.** Parameterized queries/ORM only (no string SQL); schema-validate every API input (zod or equivalent); rate limiting on auth-adjacent and write endpoints; generic error messages outward, detailed logs inward.

**Data protection.** Encryption at rest (default on managed Postgres/storage — verify it's on), per-project tenant isolation via the RLS/membership checks above, server-side append-only audit log (your change log, now tamper-resistant with actor identity from the token), user data export + delete for privacy compliance, secrets only in environment/secret managers — never in the repo (the PAT lesson from this project, generalized).

**Attachment safety.** Validate MIME and extension server-side, cap sizes, virus-scan, and serve user uploads from the storage domain via signed URLs — never inline from your app origin — so an uploaded HTML/SVG file can't become stored XSS.

**Supply chain & monitoring.** Dependabot + `npm audit` in CI, pinned dependencies, Sentry (or similar) for error tracking on both SPA and API, uptime monitoring with alerts, and a periodic dependency/security review. Before real users bring real data: run an automated scanner (OWASP ZAP) against staging and do a threat-model pass on the approval, sharing, and attachment flows — those are the attack surface.

---

## Phased delivery plan

**Phase 1 — Identity (≈1–2 weeks part-time).** Create the Supabase project (or IdP), enable Google + Microsoft providers, swap the landing page's sign-in for the OIDC flow, create the `users` table with the pending→approved workflow, and delete client-side credentials. The app otherwise still runs on local data — this phase is independently shippable.

**Phase 2 — Data (≈2–4 weeks part-time).** Stand up the schema above, wire store actions to the API with optimistic updates, move attachments to object storage, build the one-time importer for existing project JSON files, turn on real email. Ship when a project you create on your desktop appears on your phone.

**Phase 3 — Hardening (≈1–2 weeks).** RLS/authorization policies for every table, security headers + CORS, rate limits, backups verified by an actual restore drill, Sentry + uptime alerts, ZAP scan against staging, require MFA for Owner/Admin.

**Phase 4 — Scale & polish (ongoing).** Realtime co-editing, PWA/mobile packaging, reporting dashboards, retention policies, and a staging environment with the Playwright suite from this session running as CI end-to-end tests (they already cover most workflows — they become your regression wall).

**Operating cost ballpark:** domain (owned) + GitHub Pages (free) + Supabase/API hosting (free tier to start, roughly the $25/month class when you outgrow it) + email (free tier at your volume). Real money only enters with real scale.

**Architecture note:** the frontend can stay exactly where it is — a static SPA on GitHub Pages behind colecarter.io — talking to the API over HTTPS. Nothing about the deployment pipeline you've built this week gets thrown away.
