import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TestResult } from "./types";
import type { Locale } from "./i18n";

function detectLocale(): Locale {
  const lang = navigator.language;
  return lang.startsWith("zh") ? "zh" : "en";
}

interface AppState {
  baseUrl: string;
  apiKey: string;
  model: string;
  dark: boolean;
  locale: Locale;
  results: Record<string, TestResult>;
  setBaseUrl: (v: string) => void;
  setApiKey: (v: string) => void;
  setModel: (v: string) => void;
  toggleDark: () => void;
  toggleLocale: () => void;
  setResult: (testId: string, result: TestResult) => void;
  clearResults: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      baseUrl: "",
      apiKey: "",
      model: "",
      dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
      locale: detectLocale(),
      results: {},
      setBaseUrl: (v) => set({ baseUrl: v }),
      setApiKey: (v) => set({ apiKey: v }),
      setModel: (v) => set({ model: v }),
      toggleDark: () =>
        set((s) => {
          const next = !s.dark;
          document.documentElement.classList.toggle("dark", next);
          return { dark: next };
        }),
      toggleLocale: () =>
        set((s) => ({ locale: s.locale === "zh" ? "en" : "zh" })),
      setResult: (testId, result) =>
        set((s) => ({ results: { ...s.results, [testId]: result } })),
      clearResults: () => set({ results: {} }),
    }),
    {
      name: "llmapi-tester-config",
      partialize: (s) => ({ baseUrl: s.baseUrl, apiKey: s.apiKey, model: s.model, dark: s.dark, locale: s.locale }),
    },
  ),
);
