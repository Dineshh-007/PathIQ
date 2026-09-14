const PRISMTRACE_HOST = process.env.PRISMTRACE_HOST ?? "https://prism-api-prod.up.railway.app";
const PRISMTRACE_API_KEY = process.env.PRISMTRACE_API_KEY || "";
const PRISMTRACE_PROJECT_ID = process.env.PRISMTRACE_PROJECT_ID ?? "3db58ece-34eb-4cb9-a4c9-ab1e6eab1769";

export interface PrismTraceOptions {
  model?: string;
  latencyMs?: number;
  sessionId?: string;
}

export async function emitTrace(input: string, output: string, opts?: PrismTraceOptions) {
  if (!PRISMTRACE_API_KEY) {
    console.warn('[prismService] PRISMTRACE_API_KEY not set. Skipping trace emission.');
    return;
  }

  const res = await fetch(`${PRISMTRACE_HOST}/api/traces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PRISMtrace-Key": PRISMTRACE_API_KEY,
    },
    body: JSON.stringify({
      project_id: PRISMTRACE_PROJECT_ID,
      model: opts?.model ?? "gemini-1.5-pro",
      input_messages: [{ role: "user", content: input }],
      output_message: output,
      latency_ms: opts?.latencyMs ?? 0,
      session_id: opts?.sessionId,
    }),
  });
  
  if (!res.ok) {
    const body = await res.text();
    console.error(`PRISM ingest error ${res.status}: ${body}`);
  }
}
