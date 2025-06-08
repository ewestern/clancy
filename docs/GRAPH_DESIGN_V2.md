# Graph Design v2

## 1. Purpose & Scope
This document refines the original *Graph Creator* design and introduces a clearer three-tier abstraction for all graphs produced by the Clancy platform:

1. **Skill** – the smallest executable graph, typically wrapping one closely-related capability.
2. **Workflow** – a cohesive bundle of Skills that cooperatively deliver a business outcome.
3. **Digital Employee** – the top-level graph representing the complete role; it contains only Workflow subgraphs.

The goal is to tighten composability, simplify reasoning for authors and the runtime, and pave the way for deterministic versioning and observability.

---

## 2. Graph Layer Abstractions

### 2.1 Skill
| Aspect | Design Notes |
|--------|--------------|
| Definition | The atomic unit of execution and reuse. Compilable, cacheable, versionable and unit-testable in isolation. |
| Capability Affinity | Binds to **exactly one** capability (or a very tight cluster) via `provider`, `action` parameters. |
| Canonical Topologies | A finite library, e.g.:<br/>• `single_call` – fire-and-forget API call<br/>• `hil_loop` – collect inputs → HIL gap-fill loop → call<br/>• `poll_until_done` – trigger async job → poll<br/>• `fan_in_aggregate` – parallel calls → aggregate result |
| Execution Pattern | `collectInputs → (optional) gapFillLoop → executeCapability → emitResult`. |
| Memory Interaction | Must declare `memoryRead` & `memoryWrite` key patterns; runtime enforces and records provenance. |
| Versioning | Semantic version (`provider.action.topology.major.minor`). Breaking changes bump *major*, non-breaking bump *minor*. |

---

### 2.2 Workflow
| Aspect | Design Notes |
|--------|--------------|
| Definition | A set of Skill subgraphs that **all** depend (directly or indirectly) on each other to achieve a coherent business task. |
| Edge Semantics | Each edge must declare `edgeKind: "data" | "control"`.<br/>• **Data** – payload flows, receiver cannot start until data is ready.<br/>• **Control** – ordering only; no payload. |
| Memory | Common store scoped to the parent Digital Employee. Skills **also** pass data via explicit data edges to document coupling. |
| Error Scope | Retries, HIL escalations and compensating actions are handled within the Workflow boundary. |
| Observability | Metrics: latency, success-rate, retries, HIL prompts. `run_id` fragment pattern: `emp:{id}→wf:{id}`. |
| Versioning | Pins explicit Skill versions; change log recorded. |

---

### 2.3 Digital Employee
| Aspect | Design Notes |
|--------|--------------|
| Definition | The top-level graph representing an organisational role. Contains only Workflow subgraphs with **weak or no edges** between them. |
| Trigger Routing | Supervisor maps trigger types to one or more Workflows; Skills are never invoked directly from outside. |
| Cross-Workflow Data | Shared memory namespace (`employee_memory`) with provenance; direct edges between Workflows are **not allowed** to minimise hidden coupling. |
| Scheduling | Workflow-level concurrency, back-pressure and prioritisation handled by Supervisor. |
| Versioning | Employee spec versions pin Workflow versions to maintain determinism. |

---

## 3. Graph-Spec Additions

```ts
interface GraphEdge {
  from: string;           // node id
  to: string;             // node id
  edgeKind: "data" | "control";
  payloadSchema?: Record<string, any>;  // required if edgeKind === "data"
}

interface SkillSpec {
  id: string;
  provider: string;       // e.g. "quickbooks"
  action: string;         // e.g. "invoice.create"
  topology: string;       // e.g. "hil_loop.v1"
  memoryRead?: string[];  // patterns (JSON-pointer or dot-notation)
  memoryWrite?: string[];
  // ...other existing fields
}
```

Example Workflow fragment:
```jsonc
{
  "id": "wf_billing_v1",
  "nodes": ["skill_create_invoice", "skill_post_slack"],
  "edges": [
    { "from": "skill_create_invoice", "to": "skill_post_slack", "edgeKind": "data", "payloadSchema": {"invoiceUrl": "string"} }
  ]
}
```

---

## 4. Shared Knowledge Store
1. **Append-only** writes: every `put` records `(key, value, writerSkillId, ts)`.
2. **Provenance queries**: runtime exposes `whereDid(key)` to aid debugging.
3. **Conflict avoidance**: Writers must include `expectedVersion` on update; mismatches cause a deterministic failure that plugins can handle.
4. **Declared dependencies**: Graph Creator flags undeclared `memoryRead`/`memoryWrite` during compile.

---

## 5. Capability Integration & Token Handling
• Agent Workers call `ConnectHub /proxy/{provider.action}`; they do **not** manage tokens.
• ConnectHub identifies `(orgId, provider)` credential, refreshes if stale, executes the request and returns the payload.
• Concurrent refreshes are guarded by a **singleflight** mutex so only one token refresh occurs per credential cluster.

---

## 6. Versioning Cascade
```
Skill version ↑
      pinned in
Workflow version ↑
      pinned in
Digital Employee version
```
Upgrading a Skill creates a new Workflow revision; upgrading a Workflow creates a new Employee revision. Older executions remain reproducible.

---

## 7. Canonical Skill Topology Library (initial)
| Code | Description |
|------|-------------|
| `single_call.v1` | One capability call, immediate result. |
| `hil_loop.v1` | Collect inputs → HIL gap-fill loop → call. |
| `poll_async.v1` | Kick off async job → poll until status == done. |
| `fan_in_aggregate.v1` | Parallel capability calls → aggregate reducer. |

Additional topologies can be added as new, versioned entries without breaking existing Skills.

---

## 8. Telemetry & Observability
`run_id` convention: `emp:{employeeId}[:wf:{workflowId}][:skill:{skillId}]`.

Metrics roll-up:
1. **Skill** – latency, retries, capability errors.
2. **Workflow** – aggregate duration, HIL interactions, failure point.
3. **Employee** – trigger-to-result latency, success rate per trigger type.

Grafana dashboards and alerts will leverage these tags to provide multi-resolution insight.

---

## 9. Implementation Roadmap
1. **Schema updates** – extend TypeScript types & JSON-Schema validators with `edgeKind`, `memoryRead`, `memoryWrite`.
2. **Graph Creator changes** –
   1. Template library for canonical Skill topologies.
   2. Compile-time validation of capability existence and memory declarations.
3. **Runtime engine** –
   1. Enforce edge kinds in scheduler (data edges gate execution).
   2. Append-only knowledge store with provenance.
4. **Observability** – proper `run_id` tagging and dashboards.
5. **Backfill** – migrate existing graphs to v2 schema with automated script.

---

## 10. Open Questions
1. Should we formalise **namespaces** for memory keys (`employee`, `workflow`, `skill`) to reduce collision risk?
2. Do we need a *control edge* variant that encodes **rate-limit windows** (e.g. QuickBooks 100/min)?
3. How do we surface provenance to end-users in the UI without overwhelming them?

Feedback is welcome before we lock the v2 schema for implementation. 