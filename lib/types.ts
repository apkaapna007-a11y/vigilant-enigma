export interface ArticleRecord {
  id: string;
  fileName: string;
  originalText: string;
  rewrittenText: string;
  mode: "contentforge" | "claude-seo";
  outputFormat: "cms-html" | "chirpy" | "clean-md";
  wordCount: number;
  createdAt: string;
  topicCategory?: string;
  processingTimeMs?: number;
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs?: number;
  corsProxyUrl?: string;
  defaultAuthor?: string;
  defaultWordCount?: number;
  defaultMode?: "contentforge" | "claude-seo";
  defaultFormat?: "cms-html" | "chirpy" | "clean-md";
  autoSaveDrafts?: boolean;
  concurrentLimit?: number;
  retryFailed?: boolean;
}

export interface RewriteProgress {
  status: "idle" | "parsing" | "rewriting" | "streaming" | "complete" | "error";
  progress: number;
  currentText: string;
  error?: string;
}

// Multi-topic types
export type TopicStatus = "pending" | "processing" | "completed" | "failed" | "queued";
export type TopicPriority = "low" | "normal" | "high" | "urgent";
export type TopicCategory = "newborn" | "infant" | "toddler" | "nutrition" | "sleep" | "development" | "health" | "safety" | "general";
export type WritingMode = "contentforge" | "claude-seo";
export type OutputFormat = "cms-html" | "chirpy" | "clean-md";

export interface Topic {
  id: string;
  title: string;
  focusKeyword: string;
  status: TopicStatus;
  progress: number;
  priority: TopicPriority;
  category: TopicCategory;
  sourceFileName?: string;
  sourceText?: string;
  result?: string;
  error?: string;
  wordCount?: number;
  createdAt: string;
  completedAt?: string;
  processingTimeMs?: number;
  tags?: string[];
  templateId?: string;
}

export interface TopicTemplate {
  id: string;
  name: string;
  description: string;
  category: TopicCategory;
  topics: Array<{
    title: string;
    focusKeyword: string;
    tags?: string[];
  }>;
  icon?: string;
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

export interface DashboardStats {
  totalArticles: number;
  totalWords: number;
  avgWordCount: number;
  totalBatches: number;
  successRate: number;
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
  modeDistribution: { contentforge: number; "claude-seo": number };
  formatDistribution: { "cms-html": number; chirpy: number; "clean-md": number };
}

export const CATEGORY_LABELS: Record<TopicCategory, string> = {
  newborn: "Newborn Care",
  infant: "Infant Health",
  toddler: "Toddler Development",
  nutrition: "Nutrition & Feeding",
  sleep: "Sleep & Routines",
  development: "Milestones & Development",
  health: "Health & Medical",
  safety: "Safety & Prevention",
  general: "General Parenting",
};

export const CATEGORY_ICONS: Record<TopicCategory, string> = {
  newborn: "👶",
  infant: "🍼",
  toddler: "🧒",
  nutrition: "🥗",
  sleep: "🌙",
  development: "📈",
  health: "🏥",
  safety: "🛡️",
  general: "📋",
};

export const PRIORITY_COLORS: Record<TopicPriority, string> = {
  low: "text-slate-500 bg-slate-100 border-slate-200",
  normal: "text-blue-600 bg-blue-50 border-blue-200",
  high: "text-amber-600 bg-amber-50 border-amber-200",
  urgent: "text-red-600 bg-red-50 border-red-200",
};

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openai/gpt-4o-mini",
  temperature: 1.0,
  maxTokens: 20000,
  timeoutMs: 60000,
  corsProxyUrl: "",
  defaultAuthor: "ChildBloom Editorial",
  defaultWordCount: 2000,
  defaultMode: "contentforge",
  defaultFormat: "cms-html",
  autoSaveDrafts: true,
  concurrentLimit: 3,
  retryFailed: true,
};

export const STORAGE_KEYS = {
  SETTINGS: "cb_settings",
  HISTORY: "cb_history",
  LAST_MODE: "cb_last_mode",
  LAST_FORMAT: "cb_last_format",
  BATCH_JOBS: "cb_batch_jobs",
  TEMPLATES: "cb_templates",
  DRAFTS: "cb_drafts",
} as const;

