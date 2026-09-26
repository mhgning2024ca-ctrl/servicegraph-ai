import type { OperationalEventEnvelope } from "@servicegraph/contracts";

export type OperationalEventListener = (event: OperationalEventEnvelope) => void;

export interface OperationalEventSubscription {
  close(): void;
}

export interface OperationalEventBus {
  publish(event: OperationalEventEnvelope): void;
  recent(afterEventId?: string): readonly OperationalEventEnvelope[];
  subscribe(listener: OperationalEventListener): OperationalEventSubscription;
}

export interface InMemoryOperationalEventBusOptions {
  capacity?: number;
}

export class InMemoryOperationalEventBus implements OperationalEventBus {
  private readonly capacity: number;
  private readonly listeners = new Set<OperationalEventListener>();
  private readonly records: OperationalEventEnvelope[] = [];

  constructor(options: InMemoryOperationalEventBusOptions = {}) {
    const capacity = options.capacity ?? 256;
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError("Event bus capacity must be a positive integer.");
    }
    this.capacity = capacity;
  }

  publish(event: OperationalEventEnvelope): void {
    this.records.push(event);
    if (this.records.length > this.capacity) {
      this.records.splice(0, this.records.length - this.capacity);
    }
    for (const listener of this.listeners) listener(event);
  }

  recent(afterEventId?: string): readonly OperationalEventEnvelope[] {
    if (afterEventId === undefined) return [...this.records];
    const index = this.records.findIndex((event) => event.id === afterEventId);
    return index < 0 ? [...this.records] : this.records.slice(index + 1);
  }

  subscribe(listener: OperationalEventListener): OperationalEventSubscription {
    this.listeners.add(listener);
    let closed = false;
    return {
      close: () => {
        if (!closed) {
          closed = true;
          this.listeners.delete(listener);
        }
      },
    };
  }
}
