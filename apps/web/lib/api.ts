import {
  AffectedConfirmationRequestSchema,
  AffectedConfirmationResponseSchema,
  AnalyzeIncidentResponseSchema,
  CreateCommunicationRequestSchema,
  CreateCommunicationResponseSchema,
  CreateRemediationProposalRequestSchema,
  CreateRemediationProposalResponseSchema,
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  IncidentDetailResponseSchema,
  IncidentEvidenceResponseSchema,
  IncidentGraphResponseSchema,
  ListIncidentsResponseSchema,
  RemediationDecisionRequestSchema,
  RemediationDecisionResponseSchema,
  RemediationExecutionResponseSchema,
  PublicConfigResponseSchema,
  PublicIncidentListResponseSchema,
  VerificationResponseSchema,
  VoiceTranscriptionResponseSchema,
  OperationalEventEnvelopeSchema,
  type AffectedConfirmationResponse,
  type CreateCommunicationRequest,
  type CreateRemediationProposalRequest,
  type CreateReportRequest,
  type CreateReportResponse,
  type IncidentDetailResponse,
  type IncidentEvidenceResponse,
  type IncidentGraphResponse,
  type ListIncidentsResponse,
  type PublicConfigResponse,
  type PublicIncidentListResponse,
  type VoiceTranscriptionResponse,
} from "../../../packages/contracts/dist/index.js";

type Schema<T> = { parse: (value: unknown) => T };

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  accessToken?: string | null;
  idempotencyKey?: string;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string | null;

  constructor(message: string, status: number, code = "API_ERROR", correlationId: string | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

async function requestJson<T>(path: string, schema: Schema<T>, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("ServiceGraph API is unreachable.", 0, "NETWORK_ERROR");
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiClientError("ServiceGraph API returned an invalid response.", response.status, "INVALID_JSON");
    }
  }

  if (!response.ok) {
    const envelope = payload as {
      error?: { code?: string; message?: string; correlationId?: string };
    } | null;
    throw new ApiClientError(
      envelope?.error?.message ?? `Request failed with HTTP ${response.status}.`,
      response.status,
      envelope?.error?.code ?? "API_ERROR",
      envelope?.error?.correlationId ?? null,
    );
  }

  try {
    return schema.parse(payload);
  } catch {
    throw new ApiClientError("ServiceGraph API response does not match the frozen contract.", response.status, "CONTRACT_MISMATCH");
  }
}

export async function getOperatorAccessToken(): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch("/auth/access-token", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as { token?: unknown } | null;
  return typeof payload?.token === "string" && payload.token.length > 0 ? payload.token : null;
}

export async function createCitizenReport(input: CreateReportRequest, idempotencyKey = crypto.randomUUID()): Promise<CreateReportResponse> {
  const body = CreateReportRequestSchema.parse(input);
  return requestJson("/v1/reports", CreateReportResponseSchema, {
    method: "POST",
    body,
    idempotencyKey,
  });
}

export async function getPublicConfig(): Promise<PublicConfigResponse> {
  return requestJson("/v1/config/public", PublicConfigResponseSchema);
}

export async function listPublicIncidents(): Promise<PublicIncidentListResponse> {
  return requestJson("/v1/status/incidents", PublicIncidentListResponseSchema);
}

export async function confirmAffected(
  incidentId: string,
  input: { serviceId: string | null; areaCode: string },
): Promise<AffectedConfirmationResponse> {
  const body = AffectedConfirmationRequestSchema.parse(input);
  return requestJson(
    `/v1/incidents/${encodeURIComponent(incidentId)}/affected-confirmations`,
    AffectedConfirmationResponseSchema,
    { method: "POST", body },
  );
}

