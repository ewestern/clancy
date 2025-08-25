## SCOPE_REFINEMENT

Purpose: Maximize Google integration capabilities while minimizing restricted scopes and overall risk. This enables a staged rollout (Calendar-first) and a leaner CASA assessment footprint. Reference: Google Security Assessment (CASA) overview. [Security Assessment (CASA)](https://support.google.com/cloud/answer/13465431?hl=en&ref_topic=13460882&sjid=1519972121576108690-NC)

### Current capabilities and scopes (as implemented)
- Gmail (restricted): `gmail.readonly`, `gmail.compose`, `gmail.send`, `gmail.labels`
- Drive (restricted): `drive.readonly`, `drive.file`
- Calendar (sensitive): `calendar`, `calendar.readonly`

Notes
- “Restricted” scopes require CASA security assessment; “Sensitive” scopes require standard OAuth verification but not CASA.
- Narrower Gmail/Drive scopes still remain “restricted”, but reducing breadth and data access reduces risk and likely effort.

### Strategy overview
1) Split into two OAuth clients/experiences
   - Public “Calendar-only” client (sensitive-only) to unblock adoption early.
   - “Gmail/Drive enhanced” client (restricted) limited to trusted testers until CASA is completed.

2) Incremental authorization and step-up re-auth
   - Request minimal scopes initially; when a user invokes a restricted capability for the first time, prompt for additional scopes.
   - Persist capability-level scope checks and only request what is missing.

3) Capability gating via feature flags (operational, not required by CASA)
   - Purpose: kill switch and policy control, not a substitute for step-up least privilege.
   - Default: After CASA approval, restricted capabilities are ON by default except where tenant admin policy blocks them.
   - High-risk examples: Gmail read bodies/attachments; Drive org discovery (`drive.readonly` and `drive.drives.*`).
   - Allow Calendar-only tenants to operate without any restricted scopes.

4) Minimize data pulled and stored
   - Prefer metadata/header-only where possible; fetch full content only on demand.
   - Avoid caching message/file bodies unless strictly necessary; if cached, enforce short retention.

### Gmail refinements (restricted)
- Read/search defaults
  - Default to retrieving message metadata/headers instead of full bodies for search and get operations. Use the API’s `format=metadata` with a tight `metadataHeaders` list by default; only fetch `full` or `raw` when explicitly required by the invoking action.
  - Avoid fetching attachments by default; fetch only when requested.
- Compose vs send vs read
  - Separate capabilities so users who only need to send mail do not grant read scopes: use only `gmail.send` (+ optional `gmail.compose` for drafts) without `gmail.readonly`.
  - Keep label operations (`gmail.labels`) isolated behind their own step-up path; do not bundle with read or send.
- Webhooks/notifications
  - Prefer push/watch patterns that do not require broad content retrieval. Store and use `historyId` to diff changes and pull only the necessary messages.

Implementation checklist (Gmail)
- Update default retrieval in `gmailSearch` and `gmailMessagesGet` to `format=metadata` and restrict `metadataHeaders`.
- Ensure “Send Email” and “Create/Send Draft” capabilities only request `gmail.send`/`gmail.compose` and do not implicitly depend on `gmail.readonly`.
- Add step-up flows for `gmail.labels` and for any operation that needs full message bodies or attachments.
- Telemetry: record which Gmail capabilities are actually used (to justify scope removal later).

### Drive refinements (restricted)
- Two modes
  - App-managed files mode: Prefer `drive.file` where feasible; operations are limited to files the app created/opened. This significantly limits blast radius.
  - Org discovery mode: Use `drive.readonly` (and avoid `drive` full access) only for tenants who explicitly enable organization-wide search.
- Listing and comments
  - Keep comments create/update behind `drive.file` where possible.
  - Avoid `drive.drives.*` unless the product truly needs shared-drive metadata; otherwise, rely on `files.*` with filters.
- Response minimization
  - Use the `fields` mask to limit returned properties; avoid downloading/exporting file content unless requested by the user’s action.

Implementation checklist (Drive)
- Introduce a tenant/org setting to pick “App-managed” vs “Org discovery”. Default to App-managed.
- Scope bind capabilities:
  - App-managed: `drive.file` only; restrict list queries to app-managed files.
  - Org discovery: `drive.readonly`; gate behind feature flag and admin acknowledgment.
- Remove or gate `drive.drives.*` calls unless required; prefer `files.*`.
- Telemetry: track which Drive features are actually used per tenant.

### Calendar refinements (sensitive)
- Keep `calendar.readonly` for listing and `calendar` for event creation. This path does not require CASA.
- Provide a Calendar-only onboarding path that does not request any Gmail/Drive scopes.

### Incremental authorization plan
- Minimal initial scopes by experience
  - Calendar-only: `calendar.readonly` and `calendar` (if event creation is needed).
  - Gmail send-only: `gmail.send` (+ optional `gmail.compose` if drafts are needed); no read.
  - Drive app-managed: `drive.file` only.
- Step-up prompts
  - When a user triggers a capability that needs a missing scope (e.g., Gmail search that requires read), prompt for only that scope at that time.

### Consent screen and disclosure alignment
- For every scope, document purpose and why narrower alternatives are insufficient.
- Show per-capability justifications in-product so users understand step-up prompts.

### What this enables
- Calendar-first GA without CASA.
- Restricted Gmail/Drive capabilities available to testers and selected tenants while CASA is in progress.
- Lower risk posture for CASA (narrow scopes, minimal data access-by-default, gated features).

### Reference
- CASA Security Assessment and tiering overview: [Security Assessment (CASA)](https://support.google.com/cloud/answer/13465431?hl=en&ref_topic=13460882&sjid=1519972121576108690-NC)


