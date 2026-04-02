export type Locale = "zh" | "en";

const translations = {
  // App
  "app.title": { en: "LLM API Tester", zh: "LLM API \u6d4b\u8bd5\u5de5\u5177" },
  "app.switchToLight": { en: "Switch to light mode", zh: "\u5207\u6362\u5230\u6d45\u8272\u6a21\u5f0f" },
  "app.switchToDark": { en: "Switch to dark mode", zh: "\u5207\u6362\u5230\u6df1\u8272\u6a21\u5f0f" },
  "app.switchLang": { en: "\u4e2d\u6587", zh: "EN" },
  "app.footer": {
    en: "API keys are stored in your browser only. Never sent to third parties.",
    zh: "API \u5bc6\u94a5\u4ec5\u4fdd\u5b58\u5728\u60a8\u7684\u6d4f\u89c8\u5668\u4e2d\uff0c\u4e0d\u4f1a\u53d1\u9001\u7ed9\u4efb\u4f55\u7b2c\u4e09\u65b9\u3002",
  },

  // Config
  "config.baseUrl": { en: "Base URL", zh: "Base URL" },
  "config.baseUrlPlaceholder": { en: "https://api.example.com\u2026", zh: "https://api.example.com\u2026" },
  "config.apiKey": { en: "API Key", zh: "API Key" },
  "config.apiKeyPlaceholder": { en: "sk-\u2026", zh: "sk-\u2026" },
  "config.model": { en: "Model", zh: "\u6a21\u578b" },
  "config.modelOptional": { en: "(optional)", zh: "\uff08\u53ef\u9009\uff09" },
  "config.modelPlaceholder": { en: "Auto-detect from /v1/models", zh: "\u81ea\u52a8\u4ece /v1/models \u83b7\u53d6" },
  "config.runAll": { en: "Run All", zh: "\u5168\u90e8\u6d4b\u8bd5" },

  // Sections
  "section.openai": { en: "OpenAI", zh: "OpenAI" },
  "section.anthropic": { en: "Anthropic", zh: "Anthropic" },

  // Status
  "status.pass": { en: "Pass", zh: "\u901a\u8fc7" },
  "status.warn": { en: "Warn", zh: "\u8b66\u544a" },
  "status.fail": { en: "Fail", zh: "\u5931\u8d25" },
  "status.skip": { en: "Skip", zh: "\u8df3\u8fc7" },
  "status.idle": { en: "Idle", zh: "\u5f85\u6d4b" },
  "status.running": { en: "Running\u2026", zh: "\u8fd0\u884c\u4e2d\u2026" },
  "status.error": { en: "Error", zh: "\u9519\u8bef" },
  "status.done": { en: "Done", zh: "\u5b8c\u6210" },

  // TestCard
  "test.run": { en: "Run", zh: "\u8fd0\u884c" },
  "test.collapse": { en: "Collapse details", zh: "\u6536\u8d77\u8be6\u60c5" },
  "test.expand": { en: "Expand details", zh: "\u5c55\u5f00\u8be6\u60c5" },
  "test.request": { en: "Request", zh: "\u8bf7\u6c42" },
  "test.response": { en: "Response", zh: "\u54cd\u5e94" },
  "test.pass": { en: "pass", zh: "\u901a\u8fc7" },
  "test.warn": { en: "warn", zh: "\u8b66\u544a" },
  "test.fail": { en: "fail", zh: "\u5931\u8d25" },

  // CheckItem
  "check.expected": { en: "expected", zh: "\u671f\u671b" },
  "check.got": { en: "got", zh: "\u5b9e\u9645" },

  // Levels
  "level.must": { en: "MUST", zh: "\u5fc5\u987b" },
  "level.should": { en: "SHOULD", zh: "\u5efa\u8bae" },

  // Summary
  "summary.title": { en: "AI Summary Report", zh: "AI \u6d4b\u8bd5\u603b\u7ed3" },
  "summary.generating": { en: "Generating summary\u2026", zh: "\u6b63\u5728\u751f\u6210\u603b\u7ed3\u2026" },
} as const;

export type TransKey = keyof typeof translations;

export function t(key: TransKey, locale: Locale): string {
  return translations[key][locale];
}
