import { useState, useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore } from "../store";
import { t } from "../i18n";

function parseThinkingAndContent(raw: string): { thinking: string; content: string } {
  const thinkMatch = raw.match(/<think>([\s\S]*?)(<\/think>|$)/);
  if (!thinkMatch) return { thinking: "", content: raw };
  const thinking = thinkMatch[1].trim();
  const afterThink = raw.replace(/<think>[\s\S]*?(<\/think>|$)/, "").trim();
  return { thinking, content: afterThink };
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const locale = useStore((s) => s.locale);

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <span className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden="true">&#9654;</span>
        {locale === "zh" ? "思考过程" : "Thinking"}
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

export function SummaryReport({
  content,
  loading,
}: {
  content: string;
  loading: boolean;
}) {
  const locale = useStore((s) => s.locale);
  const { thinking, content: mainContent } = useMemo(() => parseThinkingAndContent(content), [content]);

  if (!content && !loading) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-2">
        {t("summary.title", locale)}
        {loading && (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" aria-hidden="true" />
        )}
      </h2>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm p-5">
        {thinking && <ThinkingBlock text={thinking} />}
        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none [&_table]:text-sm [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_table]:border-collapse [&_th]:border [&_th]:border-zinc-200 [&_th]:dark:border-zinc-700 [&_td]:border [&_td]:border-zinc-200 [&_td]:dark:border-zinc-700 [&_th]:bg-zinc-50 [&_th]:dark:bg-zinc-800 [&_code]:text-xs [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:dark:bg-zinc-800">
          {mainContent ? (
            <Markdown remarkPlugins={[remarkGfm]}>{mainContent}</Markdown>
          ) : (
            loading && <p className="text-zinc-400 dark:text-zinc-500">{t("summary.generating", locale)}</p>
          )}
          {loading && <span className="inline-block w-1.5 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse ml-0.5 align-text-bottom" aria-hidden="true" />}
        </div>
      </div>
    </section>
  );
}
