import type { TestDef, TestResult, CheckResult, ProviderConfig } from "../../types";
import { fetchJSON } from "../client";

function must(name: string, passed: boolean, reason: string, expected?: string, actual?: string): CheckResult {
  return { name, status: passed ? "pass" : "fail", level: "must", expected, actual, reason: passed ? undefined : reason };
}

async function run(config: ProviderConfig): Promise<TestResult> {
  const start = performance.now();
  const reqBody = {
    model: config.model,
    messages: [{ role: "user", content: "Say hello in one word." }],
    max_tokens: 50,
  };

  try {
    const res = await fetchJSON(config, {
      method: "POST",
      path: "/v1/messages",
      headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
      body: reqBody,
    });
    const duration = Math.round(performance.now() - start);
    const body = res.body as Record<string, unknown>;
    const content = body?.content as Array<Record<string, unknown>> | undefined;
    const usage = body?.usage as Record<string, number> | undefined;
    const hasTextContent = Array.isArray(content) && content.some((c) => c.type === "text");
    const contentTypes = Array.isArray(content) ? content.map((c) => c.type).join(", ") : "not array";

    const checks: CheckResult[] = [
      must("HTTP 200", res.status === 200, "接口不可用或认证失败", "200", String(res.status)),
      must('type === "message"', body?.type === "message", "响应类型标识错误", '"message"', JSON.stringify(body?.type)),
      must('role === "assistant"', body?.role === "assistant", "角色不符合规范", '"assistant"', JSON.stringify(body?.role)),
      must("content is non-empty array", Array.isArray(content) && content.length > 0, "响应内容为空", "non-empty array", Array.isArray(content) ? `length=${content.length}` : "not array"),
      must('content contains type: "text"', hasTextContent, "响应缺少文本内容（thinking 模型会有 thinking 块在前）", 'includes "text"', contentTypes),
      must("id exists", typeof body?.id === "string", "响应缺少必需字段", "string", typeof body?.id),
      must("model exists", typeof body?.model === "string", "响应缺少必需字段", "string", typeof body?.model),
      must("stop_reason exists", body?.stop_reason != null, "缺少停止原因（end_turn/stop_sequence/max_tokens/tool_use）", "non-null", JSON.stringify(body?.stop_reason)),
      must("usage.input_tokens > 0", (usage?.input_tokens ?? 0) > 0, "Anthropic 规范 usage 为必需字段", "> 0", String(usage?.input_tokens)),
      must("usage.output_tokens > 0", (usage?.output_tokens ?? 0) > 0, "Anthropic 规范 usage 为必需字段", "> 0", String(usage?.output_tokens)),
    ];

    return {
      status: "done", checks, duration,
      request: { method: "POST", url: `${config.baseUrl}/v1/messages`, headers: { "x-api-key": "***", "anthropic-version": "2023-06-01" }, body: reqBody },
      response: { status: res.status, headers: res.headers, body: res.body },
    };
  } catch (e) {
    return { status: "error", checks: [], duration: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  }
}

export const anthropicMessagesTest: TestDef = {
  id: "anthropic-messages", name: "POST /v1/messages", protocol: "anthropic", description: "Non-streaming messages format", run,
};
