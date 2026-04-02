export type CheckStatus = "pass" | "warn" | "fail" | "skip";
export type CheckLevel = "must" | "should";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  level: CheckLevel;
  expected?: string;
  actual?: string;
  reason?: string;
}

export type TestStatus = "idle" | "running" | "done" | "error";

export interface TestResult {
  status: TestStatus;
  checks: CheckResult[];
  duration: number;
  request?: { method: string; url: string; headers: Record<string, string>; body?: unknown };
  response?: { status: number; headers: Record<string, string>; body: unknown; rawSSE?: string };
  error?: string;
}

export type Protocol = "openai" | "anthropic";

export interface TestDef {
  id: string;
  name: string;
  protocol: Protocol;
  description: string;
  run: (config: ProviderConfig) => Promise<TestResult>;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}
