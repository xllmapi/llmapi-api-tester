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
  };

  try {
    const events: SSEEvent[] = [];
    const sseResult = await fetchSSE(
      config,
      {
        method: "POST",
        path: "/v1/messages",
        headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
        body: reqBody,
      },
      (ev) => events.push(ev),
    );
    const duration = Math.round(performance.now() - start);

    const eventTypes = events.map((e) => e.event).filter(Boolean);
    const hasMessageStart = eventTypes.includes("message_start");
    const hasContentBlockStart = eventTypes.includes("content_block_start");
    const hasContentBlockDelta = eventTypes.includes("content_block_delta");
    const hasContentBlockStop = eventTypes.includes("content_block_stop");
    const hasMessageDelta = eventTypes.includes("message_delta");
    const hasMessageStop = eventTypes.includes("message_stop");

    // Parse message_start
    let messageStartComplete = false;
    let msInputTokens = 0;
    let msCacheRead = 0;
    let msCacheCreation = 0;
    let msPromptTokens = 0;
    for (const ev of events) {
      if (ev.event === "message_start") {
        try {
          const parsed = JSON.parse(ev.data) as Record<string, unknown>;
          const msg = parsed.message as Record<string, unknown> | undefined;
          if (msg?.id && msg?.type && msg?.role) messageStartComplete = true;
          const usage = msg?.usage as Record<string, number> | undefined;
          msInputTokens = usage?.input_tokens ?? 0;
          msCacheRead = usage?.cache_read_input_tokens ?? 0;
          msCacheCreation = usage?.cache_creation_input_tokens ?? 0;
          msPromptTokens = usage?.prompt_tokens ?? 0;
        } catch { /* ignore */ }
      }
    }

    // Parse content_block_delta
    let hasValidDelta = false;
    for (const ev of events) {
      if (ev.event === "content_block_delta") {
        try {
          const parsed = JSON.parse(ev.data) as Record<string, unknown>;
          const delta = parsed.delta as Record<string, unknown> | undefined;
          if (delta?.type === "text_delta" && typeof delta?.text === "string" && delta.text.length > 0) hasValidDelta = true;
          if (delta?.type === "thinking_delta" && typeof delta?.thinking === "string" && delta.thinking.length > 0) hasValidDelta = true;
        } catch { /* ignore */ }
      }
    }

    // Parse message_delta
    let messageDeltaHasStopReason = false;
    let messageDeltaOutputTokens: number | null = null;
    for (const ev of events) {
      if (ev.event === "message_delta") {
        try {
          const parsed = JSON.parse(ev.data) as Record<string, unknown>;
          const delta = parsed.delta as Record<string, unknown> | undefined;
          if (delta?.stop_reason != null) messageDeltaHasStopReason = true;
          const usage = parsed.usage as Record<string, number> | undefined;
          messageDeltaOutputTokens = usage?.output_tokens ?? null;
        } catch { /* ignore */ }
      }
    }

    // SSE colon spacing
    let colonSpacingCorrect = true;
    for (const ev of events) {
      if (ev.raw.match(/^event:\S/)) {
        colonSpacingCorrect = false;
        break;
      }
    }

    // Cache-aware analysis
    const totalInput = msInputTokens + msCacheRead + msCacheCreation;
    const hasCacheFields = msCacheRead > 0 || msCacheCreation > 0;

    const checks: CheckResult[] = [
      must("event: message_start", hasMessageStart, "流式首事件缺失", "present", hasMessageStart ? "present" : "missing"),
      must("message_start contains message object", messageStartComplete, "首事件结构不完整", "id + type + role", messageStartComplete ? "complete" : "incomplete"),
      must("event: content_block_start", hasContentBlockStart, "内容块起始事件缺失", "present", hasContentBlockStart ? "present" : "missing"),
      must("event: content_block_delta", hasContentBlockDelta, "无内容增量事件", "present", hasContentBlockDelta ? "present" : "missing"),
      must("delta contains valid content (text_delta/thinking_delta)", hasValidDelta, "增量内容为空（thinking 模型使用 thinking_delta，普通模型使用 text_delta）", "has content", hasValidDelta ? "has content" : "empty"),
      must("event: content_block_stop", hasContentBlockStop, "内容块未正常关闭", "present", hasContentBlockStop ? "present" : "missing"),
      must("event: message_delta", hasMessageDelta, "缺少消息终止事件", "present", hasMessageDelta ? "present" : "missing"),
      must("message_delta contains stop_reason", messageDeltaHasStopReason, "终止事件缺少停止原因", "non-null", messageDeltaHasStopReason ? "present" : "missing"),
      must("event: message_stop", hasMessageStop, "流未正常终止", "present", hasMessageStop ? "present" : "missing"),
      must("message_delta usage.output_tokens > 0", messageDeltaOutputTokens != null && messageDeltaOutputTokens > 0, "Anthropic 规范要求 message_delta 包含 output_tokens", "> 0", String(messageDeltaOutputTokens)),
    ];

    // Input token checks: cache-aware
    if (hasCacheFields) {
      checks.push(
        must(`total input tokens > 0 (input=${msInputTokens} + cache_read=${msCacheRead} + cache_creation=${msCacheCreation})`, totalInput > 0, "输入 token 总量（含缓存）必须大于 0", "> 0", String(totalInput)),
        should("message_start usage.input_tokens > 0", msInputTokens > 0, `input_tokens=0 因全部命中缓存（cache_read=${msCacheRead}），Anthropic 规范允许此行为`, "> 0", String(msInputTokens)),
        should("message_start usage.cache_read_input_tokens present", msCacheRead >= 0, "使用了缓存时应返回 cache_read_input_tokens", ">= 0", String(msCacheRead)),
        should("message_start usage.cache_creation_input_tokens present", msCacheCreation >= 0, "使用了缓存时应返回 cache_creation_input_tokens", ">= 0", String(msCacheCreation)),
      );

      // Cache semantic: input_tokens should NOT include cached tokens
      const inputIncludesCached = msCacheRead > 0 && msInputTokens >= msCacheRead;
      checks.push(
        must(
          "input_tokens excludes cached tokens (no double counting)",
          !inputIncludesCached,
          `input_tokens(${msInputTokens}) >= cache_read(${msCacheRead})，说明 input_tokens 包含了缓存部分（OpenAI 语义），违反 Anthropic 标准。Anthropic 的 input_tokens 应仅包含非缓存 token，否则 total=input+cache_read 会重复计算，导致计费翻倍`,
          `< ${msCacheRead}`,
          String(msInputTokens),
        ),
      );

      // Detect OpenAI-style prompt_tokens field mixing
      if (msPromptTokens > 0) {
        checks.push(
          should(
            "no OpenAI-style prompt_tokens in Anthropic streaming",
            false,
            `Anthropic 流式响应中出现了 OpenAI 风格的 prompt_tokens(${msPromptTokens}) 字段，属于非标准行为`,
            "absent",
            String(msPromptTokens),
          ),
        );
        if (msPromptTokens === msInputTokens) {
          checks.push(
            must(
              "input_tokens !== prompt_tokens (semantic conflict)",
              false,
              `input_tokens(${msInputTokens}) === prompt_tokens(${msPromptTokens})，两者语义冲突。Anthropic 的 input_tokens 应仅为非缓存部分，但此处与 prompt_tokens 相同说明使用了 OpenAI 语义（含缓存），代理平台按标准公式计算将导致重复计费`,
              `input_tokens < prompt_tokens`,
              `both = ${msInputTokens}`,
            ),
          );
        }
      }
    } else {
      checks.push(
        must("message_start usage.input_tokens > 0", msInputTokens > 0, "Anthropic 规范要求 message_start 包含 input_tokens（代理转换场景可能为 0，因上游 OpenAI 流开始时不提供此值）", "> 0", String(msInputTokens)),
      );
    }

    checks.push(
      should('SSE event: colon spacing ("event: X")', colonSpacingCorrect, "WHATWG SSE 规范中空格可选，但 Anthropic 官方示例始终使用空格", '"event: X"', colonSpacingCorrect ? "correct" : '"event:X"'),
    );

    return {
      status: "done", checks, duration,
      request: { method: "POST", url: `${config.baseUrl}/v1/messages`, headers: { "x-api-key": "***", "anthropic-version": "2023-06-01" }, body: reqBody },
      response: { status: sseResult.status, headers: sseResult.headers, body: events.map((e) => ({ event: e.event, data: e.data })), rawSSE: sseResult.rawSSE },
    };
  } catch (e) {
    return { status: "error", checks: [], duration: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  }
}

export const anthropicMessagesStreamTest: TestDef = {
  id: "anthropic-messages-stream", name: "POST /v1/messages (stream)", protocol: "anthropic", description: "Streaming SSE event sequence + format + usage", run,
};
