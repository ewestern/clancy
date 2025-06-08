Clancy is a platform for hiring AI employees. This document describes a frontend UX for interacting with the platform.

---

## Visual language (keeps the whole product coherent)

* **Layout grid:** 12-column, 1 rem gutters.
* **Corner radius:** 12 px on cards, 8 px on buttons.
* **Palette:**

  * Indigo 600 for primary actions
  * Emerald 500 for "approved / healthy" states
  * Amber 500 for warnings / pending review
  * Slate 800 text on white backgrounds; Slate 100 cards on gray windows
* **Typography:** Inter; 18 px body, 22 px section heads, 30 px page titles.
* **Icon set:** Lucide (outline style) for consistency with shadcn/ui.

---

## 1 Dashboard (“Talent Desk”)

* **Left rail (fixed 72 px):** icons only – Home, AI Employees, Approvals, Knowledge, Settings.
* **Top bar:** company logo left, search field center ("Find people or AI employees…"), profile bubble right.
* **Hero strip:** "Good morning, Alex—your team at a glance."

  * **KPI cards** (4 across, responsive):

    * Humans → 36
    * AI Employees → 7 (green badge "+1 today")
    * Tasks awaiting approval → 3 (amber)
    * Knowledge items added last 24 h → 128
* **AI Employee roster grid** (card per entity): name, avatar (circular robot icon), role tag ("AR Clerk"), last-run timestamp, status pill (green "Idle", blue "Running", red "Error"). Hover shows three quick actions: *Chat*, *Permissions*, *Deactivate*.

---

## 2 "Hire an AI Employee" wizard (now adaptive & iterative)

_The wizard remains a full-width modal (<960 px) but steps can **repeat** or **fork** based on Graph-Creator prompts.  A persistent **progress meter** shows overall completeness._

### Step 1 · Job description (unchanged)
* Paste box + verb cloud side panel.
* On "Continue" the backend _(Graph Creator)_ analyses JD and either:
  * jumps directly to **Tool Choices** if information is sufficient, or
  * returns one or more **Clarification Prompts** (see below).

### Step 2 · Clarification Prompts  *(_iterates until gaps resolved_)*
Two prompt modes, rendered by the same **Clarification Panel** component that slides in from the right 30 % of modal width.

| Prompt kind | UI widget | Example |
|-------------|-----------|---------|
| `options`   | Radio/Checkbox card group, one per option, with description tooltip. <br/>Optional "Why we ask" link shows reasoning note. | "Select the CRM your company uses" ‹Salesforce› ‹HubSpot› ‹Zoho› ‹Other› |
| `questions` | Stacked textareas, each labelled question; supports markdown.  Placeholder shows example answer. | "Describe the approval chain for invoices." |

*Buttons:* **Continue** (validates schema) · **Skip** (saves `null`/default) · **Cancel hiring**.
*After submit* the panel closes → JD parse re-runs → either new prompts are queued or wizard advances to Tool Choices.

> **Progress meter** (top of modal): "Information completeness • ███░░ 60 %".  Updates after each iteration.

### Step 3 · Tool Choices  *(formerly Step 2)*
* Same category-driven cards but now **pre-filled** with any selections made in Clarification Prompts.
* A subtle badge "auto-suggested" marks choices recommended by the LLM.
* Primary button renamed **"Next → Workflow"**.

### Step 4 · Proposed Workflow  *(formerly Step 3)*
* Unchanged card stack.
* If user clicks "Back", they may re-enter Tool Choices **or** Clarification Prompts depending on what changed.

### Step 5 · Permissions & Integrations  *(formerly Step 4)*
### Step 6 · Communication & Oversight  *(formerly Step 5)*
### Step 7 · Review & Hire  *(formerly Step 6)*

_The numeric labels are for narrative only; the UI displays dynamic breadcrumbs: "Job Description → Clarifications (2) → Tools → Workflow → ..."._

---

