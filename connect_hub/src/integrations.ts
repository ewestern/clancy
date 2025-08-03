import { GoogleProvider } from "./integrations/google.js";
import { SlackProvider } from "./integrations/slack.js";
import { ProviderRuntime } from "./providers/types.js";
import { QuickBooksProvider } from "./integrations/quickbooks.js";
import { InternalProvider } from "./integrations/internal.js";
import { MicrosoftProvider } from "./integrations/microsoft.js";

// ---------------------------------------------------------------------------
// Simple in-memory registry that holds one instance per provider.
// ---------------------------------------------------------------------------

const providers: Record<string, ProviderRuntime<any, any>> = {
  internal: new InternalProvider(),
  slack: new SlackProvider(),
  google: new GoogleProvider(),
  quickbooks: new QuickBooksProvider(),
  microsoft: new MicrosoftProvider(),
};

export const registry = {
  getProvider(id: string): ProviderRuntime<any, any> | undefined {
    const provider = providers[id];
    if (!provider) {
      throw new Error(`Provider ${id} not found`);
    }
    return provider;
  },

  getProviders() {
    return Object.values(providers);
  },

  /**
   * Assemble an array of provider capability objects that conform to
   * ProviderCapabilitiesSchema.
   */
  getCapabilities() {
    return Object.values(providers).map((p) => ({
      ...p.metadata,
      capabilities: p.listCapabilities(),
      scopeMapping: p.scopeMapping,
    }));
  },
};
