Clancy is a platform for hiring AI employees. This document describes a frontend UX for interacting with the platform.

---

## Visual language (keeps the whole product coherent)

* **Layout grid:** 12-column, 1 rem gutters.
* **Corner radius:** 12 px on cards, 8 px on buttons.
* **Palette:**

  * Indigo 600 for primary actions
  * Emerald 500 for “approved / healthy” states
  * Amber 500 for warnings / pending review
  * Slate 800 text on white backgrounds; Slate 100 cards on gray windows
* **Typography:** Inter; 18 px body, 22 px section heads, 30 px page titles.
* **Icon set:** Lucide (outline style) for consistency with shadcn/ui.

---

## 1 Dashboard (“Talent Desk”)

* **Left rail (fixed 72 px):** icons only – Home, AI Employees, Approvals, Knowledge, Settings.
* **Top bar:** company logo left, search field center (“Find people or AI employees…”), profile bubble right.
* **Hero strip:** “Good morning, Alex—your team at a glance.”

  * **KPI cards** (4 across, responsive):

    * Humans → 36
    * AI Employees → 7 (green badge “+1 today”)
    * Tasks awaiting approval → 3 (amber)
    * Knowledge items added last 24 h → 128
* **AI Employee roster grid** (card per entity): name, avatar (circular robot icon), role tag (“AR Clerk”), last-run timestamp, status pill (green “Idle”, blue “Running”, red “Error”).  Hover shows three quick actions: *Chat*, *Permissions*, *Deactivate*.

---

## 2 “Hire an AI Employee" wizard (5 steps, full-width modal <960 px)

### Step 1 Job description

* Two-column: large multiline paste box (left 8 columns) + side panel (right 4 columns) that live-updates a *word cloud* of core verbs the LLM detects under the header “What we’ll automate”.
* **Primary button:** “Generate Proposal”.

### Step 2 Proposed Workflow

* Card stack, each card = high-level task (“Create monthly invoice”, “Post Slack summary”).

  * Badge showing estimated frequency (“1× / month”), run time (“<2 min”).
  * Mini chevron toggles to reveal sub-steps (renders from DSL).
* **Footrail:** breadcrumbs + “Back / Continue”.

### Step 3 Permissions & Integrations

* **Accordion list** grouped by provider (QuickBooks, Slack).

  * Each row: provider logo, minimal scope toggle (five-segment slider: *None → Read → Write → Admin*), gray text explaining why it’s needed (“Invoice.write — to create draft invoices”).
  * Right side: “Connect” button opens OAuth popup if not yet authorized (shows a green linked icon when done).
  * Top info bar: indigo shield icon + copy “Scopes default to least-privilege; widen only if necessary.”

### Step 4 Communication & Oversight

* Two-pane selector:

  * **Notifications:** checkbox matrix (Slack DM, Email, SMS) × events (Task complete, Needs review, Error).
  * **Human-in-loop:** toggle “Require approval before external send” with numeric field for SLA (hours).
* **Scheduler chip** (optional): “Run on” cron picker; defaults to “On demand”.

### Step 5 Review & Hire

* **Summary card**: avatar, role title, monthly cost estimate (token + runtime), integrations, next-steps timeline.
* Checkbox “Pin to dashboard KPIs”.
* Big emerald button “Hire an AI employee”.  On click shows confetti burst animation + redirect to Employee Profile.

---

## 3 AI Employee Profile Page

* **Header band:** robot avatar left; name + role; small badge “v2.3” for graph version.
* **Three tabs:**

  1. **Activity** (default) – timeline feed (Slack-style) every NodeFinished event with color dots.
  2. **Permissions** – same accordion from wizard but editable. Audit log button top-right.
  3. **Knowledge** – table: “Fact”, “Source node”, “Last referenced”, “Visibility”. Filters on scopes & date.
* **Right sidebar:**

  * “Next run” countdown with pause / resume toggle.
  * Health widget: success rate 30-day sparkline, avg latency, last error message collapsed.

---

## 4 Chat & Approval Drawer (universal component)

* Slide-over from right (40 % of screen) when user clicks *Chat* on any employee card.

  * **Top:** employee avatar + presence (“Typing…”) indicator.
  * **Middle:** message bubbles; employee messages have faint gradient, human messages plain.
  * **Attachment chip** when employee sends artefact (e.g., PDF invoice) – click opens in modal viewer.
  * **Approval banner** appears inline whenever the employee pauses for HITL – two buttons: ✔ Approve, ✖ Request changes (prompts for comment).
  * **Footer:** message box with quick-reply buttons (Approve, Pause, Adjust schedule) as pills.

---

## 5 Approvals Queue

* Table view with columns: Request ID, employee, Summary (“Send \$14 k invoice to Acme”), SLA countdown (pill turns red under 1 h), Approve / Reject inline buttons.
* Row click opens the Chat & Approval Drawer pre-filtered to that run.

---

## 6 Knowledge Explorer

* Google-Docs-style interface:

  * **Left tree pane** – tags/folders auto-generated from scopes (`finance`, `sales`, `public`).
  * **Main pane** – searchable list with icon (PDF, txt), title, last modified, contributing employee.
  * Click opens doc viewer with right sidebar showing provenance chain: producing run → node → original source file link.

---

## 7 Error Inbox (surface only when needed)

* Bell icon with red dot in top bar. Pull-down shows cards: employee name, error snippet, “Retry” and “Open log” buttons.
* “Retry” enqueues a RunIntent retry with same payload; “Open log” deep-links to employee Profile › Activity filtered to the failed run.

---

### Flow summary (how a user experiences it)

1. **Dashboard ➜ “Hire an employee.”** Manager pastes JD, breezes through 5-step wizard without touching graphs.
2. **employee goes live.** Cards update in real-time; any missing auth shows amber “Needs connect”.
3. **When approval needed,** manager gets Slack DM; clicking it opens the Chat Drawer inside Clancy; they approve with one click.
4. **Knowledge grows transparently;** manager searches Knowledge Explorer and sees artefacts tagged by employee.
5. **If something breaks,** the Error Inbox pulses; they retry or open the employee’s Activity tab to inspect the run trace.

**Result:** From the manager’s viewpoint it feels like onboarding and supervising a real teammate—permissions, schedules, and comms in plain language—while all DSL, events, and LangGraph complexity stay under the hood.
