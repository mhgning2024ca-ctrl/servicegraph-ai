import {
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
  VerificationResponseSchema,
  type CreateCommunicationRequest,
  type CreateRemediationProposalRequest,
  type CreateReportRequest,
  type CreateReportResponse,
  type IncidentDetailResponse,
  type IncidentEvidenceResponse,
  type IncidentGraphResponse,
  type ListIncidentsResponse,
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
