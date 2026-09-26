import type { ElevenLabsConfig, IntegrationHealth, IntegrationState } from "./types.js";

export class ElevenLabsHealthTracker {
  #health: IntegrationHealth;

  constructor(initialState: IntegrationState, reasonCode: string | null, now = () => new Date()) {
    this.now = now;
    this.#health = this.value(initialState, reasonCode);
  }

  private readonly now: () => Date;

  read(): IntegrationHealth {
    return this.#health;
  }

  available(): void {
    this.#health = this.value("AVAILABLE", null);
  }

  degraded(reasonCode: string): void {
    this.#health = this.value("DEGRADED", reasonCode);
  }

  unavailable(reasonCode: string): void {
    this.#health = this.value("UNAVAILABLE", reasonCode);
  }

  private value(state: IntegrationState, reasonCode: string | null): IntegrationHealth {
    return { provider: "ELEVENLABS", state, checkedAt: this.now().toISOString(), reasonCode };
  }
}

export function createElevenLabsHealthTracker(
  config: ElevenLabsConfig | null,
  now?: () => Date,
): ElevenLabsHealthTracker {
  return config
    ? new ElevenLabsHealthTracker("DEGRADED", "NOT_CHECKED", now)
    : new ElevenLabsHealthTracker("UNAVAILABLE", "MISSING_CONFIGURATION", now);
}
