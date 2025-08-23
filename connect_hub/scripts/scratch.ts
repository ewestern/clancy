import { registry } from "../src/integrations";

// print all external scopes
const scopes = new Set(registry.getProviders().flatMap((p) => p.listCapabilities().flatMap((c) => c.requiredScopes)));
scopes.forEach((s) => {
  console.log(s);
});
//console.log(scopes);

// print all internal scopes
//const internalScopes = registry.getProviders().flatMap((p) => p.listCapabilities().map((c) => c.requiredScopes));
//console.log(internalScopes);