export async function transcribeVoiceReport(audio: Blob, locale: "en" | "fr"): Promise<VoiceTranscriptionResponse> {
  const contentType = audio.type.split(";")[0].toLowerCase();
  if (!contentType) {
    throw new ApiClientError("The recording did not contain an audio type.", 415, "UNSUPPORTED_AUDIO");
  }

  let response: Response;
  try {
    response = await fetch(`/v1/voice/transcriptions?language=${locale}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": contentType },
      body: audio,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("Voice transcription is unreachable.", 0, "NETWORK_ERROR");
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiClientError("Voice transcription returned an invalid response.", response.status, "INVALID_JSON");
    }
  }
  if (!response.ok) {
    const envelope = payload as { error?: { code?: string; message?: string; correlationId?: string } } | null;
    throw new ApiClientError(
      envelope?.error?.message ?? `Voice transcription failed with HTTP ${response.status}.`,
      response.status,
      envelope?.error?.code ?? "VOICE_ERROR",
      envelope?.error?.correlationId ?? null,
    );
  }
  try {
    return VoiceTranscriptionResponseSchema.parse(payload);
  } catch {
    throw new ApiClientError("Voice transcription response does not match the frozen contract.", response.status, "CONTRACT_MISMATCH");
  }
}

export function subscribeToOperationalEvents(
  accessToken: string,
  onEvent: () => void,
  onError?: () => void,
): () => void {
  const controller = new AbortController();
  let retryTimer: number | null = null;
  let lastEventId: string | null = null;

  const reconnect = () => {
    if (!controller.signal.aborted) retryTimer = window.setTimeout(connect, 1_000);
  };

  const consume = (block: string) => {
    if (!block || block.startsWith(":")) return;
    const data = block.split("\n").find(line => line.startsWith("data:"))?.slice(5).trim();
    const id = block.split("\n").find(line => line.startsWith("id:"))?.slice(3).trim();
    if (!data) return;
    try {
      const event = OperationalEventEnvelopeSchema.parse(JSON.parse(data));
      lastEventId = id || event.id;
      onEvent();
    } catch {
      // Ignore malformed events so an isolated bad event cannot terminate the NOC stream.
    }
  };

  const connect = async () => {
    try {
      const headers = new Headers({ Accept: "text/event-stream", Authorization: `Bearer ${accessToken}` });
      if (lastEventId) headers.set("Last-Event-ID", lastEventId);
      const response = await fetch("/v1/events/stream", {
        headers,
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("SSE stream unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        blocks.forEach(consume);
      }
    } catch {
      if (!controller.signal.aborted) onError?.();
    }
    reconnect();
  };

  void connect();
  return () => {
    controller.abort();
    if (retryTimer !== null) window.clearTimeout(retryTimer);
  };
}

export async function listIncidents(accessToken?: string | null): Promise<ListIncidentsResponse> {
  return requestJson("/v1/incidents?limit=100", ListIncidentsResponseSchema, { accessToken });
}

export async function getIncident(incidentId: string, accessToken?: string | null): Promise<IncidentDetailResponse> {
  return requestJson(`/v1/incidents/${encodeURIComponent(incidentId)}`, IncidentDetailResponseSchema, { accessToken });
}

export async function getIncidentEvidence(incidentId: string, accessToken?: string | null): Promise<IncidentEvidenceResponse> {
  return requestJson(`/v1/incidents/${encodeURIComponent(incidentId)}/evidence`, IncidentEvidenceResponseSchema, { accessToken });
}

export async function getIncidentGraph(incidentId: string, accessToken?: string | null): Promise<IncidentGraphResponse> {
  return requestJson(`/v1/incidents/${encodeURIComponent(incidentId)}/graph`, IncidentGraphResponseSchema, { accessToken });
}

export async function analyzeIncident(incidentId: string, accessToken?: string | null) {
  return requestJson(
    `/v1/incidents/${encodeURIComponent(incidentId)}/analyze`,
    AnalyzeIncidentResponseSchema,
    { method: "POST", body: {}, accessToken },
  );
}

export async function createRemediationProposal(
  incidentId: string,
  input: CreateRemediationProposalRequest,
  accessToken?: string | null,
) {
  const body = CreateRemediationProposalRequestSchema.parse(input);
  return requestJson(
    `/v1/incidents/${encodeURIComponent(incidentId)}/remediation-proposals`,
    CreateRemediationProposalResponseSchema,
    { method: "POST", body, accessToken },
  );
}

export async function decideRemediation(
  proposalId: string,
  proposalVersion: number,
  decision: "APPROVE" | "REJECT",
  accessToken?: string | null,
) {
  const body = RemediationDecisionRequestSchema.parse({ proposalVersion, decision, comment: null });
  return requestJson(
    `/v1/remediation-proposals/${encodeURIComponent(proposalId)}/decision`,
    RemediationDecisionResponseSchema,
    { method: "POST", body, accessToken },
  );
}

export async function executeRemediation(proposalId: string, accessToken?: string | null) {
  return requestJson(
    `/v1/remediation-proposals/${encodeURIComponent(proposalId)}/execute`,
    RemediationExecutionResponseSchema,
    { method: "POST", body: {}, accessToken, idempotencyKey: crypto.randomUUID() },
  );
}

export async function verifyIncident(incidentId: string, accessToken?: string | null) {
  return requestJson(
    `/v1/incidents/${encodeURIComponent(incidentId)}/verify`,
    VerificationResponseSchema,
    { method: "POST", body: {}, accessToken },
  );
}

export async function createIncidentCommunication(
  incidentId: string,
  input: CreateCommunicationRequest,
  accessToken?: string | null,
) {
  const body = CreateCommunicationRequestSchema.parse(input);
  return requestJson(
    `/v1/incidents/${encodeURIComponent(incidentId)}/communications`,
    CreateCommunicationResponseSchema,
    { method: "POST", body, accessToken },
  );
}
