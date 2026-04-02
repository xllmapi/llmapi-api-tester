import { useState } from "react";
import { useStore } from "../store";
import { t } from "../i18n";
import type { TestDef, TestResult } from "../types";
import { StatusBadge } from "./StatusBadge";
import { CheckItem } from "./CheckItem";
import { CodeBlock } from "./CodeBlock";

function overallStatus(result: TestResult | undefined): "idle" | "running" | "error" | "pass" | "warn" | "fail" {
  if (!result) return "idle";
  if (result.status === "running") return "running";
  if (result.status === "error") return "error";
  if (result.checks.some((c) => c.level === "must" && c.status === "fail")) return "fail";
  if (result.checks.some((c) => c.status === "warn" || c.status === "fail")) return "warn";
  return "pass";
}

export function TestCard({
  test,
  result,
  onRun,
}: {
  test: TestDef;
  result: TestResult | undefined;
  onRun: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locale = useStore((s) => s.locale);
  const status = overallStatus(result);
  const isRunning = result?.status === "running";

  const summary = (r: TestResult): string => {
    const mustPass = r.checks.filter((c) => c.level === "must" && c.status === "pass").length;
    const mustFail = r.checks.filter((c) => c.level === "must" && c.status === "fail").length;
    const shouldPass = r.checks.filter((c) => c.level === "should" && c.status === "pass").length;
    const shouldWarn = r.checks.filter((c) => c.level === "should" && c.status === "warn").length;
    const parts: string[] = [];
    if (mustPass > 0) parts.push(`${mustPass} MUST ${t("test.pass", locale)}`);
    if (mustFail > 0) parts.push(`${mustFail} MUST ${t("test.fail", locale)}`);
    if (shouldPass > 0) parts.push(`${shouldPass} SHOULD ${t("test.pass", locale)}`);
    if (shouldWarn > 0) parts.push(`${shouldWarn} SHOULD ${t("test.warn", locale)}`);
    return parts.join(", ");
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {test.name}
            </code>
            <StatusBadge status={status} />
          </div>
          {result?.status === "done" && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" style={{ fontVariantNumeric: "tabular-nums" }}>
              {result.duration}ms &middot; {summary(result)}
            </p>
          )}
          {result?.status === "error" && (
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 break-words">
              {result.error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            aria-label={`${t("test.run", locale)} ${test.name}`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {isRunning ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            )}
          </button>
          {result?.status === "done" && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? t("test.collapse", locale) : t("test.expand", locale)}
              aria-expanded={expanded}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {expanded && result?.status === "done" && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
          <div className="space-y-0.5">
            {result.checks.map((c, i) => (
              <CheckItem key={i} check={c} />
            ))}
          </div>
          {result.request && (
            <CodeBlock title={t("test.request", locale)} content={JSON.stringify(result.request, null, 2)} />
          )}
          {result.response && (
            <CodeBlock
              title={t("test.response", locale)}
              content={
                result.response.rawSSE
                  ? result.response.rawSSE
                  : JSON.stringify(result.response.body, null, 2)
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
