import { useStore } from "../store";
import { t } from "../i18n";

export function ConfigPanel({ onRunAll, running }: { onRunAll: () => void; running: boolean }) {
  const { baseUrl, apiKey, model, locale, setBaseUrl, setApiKey, setModel } = useStore();

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="base-url" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t("config.baseUrl", locale)}
          </label>
          <input
            id="base-url"
            type="url"
            placeholder={t("config.baseUrlPlaceholder", locale)}
            defaultValue={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            autoComplete="url"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 transition-shadow duration-150"
          />
        </div>
        <div>
          <label htmlFor="api-key" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t("config.apiKey", locale)}
          </label>
          <input
            id="api-key"
            type="password"
            placeholder={t("config.apiKeyPlaceholder", locale)}
            defaultValue={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 transition-shadow duration-150"
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t("config.model", locale)} <span className="text-zinc-400 dark:text-zinc-500 font-normal">{t("config.modelOptional", locale)}</span>
          </label>
          <input
            id="model"
            type="text"
            placeholder={t("config.modelPlaceholder", locale)}
            defaultValue={model}
            onChange={(e) => setModel(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 transition-shadow duration-150"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onRunAll}
          disabled={running || !baseUrl || !apiKey}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
        >
          {running && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          )}
          {t("config.runAll", locale)}
        </button>
      </div>
    </div>
  );
}
