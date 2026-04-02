import { useState } from "react";

export function CodeBlock({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded px-1"
        aria-expanded={open}
      >
        <span className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden="true">&#9654;</span>
        {title}
      </button>
      {open && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
          {content}
        </pre>
      )}
    </div>
  );
}
