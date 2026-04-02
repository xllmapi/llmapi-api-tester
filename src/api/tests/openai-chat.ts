import type { TestDef, TestResult, CheckResult, ProviderConfig } from "../../types";
import { fetchJSON } from "../client";

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
  };

  try {
    const res = await fetchJSON(config, { method: "POST", path: "/v1/chat/completions", body: reqBody });
    const duration = Math.round(performance.now() - start);
    const body = res.body as Record<string, unknown>;
    const choices = body?.choices as Array<Record<string, unknown>> | undefined;
    const choice0 = choices?.[0];
    const message = choice0?.message as Record<string, unknown> | undefined;
    const usage = body?.usage as Record<string, number> | undefined;

    const checks: CheckResult[] = [
      must("HTTP 200", res.status === 200, "接口不可用或请求格式错误", "200", String(res.status)),
      must("id exists", typeof body?.id === "string", "响应缺少必需字段", "string", typeof body?.id),
      must('object === "chat.completion"', body?.object === "chat.completion", "响应类型标识错误", '"chat.completion"', JSON.stringify(body?.object)),
      must("model exists", typeof body?.model === "string", "响应缺少必需字段", "string", typeof body?.model),
      must("choices is non-empty array", Array.isArray(choices) && choices.length > 0, "响应缺少必需字段", "non-empty array", Array.isArray(choices) ? `length=${choices.length}` : typeof choices),
      must('choices[0].message.role === "assistant"', message?.role === "assistant", "消息角色不符合规范", '"assistant"', JSON.stringify(message?.role)),
      must("choices[0].message.content is string or null", typeof message?.content === "string" || message?.content === null, "消息内容类型错误", "string | null", typeof message?.content),
      must("choices[0].finish_reason exists", choice0?.finish_reason != null, "缺少完成原因（stop/length/tool_calls/content_filter）", "non-null", JSON.stringify(choice0?.finish_reason)),
      must("choices[0].index exists", typeof choice0?.index === "number", "缺少索引字段", "number", typeof choice0?.index),
      should("usage exists", usage != null, "规范中 usage 为可选字段，但绝大多数实现都会返回", "present", usage ? "present" : "missing"),
      should("usage.prompt_tokens > 0", (usage?.prompt_tokens ?? 0) > 0, "Token 计量缺失，影响计费", "> 0", String(usage?.prompt_tokens)),
      should("usage.completion_tokens >= 0", (usage?.completion_tokens ?? -1) >= 0, "Token 计量缺失", ">= 0", String(usage?.completion_tokens)),
      should("usage.total_tokens === prompt + completion", usage?.total_tokens === (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0), "Token 计算不一致，影响计费准确性", String((usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0)), String(usage?.total_tokens)),
    ];

    return {
      status: "done", checks, duration,
      request: { method: "POST", url: `${config.baseUrl}/v1/chat/completions`, headers: { Authorization: "Bearer ***" }, body: reqBody },
      response: { status: res.status, headers: res.headers, body: res.body },
    };
  } catch (e) {
    return { status: "error", checks: [], duration: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  }
}

export const openaiChatTest: TestDef = {
  id: "openai-chat", name: "POST /v1/chat/completions", protocol: "openai", description: "Non-streaming chat completion format", run,
};
