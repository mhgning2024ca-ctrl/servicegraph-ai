export type IntegrationResult<T> =
  | { ok: true; data: T; provider: string; durationMs: number }
  | {
      ok: false;
      errorCode: string;
      retryable: boolean;
      provider: string;
      durationMs: number;
    };

export type IntegrationHealth = "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";
