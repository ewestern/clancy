import { RunIntentEvent } from "../types/index.js";

export interface EventBus<A> {
    publish(event: string, data: A): Promise<void>;
    subscribe(event: string, callback: (data: A) => Promise<void>): Promise<void>;
}

export interface RunIntentEventBus extends EventBus<RunIntentEvent> {
    run(data: RunIntentEvent): Promise<void>;
    subscribeRun(callback: (data: RunIntentEvent) => Promise<void>): Promise<void>;
}