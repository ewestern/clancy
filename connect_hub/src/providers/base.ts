import { FastifySchema } from "fastify";
import {
  Capability,
  CapabilityFactory,
  CapabilityMeta,
  ProviderRuntime,
  Trigger,
  Webhook,
} from "./types.js";
import { ProviderMetadata } from "../models/providers.js";

/**
 * Abstract base class that implements common ProviderRuntime functionality.
 * Eliminates duplication of constructor logic, dispatch table management,
 * and scope mapping generation across provider implementations.
 */
export abstract class BaseProvider<
  WebhookSchema extends FastifySchema = FastifySchema,
  E = unknown,
> implements ProviderRuntime<WebhookSchema, E>
{
  protected readonly dispatchTable = new Map<
    string,
    Capability<unknown, unknown>
  >();
  public readonly scopeMapping: Record<string, string[]>;
  public readonly metadata: ProviderMetadata;
  public webhooks?: Webhook<WebhookSchema, E>[];
  public links?: string[];

  private readonly triggerTable = new Map<string, Trigger<E>>();

  protected constructor(args: {
    metadata: ProviderMetadata;
    capabilityFactories: Record<string, CapabilityFactory<unknown, unknown>>;
    webhooks?: Webhook<WebhookSchema, E>[];
    links?: string[];
    triggers?: Trigger<E>[];
  }) {
    this.metadata = args.metadata;
    this.webhooks = args.webhooks;
    this.links = args.links;

    // Populate dispatch table
    for (const [capabilityId, factory] of Object.entries(
      args.capabilityFactories,
    )) {
      this.dispatchTable.set(capabilityId, factory());
    }

    // Generate scopeMapping from dispatch table
    this.scopeMapping = {};
    for (const [capabilityId, capability] of this.dispatchTable) {
      for (const scope of capability.meta.requiredScopes) {
        if (!this.scopeMapping[capabilityId]) {
          this.scopeMapping[capabilityId] = [];
        }
        this.scopeMapping[capabilityId].push(scope);
      }
    }

    // Register triggers if provided
    if (args.triggers) {
      for (const trigger of args.triggers) {
        this.triggerTable.set(trigger.id, trigger);
      }
    }
  }

  getCapability<P, R>(capabilityId: string): Capability<P, R> {
    const capability = this.dispatchTable.get(capabilityId);
    if (!capability) {
      throw new Error(
        `${this.metadata.id} capability ${capabilityId} not implemented`,
      );
    }
    return capability as Capability<P, R>;
  }

  listCapabilities(): CapabilityMeta[] {
    return Array.from(this.dispatchTable.values()).map((c) => c.meta);
  }

  listTriggers(): Trigger<E>[] {
    return Array.from(this.triggerTable.values());
  }

  getTrigger?(triggerId: string): Trigger<E> | undefined {
    return this.triggerTable.get(triggerId);
  }

  registerTrigger?(triggerId: string, trigger: Trigger<E>): void {
    this.triggerTable.set(triggerId, trigger);
  }
}
