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

// Multi-topic types
export type TopicStatus = "pending" | "processing" | "completed" | "failed";
export type WritingMode = "contentforge" | "claude-seo";
export type OutputFormat = "cms-html" | "chirpy" | "clean-md";

export interface Topic {
  id: string;
  title: string;
  focusKeyword: string;
  status: TopicStatus;
  progress: number;
  sourceFileName?: string;
  sourceText?: string;
  result?: string;
  error?: string;
  wordCount?: number;
  createdAt: string;
  completedAt?: string;
}

export interface BatchJob {
  id: string;
  topics: Topic[];
  mode: WritingMode;
  outputFormat: OutputFormat;
  wordCount: number;
  authorName: string;
  genMode: "generate" | "rewrite";
  createdAt: string;
  completedAt?: string;
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
  BATCH_JOBS: "cb_batch_jobs",
} as const;
