import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { t } from "./i18n";
import { openaiTests, anthropicTests, allTests } from "./api/tests";
import { fetchJSON, fetchSSE } from "./api/client";
import { ConfigPanel } from "./components/ConfigPanel";
import { TestCard } from "./components/TestCard";
import { SummaryReport } from "./components/SummaryReport";
import type { TestDef, TestResult } from "./types";

function buildSummaryPrompt(results: Record<string, TestResult>, locale: string): string {
  const lines: string[] = [];
  for (const test of allTests) {
    const r = results[test.id];
    if (!r || r.status !== "done") continue;
    lines.push(`## ${test.name} (${test.protocol})`);
    lines.push(`Duration: ${r.duration}ms`);
    for (const c of r.checks) {
      const icon = c.status === "pass" ? "PASS" : c.status === "warn" ? "WARN" : "FAIL";
      const detail = c.status !== "pass" && c.reason ? ` — ${c.reason}` : "";
      lines.push(`- [${icon}] [${c.level.toUpperCase()}] ${c.name}${c.expected ? ` (expected: ${c.expected}, actual: ${c.actual})` : ""}${detail}`);
    }
    lines.push("");
  }

  const lang = locale === "zh" ? "中文" : "English";
  return `You are an API compliance testing expert. Below are the test results of an LLM API provider against the OpenAI and Anthropic API standards. Each check is marked with its level (MUST = required by spec, SHOULD = recommended) and status (PASS/WARN/FAIL).

Please provide a concise summary report in ${lang}:
1. Overall compliance assessment (one sentence)
2. Key issues found (list each MUST FAIL and SHOULD WARN with brief explanation)
3. Recommendations for the API provider

Test Results:
${lines.join("\n")}`;
}

export default function App() {
  const { dark, toggleDark, locale, toggleLocale, baseUrl, apiKey, model, results, setResult } = useStore();
  const [running, setRunning] = useState(false);
  const [resolvedModel, setResolvedModel] = useState("");
  const [summaryContent, setSummaryContent] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const detectModel = useCallback(async (): Promise<string> => {
    if (model) return model;
    try {
      const res = await fetchJSON({ baseUrl, apiKey, model: "" }, { method: "GET", path: "/v1/models" });
      const body = res.body as { data?: Array<{ id: string }> };
      if (Array.isArray(body?.data) && body.data.length > 0) {
        const detected = body.data[0].id;
        setResolvedModel(detected);
        return detected;
      }
    } catch { /* ignore */ }
    return model;
  }, [baseUrl, apiKey, model]);

  const generateSummary = useCallback(async (m: string, currentResults: Record<string, TestResult>) => {
    setSummaryContent("");
    setSummaryLoading(true);
    let accumulated = "";
    try {
      await fetchSSE(
        { baseUrl, apiKey, model: m },
        {
          method: "POST",
          path: "/v1/chat/completions",
          body: {
            model: m,
            messages: [{ role: "user", content: buildSummaryPrompt(currentResults, locale) }],
            max_tokens: 1024,
            stream: true,
          },
        },
        (ev) => {
          if (ev.data === "[DONE]") return;
          try {
            const parsed = JSON.parse(ev.data) as Record<string, unknown>;
            const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
            const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
            if (typeof delta?.content === "string") {
              accumulated += delta.content;
              setSummaryContent(accumulated);
            }
          } catch { /* ignore */ }
        },
      );
    } catch (e) {
      accumulated += `\n\n[Error: ${e instanceof Error ? e.message : String(e)}]`;
      setSummaryContent(accumulated);
    }
    setSummaryLoading(false);
  }, [baseUrl, apiKey, locale]);

  const runSingle = useCallback(
    async (test: TestDef, useModel?: string) => {
      const m = useModel ?? (model || resolvedModel);
      setResult(test.id, { status: "running", checks: [], duration: 0 });
      const result = await test.run({ baseUrl, apiKey, model: m });
      if (!abortRef.current) {
        setResult(test.id, result);
      }
      return result;
    },
    [baseUrl, apiKey, model, resolvedModel, setResult],
  );

  const runAll = useCallback(async () => {
    abortRef.current = false;
    setRunning(true);
    setSummaryContent("");
    const m = await detectModel();
    const collected: Record<string, TestResult> = {};
    for (const test of allTests) {
      if (abortRef.current) break;
      const result = await runSingle(test, m);
      collected[test.id] = result;
    }
    setRunning(false);
    if (!abortRef.current) {
      await generateSummary(m, collected);
    }
  }, [runSingle, detectModel, generateSummary]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-wrap-balance">
            {t("app.title", locale)}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={t("app.switchLang", locale)}
              className="inline-flex items-center justify-center h-9 px-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {t("app.switchLang", locale)}
            </button>
            <button
              type="button"
              onClick={toggleDark}
              aria-label={dark ? t("app.switchToLight", locale) : t("app.switchToDark", locale)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Config */}
        <ConfigPanel onRunAll={runAll} running={running || summaryLoading} />

        {/* Summary Report */}
        <SummaryReport content={summaryContent} loading={summaryLoading} />

        {/* OpenAI Tests */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            {t("section.openai", locale)}
          </h2>
          <div className="space-y-3">
            {openaiTests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                result={results[test.id]}
                onRun={() => runSingle(test)}
              />
            ))}
          </div>
        </section>

        {/* Anthropic Tests */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            {t("section.anthropic", locale)}
          </h2>
          <div className="space-y-3">
            {anthropicTests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                result={results[test.id]}
                onRun={() => runSingle(test)}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-zinc-400 dark:text-zinc-600">
          {t("app.footer", locale)}
        </footer>
      </div>
    </div>
  );
}
