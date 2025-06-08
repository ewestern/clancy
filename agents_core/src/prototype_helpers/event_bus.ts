import { EventBus, RunIntentEventBus } from "../events/bus.js";
import { RunIntentEvent } from "../types/index.js";

/**
 * Basic in-memory event bus implementation for prototyping purposes.
 * 
 * Features:
 * - Simple Map-based storage of event listeners
 * - Support for multiple subscribers per event
 * - Asynchronous execution of callbacks
 * - Error isolation (one callback failure doesn't affect others)
 * - Generic type support
 */
export class InMemoryEventBus<T> implements EventBus<T> {
    private subscribers: Map<string, Array<(data: T) => Promise<void>>> = new Map();

    /**
     * Publish an event to all subscribers
     */
    async publish(event: string, data: T): Promise<void> {
        const callbacks = this.subscribers.get(event) || [];
        
        if (callbacks.length === 0) {
            console.log(`[EventBus] No subscribers for event: ${event}`);
            return;
        }

        console.log(`[EventBus] Publishing event '${event}' to ${callbacks.length} subscriber(s)`);

        // Execute all callbacks concurrently, but don't let one failure affect others
        const promises = callbacks.map(async (callback, index) => {
            try {
                await callback(data);
            } catch (error) {
                console.error(`[EventBus] Subscriber ${index} failed for event '${event}':`, error);
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Subscribe to an event
     */
    async subscribe(event: string, callback: (data: T) => Promise<void>): Promise<void> {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        
        this.subscribers.get(event)!.push(callback);
        console.log(`[EventBus] New subscriber added for event: ${event}`);
    }

    /**
     * Unsubscribe from an event (useful for cleanup)
     */
    async unsubscribe(event: string, callback: (data: T) => Promise<void>): Promise<void> {
        const callbacks = this.subscribers.get(event);
        if (!callbacks) return;

        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
            console.log(`[EventBus] Subscriber removed from event: ${event}`);
            
            // Clean up empty event arrays
            if (callbacks.length === 0) {
                this.subscribers.delete(event);
            }
        }
    }

    /**
     * Get the number of subscribers for an event (useful for debugging)
     */
    getSubscriberCount(event: string): number {
        return this.subscribers.get(event)?.length || 0;
    }

    /**
     * Get all active event names (useful for debugging)
     */
    getActiveEvents(): string[] {
        return Array.from(this.subscribers.keys());
    }

    /**
     * Clear all subscribers (useful for testing cleanup)
     */
    clear(): void {
        this.subscribers.clear();
        console.log(`[EventBus] All subscribers cleared`);
    }
}

/**
 * Specialized RunIntent event bus implementation
 * Extends the generic event bus with RunIntent-specific convenience methods
 */
export class InMemoryRunIntentEventBus extends InMemoryEventBus<RunIntentEvent> implements RunIntentEventBus {
    private static readonly RUN_EVENT = 'run';

    /**
     * Convenience method to emit a run intent (publishes to 'run' event)
     */
    async run(data: RunIntentEvent): Promise<void> {
        await this.publish(InMemoryRunIntentEventBus.RUN_EVENT, data);
    }

    /**
     * Convenience method to subscribe to run intents (subscribes to 'run' event)
     */
    async subscribeRun(callback: (data: RunIntentEvent) => Promise<void>): Promise<void> {
        await this.subscribe(InMemoryRunIntentEventBus.RUN_EVENT, callback);
    }

    /**
     * Unsubscribe from run intents
     */
    async unsubscribeRun(callback: (data: RunIntentEvent) => Promise<void>): Promise<void> {
        await this.unsubscribe(InMemoryRunIntentEventBus.RUN_EVENT, callback);
    }
}

/**
 * Factory function to create a generic event bus instance
 */
export function createEventBus<T>(): EventBus<T> {
    return new InMemoryEventBus<T>();
}

/**
 * Factory function to create a RunIntent event bus instance
 */
export function createRunIntentEventBus(): RunIntentEventBus {
    return new InMemoryRunIntentEventBus();
}

/**
 * Utility function to create a mock event bus that logs all operations (useful for testing)
 */
export function createMockEventBus<T>(): EventBus<T> {
    return {
        async publish(event: string, data: T): Promise<void> {
            console.log(`[MockEventBus] PUBLISH: ${event}`, JSON.stringify(data, null, 2));
        },
        async subscribe(event: string, callback: (data: T) => Promise<void>): Promise<void> {
            console.log(`[MockEventBus] SUBSCRIBE: ${event}`);
        }
    };
}




// Example usage patterns (for documentation/reference):
//
// // Generic usage:
// const eventBus = createEventBus<MyEventType>();
// await eventBus.subscribe('my-event', async (data) => {
//     console.log('Received:', data);
// });
// await eventBus.publish('my-event', { message: 'Hello World' });
//
// // RunIntent specific usage:
// const runIntentBus = createRunIntentEventBus();
// await runIntentBus.subscribeRun(async (runIntent) => {
//     console.log('Processing run intent:', runIntent.executionId);
// });
// await runIntentBus.run({
//     eventId: 'event-123',
//     type: 'runIntent',
//     orgId: 'org-456',
//     agentId: 'agent-789',
//     executionId: 'exec-123',
//     timestamp: new Date().toISOString(),
//     trigger: { /* trigger data */ },
//     context: { /* context data */ },
//     graphSpec: { /* graph spec */ }
// }); 