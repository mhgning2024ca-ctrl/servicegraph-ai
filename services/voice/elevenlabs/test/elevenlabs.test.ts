import assert from "node:assert/strict";
import test from "node:test";
import {
  createDeterministicElevenLabsTransport,
  createTextToSpeechAdapter,
  createTranscriptionAdapter,
  createElevenLabsHealthTracker,
  ElevenLabsHealthTracker,
  loadElevenLabsConfig,
} from "../index.js";

const config = loadElevenLabsConfig({
  ELEVENLABS_API_KEY: "test-key-not-a-secret",
  ELEVENLABS_VOICE_ID: "test-voice",
  ELEVENLABS_STT_MODEL: "scribe_v2",
  ELEVENLABS_TTS_MODEL: "eleven_multilingual_v2",
});
if (!config) throw new Error("Test configuration failed");

const audio = {
  data: new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }),
  fileName: "report.webm",
  contentType: "audio/webm",
};
const validation = {
  maxBytes: 10,
  acceptedContentTypes: new Set(["audio/webm"]),
};

test("deterministic transcription includes provider provenance", async () => {
  const health = new ElevenLabsHealthTracker("DEGRADED", "NOT_CHECKED");
  const transcribe = createTranscriptionAdapter(
    createDeterministicElevenLabsTransport({ transcript: "Connexion intermittente", languageCode: "fra" }),
    config,
    health,
    validation,
  );
  const result = await transcribe({ audio, language: "fr" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.text, "Connexion intermittente");
    assert.deepEqual(result.data.provenance, { provider: "ELEVENLABS", model: "scribe_v2" });
  }
  assert.equal(health.read().state, "AVAILABLE");
});

test("failed transcription never fabricates text and degrades health", async () => {
  const health = new ElevenLabsHealthTracker("AVAILABLE", null);
  const transcribe = createTranscriptionAdapter(
    createDeterministicElevenLabsTransport({ failure: new Error("provider included sensitive details") }),
    config,
    health,
    validation,
  );
  const result = await transcribe({ audio });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, "ELEVENLABS_REQUEST_FAILED");
    assert.equal(JSON.stringify(result).includes("sensitive"), false);
  }
  assert.equal(health.read().state, "DEGRADED");
});

test("empty provider transcript fails instead of fabricating fallback", async () => {
  const health = new ElevenLabsHealthTracker("AVAILABLE", null);
  const transcribe = createTranscriptionAdapter(
    createDeterministicElevenLabsTransport({ transcript: "" }),
    config,
    health,
    validation,
  );
  const result = await transcribe({ audio });
  assert.deepEqual(result.ok, false);
  if (!result.ok) assert.equal(result.errorCode, "ELEVENLABS_INVALID_TRANSCRIPT");
});

test("TTS returns no fake success when the provider fails", async () => {
  const health = new ElevenLabsHealthTracker("AVAILABLE", null);
  const speak = createTextToSpeechAdapter(
    createDeterministicElevenLabsTransport({ failure: new Error("offline") }),
    config,
    health,
  );
  const result = await speak({
    communicationId: "communication-1",
    text: "Service has been restored.",
    language: "en",
    state: "READY",
  });
  assert.equal(result.ok, false);
  assert.equal(health.read().state, "DEGRADED");
});

test("timeout is bounded and returned as a safe retryable failure", async () => {
  const health = new ElevenLabsHealthTracker("AVAILABLE", null);
  const timeoutConfig = { ...config, timeoutMs: 5, maxRetries: 0 as const };
  const transcribe = createTranscriptionAdapter(
    {
      transcribe: () => new Promise(() => undefined),
      speak: async () => new Uint8Array([1]),
    },
    timeoutConfig,
    health,
    validation,
  );
  const result = await transcribe({ audio });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, "ELEVENLABS_TIMEOUT");
    assert.equal(result.retryable, true);
  }
});

test("audio policy rejects empty, oversized and unsupported uploads before provider calls", async () => {
  let calls = 0;
  const health = new ElevenLabsHealthTracker("AVAILABLE", null);
  const transcribe = createTranscriptionAdapter(
    {
      async transcribe() {
        calls += 1;
        return { text: "must not be called" };
      },
      async speak() {
        return new Uint8Array([1]);
      },
    },
    config,
    health,
    validation,
  );
  const empty = await transcribe({
    audio: { data: new Blob([], { type: "audio/webm" }), fileName: "empty.webm", contentType: "audio/webm" },
  });
  const unsupported = await transcribe({
    audio: { data: new Blob(["x"], { type: "audio/wav" }), fileName: "report.wav", contentType: "audio/wav" },
  });
  const oversized = await transcribe({
    audio: {
      data: new Blob([new Uint8Array(11)], { type: "audio/webm" }),
      fileName: "large.webm",
      contentType: "audio/webm",
    },
  });
  assert.equal(empty.ok, false);
  assert.equal(unsupported.ok, false);
  assert.equal(oversized.ok, false);
  assert.equal(calls, 0);
});

test("missing credentials leave integration explicitly unavailable", () => {
  const missing = loadElevenLabsConfig({});
  assert.equal(missing, null);
  assert.equal(createElevenLabsHealthTracker(missing).read().state, "UNAVAILABLE");
});

test("TTS rejects communication that is not approved/ready at runtime", async () => {
  let calls = 0;
  const health = new ElevenLabsHealthTracker("AVAILABLE", null);
  const speak = createTextToSpeechAdapter(
    {
      async transcribe() {
        return { text: "unused" };
      },
      async speak() {
        calls += 1;
        return new Uint8Array([1]);
      },
    },
    config,
    health,
  );
  const result = await speak({
    communicationId: "communication-draft",
    text: "Unverified text",
    language: "en",
    state: "DRAFT",
  } as never);
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});
