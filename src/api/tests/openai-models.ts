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
  try {
    const res = await fetchJSON(config, { method: "GET", path: "/v1/models" });
    const duration = Math.round(performance.now() - start);
    const body = res.body as Record<string, unknown>;
    const data = body?.data as Array<Record<string, unknown>> | undefined;
    const hasData = Array.isArray(data) && data.length > 0;
    const first = hasData ? data![0] : undefined;

    const checks: CheckResult[] = [
      must("HTTP 200", res.status === 200, "接口不可用或认证失败", "200", String(res.status)),
      must('object === "list"', body?.object === "list", "响应格式不符合 OpenAI 规范", '"list"', JSON.stringify(body?.object)),
      must("data is array", Array.isArray(data), "响应结构缺失", "array", typeof data),
      must("data[0].id exists", hasData && typeof first?.id === "string", "模型对象缺少必需字段", "string", hasData ? typeof first?.id : "empty data"),
      must('data[0].object === "model"', hasData && first?.object === "model", "模型对象 type 不符合规范", '"model"', hasData ? JSON.stringify(first?.object) : "empty data"),
      should("data[0].created exists", hasData && typeof first?.created === "number", "OpenAI 规范要求，部分代理可能省略", "number", hasData ? typeof first?.created : "empty data"),
      should("data[0].owned_by exists", hasData && typeof first?.owned_by === "string", "OpenAI 规范要求，部分代理可能省略", "string", hasData ? typeof first?.owned_by : "empty data"),
    ];

    return {
      status: "done", checks, duration,
      request: { method: "GET", url: `${config.baseUrl}/v1/models`, headers: { Authorization: "Bearer ***" } },
      response: { status: res.status, headers: res.headers, body: res.body },
    };
  } catch (e) {
    return { status: "error", checks: [], duration: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  }
}

export const openaiModelsTest: TestDef = {
  id: "openai-models", name: "GET /v1/models", protocol: "openai", description: "List models endpoint format", run,
};
