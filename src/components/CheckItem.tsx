import { useStore } from "../store";
import { t } from "../i18n";
import type { CheckResult } from "../types";

const icons: Record<string, string> = {
  pass: "\u2705",
  warn: "\u26a0\ufe0f",
  fail: "\u274c",
  skip: "\u23ed\ufe0f",
};

export function CheckItem({ check }: { check: CheckResult }) {
  const locale = useStore((s) => s.locale);
  const levelKey = check.level === "must" ? "level.must" as const : "level.should" as const;
  const levelClass = check.level === "must"
    ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <span className="shrink-0 w-5 text-center" aria-hidden="true">{icons[check.status]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center rounded px-1 py-0.5 text-[10px] font-bold leading-none ${levelClass}`}>
            {t(levelKey, locale)}
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{check.name}</span>
          {(check.status === "fail" || check.status === "warn") && check.expected && (
            <span className="text-zinc-500 dark:text-zinc-400">
              {t("check.expected", locale)} <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{check.expected}</code>
              {check.actual && (
                <>, {t("check.got", locale)} <code className={`text-xs px-1 rounded ${check.status === "fail" ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"}`}>{check.actual}</code></>
              )}
            </span>
          )}
          {check.status === "pass" && check.actual && (
            <span className="text-zinc-400 dark:text-zinc-500 text-xs">{check.actual}</span>
          )}
        </div>
        {check.reason && (check.status === "fail" || check.status === "warn") && (
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 pl-0.5">{check.reason}</p>
        )}
      </div>
    </div>
  );
}
