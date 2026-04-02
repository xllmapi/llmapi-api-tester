import type { TestDef, TestResult, CheckResult, ProviderConfig } from "../../types";
import { fetchSSE, type SSEEvent } from "../client";

function must(name: string, passed: boolean, reason: string, expected?: string, actual?: string): CheckResult {
  return { name, status: passed ? "pass" : "fail", level: "must", expected, actual, reason: passed ? undefined : reason };
}
function should(name: string, passed: boolean, reason: string, expected?: string, actual?: string): CheckResult {
  return { name, status: passed ? "pass" : "warn", level: "should", expected, actual, reason: passed ? undefined : reason };
}

async function run(config: ProviderConfig): Promise<TestResult> {
  const start = performance.now();
  const reqBody = {
    model: config.model,
    messages: [{ role: "user", content: "Say hello in one word." }],
    max_tokens: 50,
    stream: true,
    stream_options: { include_usage: true },
  };

  try {
    const events: SSEEvent[] = [];
    const sseResult = await fetchSSE(
      config,
      { method: "POST", path: "/v1/chat/completions", body: reqBody },
      (ev) => events.push(ev),
    );
    const duration = Math.round(performance.now() - start);

    let hasValidSSE = true;
    let hasChunkObject = false;
    let firstChunkHasRole = false;
    let hasDeltaContent = false;
    let hasFinishReason = false;
    let hasDoneMarker = false;
    let usageChunk: Record<string, unknown> | null = null;
    let usageChunkChoicesEmpty = false;

    for (const ev of events) {
      if (ev.data === "[DONE]") {
        hasDoneMarker = true;
        continue;
      }
      try {
        const parsed = JSON.parse(ev.data) as Record<string, unknown>;
        if (parsed.object === "chat.completion.chunk") hasChunkObject = true;
        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;

        if (delta?.role === "assistant") firstChunkHasRole = true;
        if (typeof delta?.content === "string" && delta.content.length > 0) hasDeltaContent = true;
        if (choices?.[0]?.finish_reason != null) hasFinishReason = true;

        if (parsed.usage && typeof parsed.usage === "object") {
          usageChunk = parsed.usage as Record<string, unknown>;
          usageChunkChoicesEmpty = Array.isArray(choices) && choices.length === 0;
        }
      } catch {
        hasValidSSE = false;
      }
    }

    const pt = usageChunk?.prompt_tokens as number | undefined;
    const ct = usageChunk?.completion_tokens as number | undefined;

    const checks: CheckResult[] = [
      must("Valid SSE events received", hasValidSSE && events.length > 0, "流式响应完全无效", "valid SSE", events.length === 0 ? "no events" : hasValidSSE ? "valid" : "parse error"),
      must('chunk object === "chat.completion.chunk"', hasChunkObject, "流式 chunk 类型标识错误", '"chat.completion.chunk"', hasChunkObject ? "correct" : "missing/wrong"),
      must('First chunk delta.role === "assistant"', firstChunkHasRole, "流式首 chunk 缺少角色标识", "true", String(firstChunkHasRole)),
      must("Chunks contain delta.content", hasDeltaContent, "流式内容为空", "true", String(hasDeltaContent)),
      must("finish_reason non-null in some chunk", hasFinishReason, "流缺少终止信号", "non-null", hasFinishReason ? "present" : "all null"),
      must('Ends with data: [DONE]', hasDoneMarker, "OpenAI 规范明确要求 [DONE] 作为流终止标记", "true", String(hasDoneMarker)),
      must("Final chunk has usage (stream_options)", usageChunk != null, "请求了 usage 但未返回", "present", usageChunk ? "present" : "missing"),
      should("Usage chunk choices is empty array", usageChunkChoicesEmpty, "规范：usage chunk 的 choices 应为 []", "[]", usageChunkChoicesEmpty ? "[]" : "non-empty"),
      should("usage.prompt_tokens > 0", (pt ?? 0) > 0, "Token 计量缺失", "> 0", String(pt)),
      should("usage.completion_tokens >= 0", (ct ?? -1) >= 0, "Token 计量缺失", ">= 0", String(ct)),
    ];

    // OpenAI cache fields in streaming usage chunk
    if (usageChunk) {
      const details = usageChunk.prompt_tokens_details as Record<string, number> | undefined;
      const cachedTokens = details?.cached_tokens;
      if (cachedTokens != null && cachedTokens >= 0) {
        checks.push(
          should("usage.prompt_tokens_details.cached_tokens present", true, "", String(cachedTokens), String(cachedTokens)),
          should("cached_tokens <= prompt_tokens", cachedTokens <= (pt ?? 0), "缓存 token 数不应超过 prompt_tokens 总量", `<= ${pt}`, String(cachedTokens)),
        );
      }
    }

    return {
      status: "done", checks, duration,
      request: { method: "POST", url: `${config.baseUrl}/v1/chat/completions`, headers: { Authorization: "Bearer ***" }, body: reqBody },
      response: { status: sseResult.status, headers: sseResult.headers, body: events.map((e) => e.data), rawSSE: sseResult.rawSSE },
    };
  } catch (e) {
    return { status: "error", checks: [], duration: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  }
}

export const openaiChatStreamTest: TestDef = {
  id: "openai-chat-stream", name: "POST /v1/chat/completions (stream)", protocol: "openai", description: "Streaming SSE format + [DONE] marker + usage", run,
};
