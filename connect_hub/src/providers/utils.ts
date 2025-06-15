import { resolve } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { PromptSpec } from "./types.js";

/**
 * Load prompt JSON files from the directory structure:
 *   integrations/{provider}/prompts/{capability}-{version}.json
 */
export function loadPrompts(providerDir: string, capabilityId: string): PromptSpec[] {
  const promptsDir = resolve(providerDir, "prompts");
  if (!existsSync(promptsDir)) return [];

  const specs: PromptSpec[] = [];
  for (const entry of readdirSync(promptsDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json") && entry.name.startsWith(capabilityId)) {
      const json = JSON.parse(
        readFileSync(resolve(promptsDir, entry.name), "utf-8"),
      );
      specs.push(json as PromptSpec);
    }
  }
  specs.sort((a, b) => a.version.localeCompare(b.version, "en", { numeric: true }));
  return specs;
} 