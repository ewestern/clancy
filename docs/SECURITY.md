Below is a step-by-step way to reason about—and ultimately implement—capability-level authorisation between your Agent-Executor Lambdas and ConnectHub.  I’ll stay at a design / “mental-model” level first and sprinkle in concrete Cognito mechanics where useful.

--------------------------------------------------------------------
1. Clarify what you’re protecting
--------------------------------------------------------------------
• Data you care about  
  – Third-party access tokens stored in ConnectHub’s DB  
  – The actions those tokens enable (‘capabilities’)

• Threats you’re mitigating  
  – A compromised or over-privileged service token invoking a capability it shouldn’t  
  – Confused-deputy: a worker submits a call that the caller is not entitled to, but ConnectHub executes it because it merely has the raw Slack/QB tokens  
  – Cross-tenant leakage (an org-A worker tries to use a token that belongs to org-B)

--------------------------------------------------------------------
2. Pick an *authorisation* substrate
--------------------------------------------------------------------
Cognito gives you three ways to embed rights in a JWT:

1. `scope` claim (OAuth “resource server” scopes) – best for *capability lists*.  
2. Custom claims (`custom:foo`) – anything you want, but you must parse it yourself.  
3. Client IDs / audiences – coarse, one-client-one-role style.

Scoping at the `scope` claim is the natural fit because it’s both standard OAuth semantics *and* supported by Cognito’s Resource Server feature.

--------------------------------------------------------------------
3. Model internal scopes formally
--------------------------------------------------------------------
Treat every ConnectHub capability ID as a scope string, e.g.

```
invoice.create        →  clancy/invoice.write
slack.postMessage     →  clancy/slack.post
gmail.send            →  clancy/gmail.send
```

Guidelines:
• Prefix with a unique namespace (`clancy/`) to avoid collisions.  
• Use verbs (`read`, `write`, etc.) consistently.  
• Keep them short—Cognito scopes appear in every token payload.

--------------------------------------------------------------------
4. Wire Cognito to issue correctly scoped tokens
--------------------------------------------------------------------
1. In the same user-pool you already have, create / extend one *Resource Server* (`identifier = https://clancyai.com`, which you already defined).  
2. Define one scope entity per capability as above.  
3. For each service (Agent-Executor, Graph-Creator, future workers), create a dedicated *app client* that:  
   – Allows client-credentials flow (`allowed_oauth_flows = ["client_credentials"]`)  
   – Is authorised **only** for the scopes that service requires.  
4. Token request: the Lambda (via AWS SDK `InitiateAuth` or simple POST to `/oauth2/token`) asks for *exactly* the scopes it needs for that invocation.  
   – If you prefer static rights, omit `scope` in the token request; Cognito will default to *all* scopes the app-client is permitted.  
   – If you need per-run granularity, have the Agent-Executor request a subset each time.

Result: The JWT arrives at ConnectHub with

```json
"scope": "clancy/invoice.write clancy/slack.post"
```

--------------------------------------------------------------------
5. Validate & enforce inside ConnectHub
--------------------------------------------------------------------
In Fastify middleware (or an API-Gateway authoriser if you front ConnectHub with APIGW):

1. Verify signature, issuer, audience, expiry.  
2. Parse `scope` claim into a Set.  
3. On `/proxy/:providerId/:capabilityId` lookup the capability → required scope (from your existing `ScopeMapper`).  
4. Authorise:

```ts
if (!jwtScopes.has(requiredScope)) {
  reply.code(403).send({
      error: 'INSUFFICIENT_SCOPE',
      detail: `Need '${requiredScope}', have [${[...jwtScopes]}]`
  })
}
```

5. Also validate `org_id` custom claim (if present) against the connection row you’re about to use—this prevents cross-tenant leakage even if scopes accidentally overlap.

--------------------------------------------------------------------
6. Shortest revocation path
--------------------------------------------------------------------
Cognito can’t do true token introspection or revocation lists, so:

• Keep access tokens short-lived (≤ 1 h).  
• If you ever *must* yank rights immediately: delete or disable the offending app-client; new tokens can no longer be issued and old ones age out quickly.

--------------------------------------------------------------------
7. Audit & defence-in-depth
--------------------------------------------------------------------
• Log `org_id`, `capability`, `provider`, `scope[]` on every proxy call.  
• Emit metrics for `INSUFFICIENT_SCOPE` to spot mis-configurations early.  
• Consider an allow-list of `client_id`s accepted by ConnectHub (extra check on `azp` claim).  
• For especially sensitive capabilities, require **two** conditions: correct scope *and* a dedicated app-client ID.

--------------------------------------------------------------------
8. Run-time sequence (end-to-end)
--------------------------------------------------------------------
1. Agent-Executor needs to call `invoice.create` → requests M2M token with `scope=clancy/invoice.write`.  
2. Cognito returns JWT → Lambda adds `Authorization: Bearer <jwt>` header in `/proxy/quickbooks/invoice.create` call.  
3. ConnectHub middleware: validates JWT, sees `scope` claim includes `clancy/invoice.write`, sees `org_id` == row.owner, allows.  
4. Capability handler fetches QB tokens from DB, performs API call.  
5. Structured log line `{capability:"invoice.create", org_id:"org_123", scopes:["clancy/invoice.write"], client_id:"abcxyz"}` is emitted.

--------------------------------------------------------------------
9. Edge-cases & tips
--------------------------------------------------------------------
• **Composite capabilities**: if a proxy call triggers *multiple* provider actions, union their required scopes and enforce all.  
• **Scope explosion**: hundreds of capabilities → long tokens. Techniques:  
  – Group micro-scopes under a super-scope (`capabilities.basic`, `capabilities.finance`).  
  – Dynamic token requests per invocation (only what you need).  
• **Backward compatibility**: during migration, accept either legacy “all-access” tokens *or* scoped tokens, but log warnings when legacy tokens are used.

--------------------------------------------------------------------
10. Checklist to implement
--------------------------------------------------------------------
1. [ ] Finalise scope naming convention and map every capability.  
2. [ ] Add scopes in Cognito resource server.  
3. [ ] Create / update app-clients per service with least-privilege scopes.  
4. [ ] Update Agent-Executor code to request scoped tokens.  
5. [ ] Implement Fastify auth middleware (verify + scope check).  
6. [ ] Add org-check against DB row before using tokens.  
7. [ ] Write unit tests: missing scope, wrong org, expired token.  
8. [ ] Turn on structured logging + metrics.  
9. [ ] Shorten token TTL to 1 h (or less) for M2M clients.  
10. [ ] Document the contract so new capabilities always come with a scope entry.

With this model, ConnectHub acts as the single “policy-enforcement point”: even if a worker got hold of a raw Slack token, it still can’t *use* it without presenting a JWT whose scopes allow that capability, giving you a clean and auditable security boundary.