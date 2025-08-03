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

## 2 "Hire an AI Employee" wizard (collaborative & iterative)

_The wizard is a full-width modal (max-w-7xl) with a **two-pane layout** that adapts to different phases. The left pane maintains persistent chat with the AI assistant, while the right pane shows phase-specific content._

### Overall Structure
* **Full-screen modal** with rounded corners and shadow
* **Two-pane layout:**
  * **Left pane (1/3 width):** Chat interface with AI assistant for questions and feedback
  * **Right pane (2/3 width):** Dynamic content based on current phase
* **Header:** Title, description, and close button
* **Footer:** Connection status and completion button

### Phase 1 · Job Description
* **Single-pane layout** for initial input
* Large textarea with placeholder examples
* Character count indicator (minimum 20 characters)
* **"Generate Workflows"** button with loading state
* On submit, transitions to workflows phase and initiates Graph Creator analysis

### Phase 2 · Workflows
* **Two-pane layout** begins here
* **Left pane:** Chat interface appears for user-AI collaboration
* **Right pane:** Shows workflow analysis results
  * **Loading state:** Progress indicator with animated icons and tips
  * **Results state:** Simple workflow cards showing:
    * Workflow description
    * Numbered steps list
    * Activation conditions
* Graph Creator analyzes job description and returns structured workflows

### Phase 3 · Connect
* **Left pane:** Continued chat for refinement and questions
* **Right pane:** Agent overview display
  * **Provider cards** generated from OAuth audit results:
    * Provider name and icon
    * Connection status (disconnected/connecting/connected)
    * **"Connect"** button opens OAuth flow in new tab
  * **Agent cards** with:
    * Agent description (human-readable)
    * Visual flow diagram instead of technical capabilities
    * Provider logos representing integrations needed
  * **Unsatisfied workflows** (if any) with explanations
* **Auto-triggers OAuth audit:** When agents are received, system calls `/oauth/audit` to identify required connections
* Transitions to ready phase when all providers are connected.

### Phase 4 · Ready
* **Left pane:** Chat continues for final adjustments
* **Right pane:** 
  * **Final Inputs:** Provide a name for the AI Employee
  * **Agent Cards:** Continue displaying Agent Cards
  * **Completion logic:** Can proceed when name is provided.

### Interactive Elements
* **Chat interface:** 
  * Message bubbles (user vs agent styling)
  * Input field with send button
  * Processing indicator during AI responses
  * Handles Graph Creator resume events for iterative refinement

* **Provider connections:**
  * OAuth flows open in new tabs.
  * Real-time connection status updates
  * Account information display after successful connection

* **Footer status:**
  * Shows number of connected providers
  * **"🎉 Hire AI Employee"** button (enabled when requirements met)

### Backend Integration
* **Graph Creator events:** Handles `AiEmployeeStateUpdate` events with different phases
* **OAuth audit:** Automatic capability analysis for required provider connections
* **WebSocket communication:** Real-time updates for connection status and AI responses
* **Resume capability:** Users can provide feedback to refine agent configuration

### Progress Flow
1. **Job Description** → User describes role requirements
2. **Workflows** → AI analyzes and breaks down into automated processes  
3. **Connect** → Shows agent flow diagrams + identifies required integrations
4. **Ready** → User connects required providers via OAuth
5. **Complete** → AI employee is hired and activated

_The wizard emphasizes **human-AI collaboration** through persistent chat, **visual clarity** through flow diagrams instead of technical jargon, and **seamless integration setup** through automated OAuth audit and connection flows._

---

### Wizard Component Architecture
* **HiringWizard** - Main modal container with phase management
* **ChatInterface** - Persistent left-pane chat with AI assistant
* **SimpleWorkflowDisplay** - Shows initial workflow breakdown cards
* **AgentConnectDisplay** - Visual agent flow diagrams with provider integration
* **PhaseProgressIndicator** - Loading states with contextual tips
* **ProviderCards** - OAuth connection interface for required integrations

### Integration with Backend Systems
* **Graph Creator:** Drives wizard progression through WebSocket events
* **Connect Hub:** OAuth audit and provider connection management  
* **Agents Core:** Final AI employee deployment and activation
* **Real-time updates:** WebSocket communication for seamless user experience

---

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