export const DEFAULT_TEMPLATES: TopicTemplate[] = [
  {
    id: "newborn-basics",
    name: "Newborn Essentials",
    description: "Core topics for new parents covering newborn care fundamentals",
    category: "newborn",
    icon: "👶",
    topics: [
      { title: "Newborn Bathing Guide: First Bath and Beyond", focusKeyword: "newborn bathing guide", tags: ["hygiene", "first-time-parent"] },
      { title: "Umbilical Cord Care: What Parents Need to Know", focusKeyword: "umbilical cord care", tags: ["newborn", "health"] },
      { title: "Newborn Jaundice: Signs, Treatment, and When to Worry", focusKeyword: "newborn jaundice", tags: ["health", "newborn"] },
      { title: "How to Swaddle a Baby Safely: Step-by-Step", focusKeyword: "how to swaddle a baby", tags: ["sleep", "safety"] },
      { title: "Newborn Skin Care: Rashes, Dryness, and Gentle Solutions", focusKeyword: "newborn skin care", tags: ["skin", "care"] },
    ],
  },
  {
    id: "sleep-training",
    name: "Sleep Training Bundle",
    description: "Comprehensive sleep topics from newborn to toddler",
    category: "sleep",
    icon: "🌙",
    topics: [
      { title: "Baby Sleep Training Methods: A Complete Comparison", focusKeyword: "baby sleep training methods", tags: ["sleep", "comparison"] },
      { title: "Sleep Regression at 4 Months: Why It Happens and What to Do", focusKeyword: "4 month sleep regression", tags: ["sleep", "regression"] },
      { title: "How to Establish a Bedtime Routine for Your Baby", focusKeyword: "bedtime routine baby", tags: ["routine", "sleep"] },
      { title: "Co-Sleeping vs Crib: Safety Guidelines and Expert Opinions", focusKeyword: "co-sleeping safety", tags: ["safety", "sleep"] },
    ],
  },
  {
    id: "nutrition-starters",
    name: "Nutrition Foundations",
    description: "Essential feeding and nutrition topics from birth to toddlerhood",
    category: "nutrition",
    icon: "🥗",
    topics: [
      { title: "Breastfeeding vs Formula: A Balanced Evidence-Based Guide", focusKeyword: "breastfeeding vs formula", tags: ["feeding", "comparison"] },
      { title: "Starting Solids: When and How to Introduce Baby Food", focusKeyword: "starting solids baby", tags: ["nutrition", "milestone"] },
      { title: "Baby-Led Weaning: Benefits, Risks, and Getting Started", focusKeyword: "baby-led weaning", tags: ["nutrition", "method"] },
      { title: "Common Food Allergies in Babies: Signs and Prevention", focusKeyword: "baby food allergies", tags: ["allergies", "nutrition"] },
      { title: "Iron-Rich Foods for Babies: Why They Matter After 6 Months", focusKeyword: "iron rich foods baby", tags: ["nutrition", "iron"] },
    ],
  },
  {
    id: "milestone-guide",
    name: "Developmental Milestones",
    description: "Track and support key developmental stages",
    category: "development",
    icon: "📈",
    topics: [
      { title: "Baby Milestones Month by Month: What to Expect in Year One", focusKeyword: "baby milestones month by month", tags: ["milestones", "development"] },
      { title: "When Should Baby Talk? Speech Development Timeline", focusKeyword: "baby speech development", tags: ["speech", "milestones"] },
      { title: "Toddler Walking Timeline: When to Worry About Delayed Walking", focusKeyword: "toddler walking timeline", tags: ["motor", "milestones"] },
      { title: "Sensory Development in Babies: Activities by Age", focusKeyword: "sensory development babies", tags: ["sensory", "activities"] },
    ],
  },
  {
    id: "safety-first",
    name: "Child Safety Essentials",
    description: "Critical safety topics every parent should know",
    category: "safety",
    icon: "🛡️",
    topics: [
      { title: "Baby-Proofing Your Home: A Room-by-Room Checklist", focusKeyword: "baby-proofing home checklist", tags: ["safety", "home"] },
      { title: "Infant CPR: Step-by-Step Emergency Guide for Parents", focusKeyword: "infant CPR guide", tags: ["emergency", "safety"] },
      { title: "Car Seat Safety: Installation Mistakes and Correct Usage", focusKeyword: "car seat safety", tags: ["travel", "safety"] },
      { title: "Choking Hazards in Babies: Prevention and First Aid", focusKeyword: "baby choking hazards", tags: ["emergency", "safety"] },
    ],
  },
];
