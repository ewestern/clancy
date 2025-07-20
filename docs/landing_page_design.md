# Clancy AI Landing Page Design Document

## Purpose
This document captures the messaging pillars and visual/UX specification for the public-facing landing page of **Clancy AI**. It is intended to guide both marketing copywriters and front-end developers.

---

## 1. Differentiating Features (User-Centric Talking Points)
Frame these benefits in plain language that resonates with business and technical buyers alike.

1. **Deploy Digital Employees That Own Complete Business Processes** – Digital employees coordinate multi-step processes end-to-end, freeing humans for higher-value work.
2. **Works with the Tools You Already Love** – Out-of-the-box connectors for Slack, Google Workspace, QuickBooks, Canvas, and dozens more mean zero rip-and-replace.
3. **Remembers Everything, Gets Smarter Over Time** – Each digital employee builds context about your customers, processes, and preferences, delivering increasingly personalized results.
4. **Enterprise-Grade Security & Compliance** – SSO with Auth0, granular permissions, and no raw credential exposure keep IT and security teams happy.
5. **Scales Effortlessly** – Whether you’re automating one workflow or thousands, Clancy grows with you—no extra setup required.
6. **Fast Time-to-Value** – Deploy your first digital employee in minutes and start saving hours of manual effort from day one.

Use these benefits throughout hero copy, feature sections, and meta descriptions.

### Example Value Propositions (Internal Reference)

The following examples illustrate how Clancy's digital employees orchestrate multi-system processes. Use these for future case studies—showcasing specific integration capabilities rather than persona language.

| Use Case | Before Clancy | With Clancy |
|----------|---------------|-------------|
| **E-commerce Operations** | Manually update inventory across Shopify, QuickBooks, and social channels<br/>• Time-consuming SKU updates<br/>• Risk of pricing inconsistencies<br/>• Limited staff for multi-channel management | **"Update our winter collection pricing"** → Digital employee handles Shopify, QuickBooks, Instagram, and Facebook updates automatically<br/>• **Multi-Channel Sync** – One command updates all platforms<br/>• **Consistency Guaranteed** – No pricing mismatches<br/>• **Instant Execution** – Hours of work completed in minutes |
| **Student Services Coordination** | Coordinators manually sync Canvas assignments with Google Classroom and notify teachers<br/>• Manual data entry between systems<br/>• Delayed teacher notifications<br/>• Risk of missing assignments | **Digital employee detects new Canvas assignments** → syncs to Google Classroom → posts in teacher Slack channels<br/>• **Real-Time Detection** – Instant assignment sync<br/>• **Automated Notifications** – Teachers informed immediately<br/>• **Zero Manual Work** – Complete hands-off operation |
| **Customer Onboarding** | Account managers juggle Slack welcomes, QuickBooks setup, and calendar coordination<br/>• Multiple manual touchpoints<br/>• Inconsistent experience<br/>• High coordinator workload | **Digital employee orchestrates complete onboarding**: Slack welcome → QuickBooks account creation → calendar scheduling → follow-up reminders<br/>• **End-to-End Automation** – Single trigger, complete process<br/>• **Consistent Experience** – Every customer gets the same high-quality onboarding<br/>• **Coordinator Freedom** – Focus on relationship building, not admin tasks |

---

## 2. Landing Page Information Architecture

