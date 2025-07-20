# Clancy Platform – Public Facing Glossary

This glossary standardises the words and phrases we use in **all customer-facing copy** (marketing, documentation, UI, demos, contracts). Internal engineering names may differ; if so, add a note in the *Internal Mapping* column so writers and developers can trace concepts unambiguously.

| Term | Public Definition | Internal Mapping (for reference only) |
|------|-------------------|---------------------------------------|
| **AI Employee** | The primary construct customers interact with. Each AI Employee embodies a single job description and carries out that role autonomously. | Employee graph / top-level *agent* |
| **Workflow** | A coherent, closely related set of tasks an AI Employee performs to achieve an outcome. One AI Employee can host multiple Workflows. | Configured *agent* |
| **Integration** | A third-party platform (e.g., Slack, QuickBooks) that Workflows communicate with to get work done. | Provider |
| **Trigger** | An event that starts a Workflow (e.g., schedule, Slack command, webhook). | Same term |
| **Task** | A single action executed within a Workflow (e.g., “Create invoice”, “Post message”). | Skill / micro-agent node |
| **Knowledge** | Organisational information (documents, policies, data) an AI Employee can reference when executing Workflows. | Org/employee memory |

## Excluded Language
Avoid these words in **all** public copy. Use the approved terms above instead.

- Agent
- Capability / Capabilities / Tool / Tools
- Digital (when referring to AI Employees or Workflows)

> **Example**  
> ❌ “Create an *Agent*”  
> ✅ “Create an *AI Employee*”

---

### How to Propose Changes
1. Add new rows for additional public terms.  
2. Update *Internal Mapping* only if internal names change.  
3. Never remove or rename an entry without a corresponding search-and-replace ticket for existing copy. 