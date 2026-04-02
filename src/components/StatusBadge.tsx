import { useStore } from "../store";
import { t, type TransKey } from "../i18n";
import type { CheckStatus } from "../types";

type BadgeStatus = CheckStatus | "idle" | "running" | "error" | "done";

const classMap: Record<BadgeStatus, string> = {
  pass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  fail: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  skip: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  idle: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  running: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const keyMap: Record<BadgeStatus, TransKey> = {
  pass: "status.pass",
  warn: "status.warn",
  fail: "status.fail",
  skip: "status.skip",
  idle: "status.idle",
  running: "status.running",
  error: "status.error",
  done: "status.done",
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const locale = useStore((s) => s.locale);
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${classMap[status]}`}>
      {t(keyMap[status], locale)}
    </span>
  );
}
