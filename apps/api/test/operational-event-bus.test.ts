import { describe, expect, it, vi } from "vitest";

import {
  InMemoryOperationalEventBus,
  type OperationalEventRecord,
} from "../src/realtime/operational-event-bus.js";

function event(id: string): OperationalEventRecord {
  return {
    id,
    type: "incident.updated",
    occurredAt: "2026-09-26T12:00:00.000Z",
    correlationId: "5bf4d3c1-0d49-4e21-aa91-e248d4f22da9",
    entityId: null,
    payload: {},
  };
}

describe("InMemoryOperationalEventBus", () => {
  it("delivers events until a subscriber closes", () => {
    const bus = new InMemoryOperationalEventBus();
    const listener = vi.fn();
    const subscription = bus.subscribe(listener);

    bus.publish(event("one"));
    subscription.close();
    bus.publish(event("two"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event("one"));
  });

  it("keeps a bounded replay buffer", () => {
    const bus = new InMemoryOperationalEventBus({ capacity: 2 });

    bus.publish(event("one"));
    bus.publish(event("two"));
    bus.publish(event("three"));

    expect(bus.recent().map(({ id }) => id)).toEqual(["two", "three"]);
    expect(bus.recent("two").map(({ id }) => id)).toEqual(["three"]);
  });

  it("returns the retained window when the requested event is no longer buffered", () => {
    const bus = new InMemoryOperationalEventBus({ capacity: 1 });
    bus.publish(event("current"));

    expect(bus.recent("expired").map(({ id }) => id)).toEqual(["current"]);
  });

  it("rejects invalid capacities", () => {
    expect(() => new InMemoryOperationalEventBus({ capacity: 0 })).toThrow(RangeError);
  });
});
