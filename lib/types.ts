export interface ArticleRecord {
  id: string;
  fileName: string;
  originalText: string;
  rewrittenText: string;
  mode: "contentforge" | "claude-seo";
  outputFormat: "cms-html" | "chirpy" | "clean-md";
  wordCount: number;
  createdAt: string;
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs?: number;
  corsProxyUrl?: string;       // Optional custom CORS proxy (e.g., https://your-proxy.vercel.app/api/proxy?url=)
}

export interface RewriteProgress {
  status: "idle" | "parsing" | "rewriting" | "streaming" | "complete" | "error";
  progress: number;
  currentText: string;
  error?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openai/gpt-4o-mini",
  temperature: 1.0,
  maxTokens: 20000,
  timeoutMs: 60000,
  corsProxyUrl: "",
};

export const STORAGE_KEYS = {
  SETTINGS: "cb_settings",
  HISTORY: "cb_history",
  LAST_MODE: "cb_last_mode",
  LAST_FORMAT: "cb_last_format",
} as const;