### New Shared Component · Clarification Panel
* **Open state:** overlays wizard content with 30 % slide-in; darkens rest of modal.
* **Header:** icon (light-bulb for questions, sliders for options) + title ("Help us fill in the blanks").
* **Body:** dynamically renders form controls from `inputSchema`.
* **Footer buttons:** _Skip_ · _Cancel_ (secondary)  _Continue_ (primary).
* **Validation:** client-side JSON-Schema check; errors inline under fields.

When the wizard reopens the panel (next iteration) previously answered prompts show check-marks; unanswered prompt count appears in breadcrumb ("Clarifications (1 left)").

---

### Impact on Chat & Approval Drawer
* During later HITL pauses (after employee deployed) the drawer reuses the **Clarification Panel** component so users see the *same* UX pattern for approvals and refinements.

---

_No other dashboard sections change.  Wizard logic is now driven by Graph-Creator responses, making the UI flexible for future skill prompts without redesign._

## 3 AI Employee Profile Page

* **Header band:** robot avatar left; name + role; small badge "v2.3" for graph version.
* **Three tabs:**

  1. **Activity** (default) – timeline feed (Slack-style) every NodeFinished event with color dots.
  2. **Permissions** – same accordion from wizard but editable. Audit log button top-right.
  3. **Knowledge** – table: "Fact", "Source node", "Last referenced", "Visibility". Filters on scopes & date.
* **Right sidebar:**

  * "Next run" countdown with pause / resume toggle.
  * Health widget: success rate 30-day sparkline, avg latency, last error message collapsed.

---

## 4 Chat & Approval Drawer (universal component)

* Slide-over from right (40 % of screen) when user clicks *Chat* on any employee card.

  * **Top:** employee avatar + presence ("Typing…") indicator.
  * **Middle:** message bubbles; employee messages have faint gradient, human messages plain.
  * **Attachment chip** when employee sends artefact (e.g., PDF invoice) – click opens in modal viewer.
  * **Approval banner** appears inline whenever the employee pauses for HITL – two buttons: ✔ Approve, ✖ Request changes (prompts for comment).
  * **Footer:** message box with quick-reply buttons (Approve, Pause, Adjust schedule) as pills.

---

## 5 Approvals Queue

* Table view with columns: Request ID, employee, Summary ("Send $14 k invoice to Acme"), SLA countdown (pill turns red under 1 h), Approve / Reject inline buttons.
* Row click opens the Chat & Approval Drawer pre-filtered to that run.

---

## 6 Knowledge Explorer

* Google-Docs-style interface:

  * **Left tree pane** – tags/folders auto-generated from scopes (`finance`, `sales`, `public`).
  * **Main pane** – searchable list with icon (PDF, txt), title, last modified, contributing employee.
  * Click opens doc viewer with right sidebar showing provenance chain: producing run → node → original source file link.

---

## 7 Error Inbox (surface only when needed)

* Bell icon with red dot in top bar. Pull-down shows cards: employee name, error snippet, "Retry" and "Open log" buttons.
* "Retry" enqueues a RunIntent retry with same payload; "Open log" deep-links to employee Profile › Activity filtered to the failed run.

---

### Flow summary (how a user experiences it)

1. **Dashboard ➜ "Hire an employee."** Manager pastes JD, selects tools for each category, then generates the proposal and breezes through the remaining steps without touching graphs.
2. **employee goes live.** Cards update in real-time; any missing auth shows amber "Needs connect".
3. **When approval needed,** manager gets Slack DM; clicking it opens the Chat Drawer inside Clancy; they approve with one click.
4. **Knowledge grows transparently;** manager searches Knowledge Explorer and sees artefacts tagged by employee.
5. **If something breaks,** the Error Inbox pulses; they retry or open the employee's Activity tab to inspect the run trace.

**Result:** From the manager's viewpoint it feels like onboarding and supervising a real teammate—permissions, schedules, and comms in plain language—while all DSL, events, and LangGraph complexity stay under the hood.
