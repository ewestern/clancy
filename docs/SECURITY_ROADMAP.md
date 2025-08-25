## SECURITY_ROADMAP

Goal: Achieve Google CASA security assessment approval for restricted scopes (Gmail/Drive) and maintain ongoing compliance. Also support a Calendar-only (sensitive) path that can launch without CASA. Reference: Google CASA overview. [Security Assessment (CASA)](https://support.google.com/cloud/answer/13465431?hl=en&ref_topic=13460882&sjid=1519972121576108690-NC)


### Phase 0 — Scoping and staging
- Decide rollout model: Calendar-first GA; restricted Gmail/Drive in Limited Access until CASA approval.
- Produce a data catalog covering all Google-derived data and retention needs.

Deliverables
- Capability-to-scope matrix and feature flags in code.
- Public Calendar-only OAuth client; Restricted Gmail/Drive OAuth client limited to test users.

### Phase 1 — Consent screen and policy readiness
- OAuth consent screen: app name, logo, verified domains, support email.
- Public website pages: Privacy Policy, Terms, Security, and Data Deletion instructions (self-serve and contact path). Include last-updated dates.
- Data usage disclosures: purpose and necessity for each scope; why narrower scopes are insufficient.
- In-product consent UX: clear per-capability language for step-up scopes.

Deliverables
- Published, versioned policies with permalinks.
- Consent screen configured; scope justifications drafted.

### Phase 2 — Security controls (OWASP ASVS-aligned)
- Identity and access
  - Enforce SSO/MFA for all admin and production access; least-privilege RBAC.
  - Separate prod vs non-prod; no real data in non-prod.
- Secrets and keys
  - Store OAuth client secrets/tokens in a secrets manager; rotate regularly.
  - Implement token lifetimes and refresh logic; revoke tokens on disconnect and account deletion.
- Data protection
  - TLS 1.2+ everywhere; encrypt at rest; restrict data access by role.
  - Data minimization: fetch headers/metadata by default; no bulk content ingestion without user action.
  - Retention schedule with automatic purge; short retention for content bodies/attachments where feasible.
- Secure coding and supply chain
  - SAST/DAST scans in CI; dependency and container image scanning; IaC scanning for Terraform.
  - Vulnerability triage SLAs (e.g., critical 7 days, high 30 days).
  - Secure build: pinned dependencies, reproducible builds, SBOM generation.
- Logging and monitoring
  - Structured logs with PII redaction; audit trails for admin/data access.
  - Alerting for auth failures, unusual API usage, excessive scope use.
- Webhooks and outbound
  - Verify Google webhook authenticity; rate limit; idempotency.
  - SSRF protections on any file download; content-type validation.

Deliverables
- Security runbook and policies (Access Control, Key Management, Incident Response, Vulnerability Management, Change Control, Vendor Risk, BCDR/Backups).
- Evidence of CI scanners and sample reports.
- Architecture and data-flow diagrams for Gmail/Drive/Calendar.

### Phase 3 — Data subject rights and deletion
- Implement user-initiated deletion flows and account disconnect handling.
- Ensure revocation of Google tokens and purge of cached data upon disconnect.
- Provide support channel for deletion requests; track SLA.

Deliverables
- Working delete/disconnect flows with screenshots.
- Retention policy and automated purge jobs.

### Phase 4 — Verification submission
- Submit OAuth brand and scopes; keep restricted client on “testing” until CASA is done.
- Provide scope-by-scope justifications and product demo video, if requested.
- Await Trust & Safety guidance to initiate CASA; they will assign a tier (expect Tier 2 first; Tier 3 possible with scale/risk increase).

Deliverables
- Verification submission package; change log for scopes.

### Phase 5 — CASA security assessment
- Engage assessor; if you have SOC 2/ISO 27001, use CASA Accelerator to reduce checks.
- Provide evidence: policies, diagrams, logs, deletion flows, monitoring, scanner reports, RBAC config, secrets lifecycle, paging/IR process.
- Remediate findings; retest until passing; obtain Letter of Validation (LOV).

Deliverables
- LOV and remediation report.

### Phase 6 — Launch and ongoing compliance
- Promote restricted client to production; enable features via flags per tenant.
- Annual recertification prep: calendar reminders, quarterly internal audits, policy reviews.
- Monitor scope usage and remove unused scopes.

Deliverables
- Post-approval rollout plan; annual compliance calendar.

### Engineering checklist (code-level actions)
- Scope minimization
  - Prefer `drive.file` for app-managed files; use `drive.readonly` only for opted-in discovery.
  - Add field masks on Drive list/get; avoid broad content downloads by default.
- Capability gating
  - Map each capability to exact scopes; enforce runtime checks; perform step-up re-auth when missing.
  - Feature flags for restricted capabilities and org discovery mode.
- Security hygiene
  - Token validation endpoint and background token health checks; backoff for 429s (already implemented patterns can be reused).
  - Centralized secret loading; no secrets in code; rotation playbooks.
  - Add audit logging for Google API calls with redaction.
- Deletion and revocation
  - Implement hard delete of Google-sourced records on user/org disconnect; revoke Google tokens.
  - Document and test deletion flow; capture evidence.

### References
- CASA overview and requirements: [Security Assessment (CASA)](https://support.google.com/cloud/answer/13465431?hl=en&ref_topic=13460882&sjid=1519972121576108690-NC)


