/*
  Usage:
    tsx infra/scripts/generateScopes.ts --baseUrl=http://localhost:3001 \
      --out=infra/modules/shared/scopes.generated.json \
      --internal=infra/modules/shared/internal_scopes.json

  Notes:
    - Requires Node >= 18 (global fetch)
    - The script merges provider capability scopes from /capabilities with a committed list of internal scopes.
*/

type ProviderCapabilities = {
  id: string;
  scopeMapping: Record<string, string[]>;
};

function parseArgs(): Record<string, string> {
  return process.argv.slice(2).reduce((acc, cur) => {
    const [k, v] = cur.split("=");
    const key = k.replace(/^--/, "");
    acc[key] = v ?? "";
    return acc;
  }, {} as Record<string, string>);
}

async function fetchCapabilities(baseUrl: string): Promise<ProviderCapabilities[]> {
  const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/capabilities`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch capabilities: ${resp.status} ${resp.statusText}`);
  }
  const data = (await resp.json()) as any[];
  return data.map((p) => ({ id: p.id, scopeMapping: p.scopeMapping })) as ProviderCapabilities[];
}

function readJsonFile(path: string): any {
  try {
    const fs = require("fs");
    if (!fs.existsSync(path)) return undefined;
    const content = fs.readFileSync(path, "utf8");
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to read JSON from ${path}: ${(e as Error).message}`);
  }
}

function writeJsonFile(path: string, value: unknown) {
  const fs = require("fs");
  const dir = require("path").dirname(path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

async function main() {
  const args = parseArgs();
  const baseUrl = args.baseUrl || process.env.CONNECT_HUB_BASE_URL;
  const outPath = args.out || "infra/modules/shared/scopes.generated.json";
  const internalPath = args.internal || "infra/modules/shared/internal_scopes.json";

  if (!baseUrl) {
    throw new Error("Missing --baseUrl or CONNECT_HUB_BASE_URL env var");
  }

  const providers = await fetchCapabilities(baseUrl);
  const capabilityScopes = providers.flatMap((p) =>
    Object.values(p.scopeMapping || {}).flatMap((arr) => arr || []),
  );

  const internalScopes: string[] = readJsonFile(internalPath) || [];
  const allScopes = uniqueSorted([...capabilityScopes, ...internalScopes]);
  writeJsonFile(outPath, allScopes);

  // eslint-disable-next-line no-console
  console.log(`Wrote ${allScopes.length} scopes to ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


