import type { CreateReportRequest } from "../../../packages/contracts/dist/index.js";
import { ApiClientError, createCitizenReport } from "@/lib/api";

const STORAGE_KEY = "servicegraph.pendingReports.v1";

export type QueuedReport = {
  queueId: string;
  idempotencyKey: string;
  queuedAt: string;
  input: CreateReportRequest;
};

export type FlushResult = {
  sentReportIds: string[];
  remaining: number;
};

export function getQueuedReports(): QueuedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isQueuedReport) : [];
  } catch {
    return [];
  }
}

export function enqueueReport(input: CreateReportRequest, idempotencyKey = crypto.randomUUID()): QueuedReport {
  const item: QueuedReport = {
    queueId: crypto.randomUUID(),
    idempotencyKey,
    queuedAt: new Date().toISOString(),
    input,
  };
  const next = [...getQueuedReports(), item];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return item;
}

export async function flushReportQueue(): Promise<FlushResult> {
  const queue = getQueuedReports();
  const remaining: QueuedReport[] = [];
  const sentReportIds: string[] = [];

  for (const item of queue) {
    try {
      const response = await createCitizenReport(item.input, item.idempotencyKey);
      sentReportIds.push(response.receipt.reportId);
    } catch (error) {
      remaining.push(item);
      if (!(error instanceof ApiClientError) || error.code !== "NETWORK_ERROR") {
        // Preserve failed records rather than dropping user input. A later retry can
        // surface the server response again with the same idempotency key.
      }
    }
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { sentReportIds, remaining: remaining.length };
}

function isQueuedReport(value: unknown): value is QueuedReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QueuedReport>;
  return typeof candidate.queueId === "string"
    && typeof candidate.idempotencyKey === "string"
    && typeof candidate.queuedAt === "string"
    && !!candidate.input
    && typeof candidate.input === "object";
}
