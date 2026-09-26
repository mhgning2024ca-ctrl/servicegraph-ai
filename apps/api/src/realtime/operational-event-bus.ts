export const OPERATIONAL_EVENT_TYPES = [
  "report.created",
  "report.correlated",
  "telemetry.anomaly",
  "incident.created",
  "incident.updated",
  "hypothesis.created",
  "remediation.proposed",
  "remediation.approved",
  "remediation.executing",
  "verification.updated",
  "incident.resolved",
  "communication.created",
  "integration.degraded",
] as const;

export type OperationalEventType = (typeof OPERATIONAL_EVENT_TYPES)[number];

/** Internal transport record. The HTTP schema remains owned by packages/contracts. */
export interface OperationalEventRecord {
  id: string;
  type: OperationalEventType;
  occurredAt: string;
  correlationId: string;
  entityId: string | null;
  payload: Record<string, unknown>;
}

export type OperationalEventListener = (event: OperationalEventRecord) => void;

export interface OperationalEventSubscription {
  close(): void;
}

export interface OperationalEventBus {
  publish(event: OperationalEventRecord): void;
  recent(afterEventId?: string): readonly OperationalEventRecord[];
  subscribe(listener: OperationalEventListener): OperationalEventSubscription;
}

export interface InMemoryOperationalEventBusOptions {
  capacity?: number;
}

export class InMemoryOperationalEventBus implements OperationalEventBus {
  private readonly capacity: number;
  private readonly listeners = new Set<OperationalEventListener>();
  private readonly records: OperationalEventRecord[] = [];

  constructor(options: InMemoryOperationalEventBusOptions = {}) {
    const capacity = options.capacity ?? 256;
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError("Event bus capacity must be a positive integer.");
    }
    this.capacity = capacity;
  }

  publish(event: OperationalEventRecord): void {
    this.records.push(event);
    if (this.records.length > this.capacity) {
      this.records.splice(0, this.records.length - this.capacity);
    }

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  recent(afterEventId?: string): readonly OperationalEventRecord[] {
    if (afterEventId === undefined) {
      return [...this.records];
    }

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