| ID | Section | Goal | Key Elements |
|----|---------|------|--------------|
| H1 | Hero | Instantly convey value and credibility | • Logo & nav  • Headline (\"Autonomous employees for every workflow\")  • Sub-headline  • Primary CTA button (\"Get Early Access\")  • Secondary CTA (\"Watch Demo\")  • Subtle animated graphic of hierarchical agent graph |
| F1 | Social Proof Bar | Establish trust | Partner logos or investor badges |
| F2 | Feature Trio | Showcase top 3 differentiators | Icon + short copy for Digital Employees, Integrations, Memory |
| V1 | Value Deep Dive | Explain how Clancy works | Split-layout with orchestration diagram showing: [Customer Request] → [Digital Employee] → [Orchestrates Multiple Tools] with visual connections to Slack, QuickBooks, Calendar, etc. |
| B1 | Built-in Integrations | Carousel/grid of provider logos grouped by category |
| BLG | **Blog Teaser** | Drive thought-leadership engagement | Latest 3 posts (title, tag, excerpt, thumbnail) linking to `/blog` |
| Q1 | Quote/Testimonial | Social validation | 1–2 customer quotes or beta tester feedback |
| P1 | Pricing Preview | Qualify leads | Simple tier cards linking to pricing page or contact form |
| C1 | Call To Action | Reinforce primary CTA | Contrast section with headline + button |
| FT | Footer | Secondary navigation & compliance | Links to Docs, Careers, Privacy, social icons |

---

## 3. Visual & Interaction Design

### 3.1 Brand Aesthetic
• **Tone** – Clean, professional, and optimistic. Think Intercom or Stripe rather than playful B2C.<br/>
• **Color Palette** – Indigo (#4F46E5) primary, slate gray neutrals for text, with soft mint accent for calls to action.<br/>
• **Typography** – `Inter` or `Satoshi` for headings, `Inter` for body. Large headline (48–56 px), comfortable line height (1.4).<br/>
• **Imagery** – Abstract vector illustrations of graphs, nodes, and connectors; light motion (Lottie) on hover.<br/>
• **Spacing** – Generous white space; 12-column responsive grid with 4-point spacing scale.

### 3.2 Blog Support
The landing page’s blog teaser (BLG) should query the CMS (e.g., Markdown files or headless CMS) for the three most recent `published` posts and render:
• Category tag<br/>
• Title (link to `/blog/{slug}`)<br/>
• 1–2 sentence excerpt<br/>
• 16:9 thumbnail image

A dedicated `/blog` index page will list all posts with pagination. Blog articles should support code blocks, diagrams, and author bios.

### 3.3 Accessibility & Performance
• WCAG 2.1 AA color contrast
• Keyboard-navigable menus and modals
• Lazy-load images & use `srcset` for high-DPI
• Static-site generation (e.g., Astro, Next.js) for <100 ms LCP

### 3.4 Responsive Breakpoints
• **Desktop** ≥ 1280 px – Full grid, animations enabled<br/>
• **Tablet** 768–1279 px – Stack hero content, collapse nav into hamburger<br/>
• **Mobile** ≤ 767 px – Single-column layout, graphics scaled to 100 vw, blog teaser cards become carousel

---

## 4. Technical Implementation Notes
1. **Framework** – Next.js 14 (App Router) for hybrid static/server rendering. Allows incremental static regeneration for blog.
2. **Styling** – Tailwind CSS w/ custom theme tokens defined in `tailwind.config.js`.
3. **Content Source** – MDX files stored in `/content/blog`; use `@next/mdx` for rendering.
4. **Blog Routing** – Dynamic `[slug]` routes under `/blog` folder; use `generateStaticParams`.
5. **Analytics** – Posthog integration.
6. **Deployment** – Vercel for preview branches, with production domain `clancy.ai`.

---

## 5. Copywriting Guidelines
Write for tech-forward yet non-technical business audiences across diverse industries.

1. **Use Everyday Language** – Avoid jargon like “event-driven architecture.” Favour clear words such as *real-time*, *reliable*, and *secure*.
2. **Lead with Benefits, Not Features** – Emphasize outcomes: “Save hours each week” over “async workflow automation.”
3. **Address Universal Pain Points** – Focus on manual data entry, fragmented processes, limited resources—problems nearly every growing business faces.
4. **Keep Tone Warm & Professional** – Sound like a helpful colleague, not hype-driven.
5. **Use Action-Oriented Verbs** – *Create, Simplify, Save, Grow* instead of abstract buzzwords.
6. **Quantify Success Where Possible** – “Reply to customers 5× faster,” “Launch products in 3 clicks.”
7. **Avoid Anthropomorphism** – Call them “digital employees” or “assistants,” not “robots.”
8. **Future Case Studies** – Plan to showcase industry-specific examples as case studies rather than embedding persona language directly in headline copy.

---

## 6. Next Steps
1. Approve this design & messaging outline.
2. Build component library matching spec.
3. Draft initial blog posts (launch announcement, platform deep dive, integration highlights).
4. Conduct usability tests with 5 target users.
5. Iterate visual polish and copy based on feedback.

---

*Last updated: {{TODAY}}* 