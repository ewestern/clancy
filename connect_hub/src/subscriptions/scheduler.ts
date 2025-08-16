import { Database } from "../plugins/database.js";
import { triggerRegistrations } from "../database/schema.js";
import { lt, eq, and } from "drizzle-orm";
import { registry } from "../integrations.js";

/**
 * Renewal scheduler for Google event subscriptions.
 * Runs periodically to renew subscriptions before they expire.
 */
export class SubscriptionScheduler {
  private db: Database;
  private intervalId: NodeJS.Timeout | null = null;
  private renewalWindowHours: number;

  constructor(db: Database, renewalWindowHours = 24) {
    this.db = db;
    this.renewalWindowHours = renewalWindowHours;
  }

  /**
   * Start the scheduler with hourly renewal checks
   */
  start(): void {
    if (this.intervalId) {
      throw new Error("Scheduler already running");
    }

    // Run immediately and then every hour
    this.renewExpiringSubscriptions().catch(console.error);
    this.intervalId = setInterval(
      () => {
        this.renewExpiringSubscriptions().catch(console.error);
      },
      60 * 60 * 1000,
    ); // 1 hour

    console.log("Subscription renewal scheduler started");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Subscription renewal scheduler stopped");
    }
  }

  /**
   * Renew subscriptions that are expiring within the renewal window
   */
  async renewExpiringSubscriptions(): Promise<void> {
    const renewalThreshold = new Date(
      Date.now() + this.renewalWindowHours * 60 * 60 * 1000,
    );

    console.log(
      `Checking for subscriptions expiring before ${renewalThreshold.toISOString()}`,
    );

    try {
      // Find trigger registrations that need renewal
      const expiringRegistrations = await this.db
        .select()
        .from(triggerRegistrations)
        .where(and(lt(triggerRegistrations.expiresAt, renewalThreshold)));

      console.log(
        `Found ${expiringRegistrations.length} subscriptions to renew`,
      );

      for (const registration of expiringRegistrations) {
        await this.renewSubscription(registration);
      }
    } catch (error) {
      console.error("Error during subscription renewal:", error);
    }
  }

  /**
   * Renew a single subscription
   */
  private async renewSubscription(
    registration: typeof triggerRegistrations.$inferSelect,
  ): Promise<void> {
    try {
      console.log(`Renewing subscription for registration ${registration.id}`);

      const provider = registry.getProvider(registration.providerId);
      if (!provider) {
        console.error(`Provider ${registration.providerId} not found`);
        return;
      }

      const trigger = provider.getTrigger?.(registration.triggerId);
      if (!trigger?.registerSubscription) {
        console.error(
          `Trigger ${registration.triggerId} not found or doesn't support subscriptions`,
        );
        return;
      }

      // Get connection metadata if available
      let connectionMetadata = {};
      if (registration.connectionId) {
        const connection = await this.db.query.connections.findFirst({
          where: (connections, { eq }) =>
            eq(connections.id, registration.connectionId!),
        });
        connectionMetadata = connection?.externalAccountMetadata || {};
      }

      // Create new subscription
      const subscriptionResult = await trigger.registerSubscription(
        this.db,
        connectionMetadata,
        registration,
      );

      // Update the registration with new subscription details
      await this.db
        .update(triggerRegistrations)
        .set({
          subscriptionMetadata: subscriptionResult.subscriptionMetadata,
          expiresAt: subscriptionResult.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(triggerRegistrations.id, registration.id));

      console.log(
        `Successfully renewed subscription for registration ${registration.id}`,
      );
    } catch (error) {
      console.error(
        `Error renewing subscription for registration ${registration.id}:`,
        error,
      );

      // Update subscription metadata with error info
      const errorMetadata = {
        ...(registration.subscriptionMetadata as any),
        lastRenewalError: {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      };

      await this.db
        .update(triggerRegistrations)
        .set({
          subscriptionMetadata: errorMetadata,
          updatedAt: new Date(),
        })
        .where(eq(triggerRegistrations.id, registration.id));
    }
  }

  /**
   * Manual renewal trigger (for testing or on-demand renewal)
   */
  async renewAllExpiring(): Promise<void> {
    await this.renewExpiringSubscriptions();
  }
}

// Singleton instance
let schedulerInstance: SubscriptionScheduler | null = null;

/**
 * Get or create the scheduler instance
 */
export function getScheduler(db: Database): SubscriptionScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SubscriptionScheduler(db);
  }
  return schedulerInstance;
}

/**
 * Start the global scheduler
 */
export function startScheduler(db: Database): void {
  const scheduler = getScheduler(db);
  scheduler.start();
}

/**
 * Stop the global scheduler
 */
export function stopScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
