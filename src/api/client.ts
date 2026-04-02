import type { ProviderConfig } from "../types";

export interface FetchOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface FetchResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

function buildUrl(config: ProviderConfig, path: string): string {
  const base = config.baseUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}

function buildHeaders(config: ProviderConfig, extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    ...extra,
  };
}

function parseUpstreamHeaders(res: Response): Record<string, string> {
  try {
    const raw = res.headers.get("x-upstream-headers");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function hasProxy(): boolean {
  return import.meta.env.DEV;
}

function collectHeaders(res: Response): Record<string, string> {
  const h: Record<string, string> = {};
  res.headers.forEach((v, k) => { h[k] = v; });
  return h;
}

export async function fetchJSON(
  config: ProviderConfig,
  opts: FetchOptions,
): Promise<FetchResult> {
  const targetUrl = buildUrl(config, opts.path);
  const headers = buildHeaders(config, opts.headers);

  if (hasProxy()) {
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl, method: opts.method, headers, body: opts.body }),
    });
    const upstreamHeaders = parseUpstreamHeaders(res);
    const body = await res.json();
    return { status: res.status, headers: upstreamHeaders, body };
  }

  // Direct mode (GitHub Pages / production without proxy)
  const res = await fetch(targetUrl, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json();
  return { status: res.status, headers: collectHeaders(res), body };
}

export interface SSEEvent {
  event?: string;
  data: string;
  raw: string;
}

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let rawSSE = "";
  let currentEvent: string | undefined;

  return (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      rawSSE += text;
      buffer += text;

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "") continue;
        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.charAt(6) === " " ? trimmed.slice(7) : trimmed.slice(6);
        } else if (trimmed.startsWith("data:")) {
          const data = trimmed.charAt(5) === " " ? trimmed.slice(6) : trimmed.slice(5);
          onEvent({ event: currentEvent, data, raw: line });
          currentEvent = undefined;
        }
      }
    }
    return rawSSE;
  })();
}

export async function fetchSSE(
  config: ProviderConfig,
  opts: FetchOptions,
  onEvent: (event: SSEEvent) => void,
): Promise<{ status: number; headers: Record<string, string>; rawSSE: string }> {
  const targetUrl = buildUrl(config, opts.path);
  const headers = buildHeaders(config, opts.headers);

  if (hasProxy()) {
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl, method: opts.method, headers, body: opts.body, stream: true }),
    });
    const upstreamStatus = parseInt(res.headers.get("x-proxy-status") || "200", 10);
    const upstreamHeaders = parseUpstreamHeaders(res);
    if (!res.body) return { status: upstreamStatus, headers: upstreamHeaders, rawSSE: "" };
    const rawSSE = await parseSSEStream(res.body.getReader(), onEvent);
    return { status: upstreamStatus, headers: upstreamHeaders, rawSSE };
  }

  // Direct mode
  const res = await fetch(targetUrl, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const resHeaders = collectHeaders(res);
  if (!res.body) return { status: res.status, headers: resHeaders, rawSSE: "" };
  const rawSSE = await parseSSEStream(res.body.getReader(), onEvent);
  return { status: res.status, headers: resHeaders, rawSSE };
}
