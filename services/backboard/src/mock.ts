import type { BackboardMemoryRecord, BackboardTransport } from "./adapter.js";

export const NODE17_MEMORY_FIXTURE: readonly BackboardMemoryRecord[] = [
  {
    referenceId: "historical-incident-node17",
    summary:
      "A prior simulated NODE-17 degradation recovered after approved traffic rerouting.",
  },
];

export class DeterministicBackboardTransport implements BackboardTransport {
  constructor(
    private readonly records: readonly BackboardMemoryRecord[] =
      NODE17_MEMORY_FIXTURE,
  ) {}

  async retrieve(): Promise<unknown> {
    return structuredClone(this.records);
  }
}
