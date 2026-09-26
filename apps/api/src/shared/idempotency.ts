import { ApiError } from "./api-error.js";

interface StoredResult<T> {
  fingerprint: string;
  expiresAt: number;
  result: T;
}

interface PendingResult<T> {
  fingerprint: string;
  promise: Promise<T>;
}

export interface IdempotencyStore {
  execute<T>(
    scope: string,
    key: string,
    fingerprint: string,
    operation: () => Promise<T>,
  ): Promise<T>;
}

function conflict(): ApiError {
  return new ApiError({
    code: "IDEMPOTENCY_CONFLICT",
    statusCode: 409,
    message: "The idempotency key was already used with a different request.",
  });
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, StoredResult<unknown>>();
  private readonly pending = new Map<string, PendingResult<unknown>>();

  constructor(
    private readonly retentionMs = 24 * 60 * 60 * 1_000,
    private readonly now = () => Date.now(),
  ) {}

  async execute<T>(
    scope: string,
    key: string,
    fingerprint: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const recordKey = `${scope}:${key}`;
    const existing = this.records.get(recordKey) as StoredResult<T> | undefined;
    if (existing && existing.expiresAt > this.now()) {
      if (existing.fingerprint !== fingerprint) throw conflict();
      return existing.result;
    }
    if (existing) this.records.delete(recordKey);

    const inFlight = this.pending.get(recordKey) as PendingResult<T> | undefined;
    if (inFlight) {
      if (inFlight.fingerprint !== fingerprint) throw conflict();
      return inFlight.promise;
    }

    const promise = operation()
      .then((result) => {
        this.records.set(recordKey, {
          fingerprint,
          expiresAt: this.now() + this.retentionMs,
          result,
        });
        return result;
      })
      .finally(() => this.pending.delete(recordKey));
    this.pending.set(recordKey, { fingerprint, promise });
    return promise;
  }
}
