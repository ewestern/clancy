import { GSuiteProvider } from "./integrations/gsuite.js";
import { SlackProvider } from "./integrations/slack.js";
import { ProviderRuntime } from "./providers/types.js";
import { QuickBooksProvider } from "./integrations/quickbooks.js";

// ---------------------------------------------------------------------------
// Simple in-memory registry that holds one instance per provider.
// ---------------------------------------------------------------------------

const providers: Record<string, ProviderRuntime> = {
  slack: new SlackProvider(),
  gsuite: new GSuiteProvider(),
  quickbooks: new QuickBooksProvider(),
};

export const registry = {
  getProvider(id: string): ProviderRuntime {
    const provider = providers[id];
    if (!provider) {
      throw new Error(`Provider ${id} not found`);
    }
    return provider;
  },

  /**
   * Assemble an array of provider capability objects that conform to
   * ProviderCapabilitiesSchema.
   */
  getCapabilities() {
    return Object.values(providers).map((p) => ({
      ...p.metadata,
      capabilities: p.listCapabilities(),
    }));
  },
};
