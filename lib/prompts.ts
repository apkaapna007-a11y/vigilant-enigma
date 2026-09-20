// Prompt system — loads master prompt from public/soul.md
// Edit /public/soul.md to change the system prompt (no code changes needed)

export type WritingMode = "contentforge" | "claude-seo";
export type OutputFormat = "cms-html" | "chirpy" | "clean-md";

let cachedSoul: string | null = null;

// Format-specific instruction appended to master prompt
const FORMAT_INSTRUCTIONS: Record<OutputFormat, string> = {
  "cms-html":
    "\n\n## OUTPUT FORMAT: CMS-Ready HTML\n\nOutput clean, semantic HTML using <article>, <section>, <nav>, <header> elements. Use <details>/<summary> for FAQs. All headings get id attributes for TOC anchoring. Use <strong> for key terms on first mention. Use <em> for subtle emphasis only.",
  chirpy:
    "\n\n## OUTPUT FORMAT: Chirpy Jekyll Markdown\n\nOutput standard markdown with YAML frontmatter at the top. The frontmatter must include:\n---\ntitle: \"Article Title\"\ndescription: \"One sentence summary\"\nauthor: [AUTHOR_NAME]\ndate: [CURRENT_DATE]\ncategories: [Parenting]\ntags: [relevant, tags, here]\n---\n\nAfter the frontmatter, write the article in standard markdown. Do NOT use HTML tags — pure markdown only.",
  "clean-md":
    "\n\n## OUTPUT FORMAT: Clean Markdown\n\nOutput standard markdown without any frontmatter or HTML. Pure content only. Use markdown headings (##, ###), bold (**text**), italic (*text*), lists, and tables. No YAML frontmatter. No HTML tags.",
};

// Mode-specific instruction appended to master prompt
const MODE_INSTRUCTIONS: Record<WritingMode, string> = {
  contentforge:
    "\n\n## WRITING MODE: ContentForge SEO (PRIMARY)\nPrioritize aggressive SEO structure: exact match keyword in first 100 words, semantic variations, LSI keywords, 10 long-tail FAQs, 15+ headings (H1-H4). Maximum keyword density without stuffing.",
  "claude-seo":
    "\n\n## WRITING MODE: Claude SEO (PRIMARY)\nPrioritize analytical depth: thesis-driven, evidence hierarchy, counter-arguments, data density (3+ stats with citations), comparison tables, step-by-step guides with WHY.",
};

/**
 * Fetch the master soul.md prompt (cached after first load)
 */
async function getMasterPrompt(): Promise<string> {
  if (cachedSoul) return cachedSoul;

  try {
    const res = await fetch("/soul.md");
    cachedSoul = await res.text();
    return cachedSoul;
  } catch {
    cachedSoul = "You are a pediatric content writer for childbloom.site.";
    return cachedSoul;
  }
}

interface PromptOptions {
  topic?: string;
  focusKeyword?: string;
  wordCount?: number;
  authorName?: string;
}

/**
 * Build the complete system prompt: master soul.md + format + mode + word count
 */
export async function buildSystemPrompt(
  mode: WritingMode,
  outputFormat: OutputFormat,
  wordCount: number = 2000,
  options: PromptOptions = {}
): Promise<string> {
  const master = await getMasterPrompt();

  // Remove the placeholder section from soul.md (it has task-specific stuff)
  const base = master.includes("## SOURCE ARTICLE")
    ? master.split("## SOURCE ARTICLE")[0].trim()
    : master.trim();

  // Build strict word count instruction
  const wordCountInstruction = `\n\n## STRICT WORD COUNT REQUIREMENT\nThe article MUST be between ${wordCount.toLocaleString()} and ${Math.round(wordCount * 1.1).toLocaleString()} words. Do NOT exceed this range. Write concisely and stay within this limit. Quality over quantity — every sentence must add value.`;

  return (
    base +
    FORMAT_INSTRUCTIONS[outputFormat] +
    MODE_INSTRUCTIONS[mode] +
    wordCountInstruction
  );
}

/**
 * Build user message with topic + keyword + author
 */
export function buildUserPrompt(options: {
  topic: string;
  focusKeyword: string;
  wordCount: number;
  authorName: string;
  sourceText?: string;
}): string {
  const { topic, focusKeyword, wordCount, authorName, sourceText } = options;

  if (sourceText) {
    // Rewrite mode
    return `## SOURCE ARTICLE (REWRITE THIS):

Topic: ${topic}
Focus Keyword: ${focusKeyword}
Target Word Count: ${wordCount.toLocaleString()} words
Target Author: ${authorName}

${sourceText}

---

Begin the rewritten article now. Output ONLY the final article — no meta-commentary, no "Here is the article", no internal outline.`;
  }

  // Generate from scratch mode
  return `Write a complete, original article on the following:

**Topic:** ${topic}
**Focus Keyword:** ${focusKeyword}
**Target Word Count:** Exactly ${wordCount.toLocaleString()} words (do not exceed ${Math.round(wordCount * 1.1).toLocaleString()} words)
**Author Name:** ${authorName}

**Requirements:**
- The focus keyword "${focusKeyword}" must appear in the first 100 words
- Include semantic variations of the keyword throughout
- Write EXACTLY ${wordCount.toLocaleString()} words — no more, no less
- Be concise and avoid unnecessary filler
- Use the specified output format (CMS-Ready HTML or Markdown)
- Author should be listed as "${authorName}" in the byline/frontmatter

Output ONLY the final article — no meta-commentary, no "Here is the article", no internal outline.`;
}

/**
 * Build continuation prompt for auto-continue when output is cut short
 */
export function buildContinuePrompt(previousContent: string): string {
  return `Continue writing the article from where it left off. The previous content ended mid-stream. Continue seamlessly from the last complete sentence.

PREVIOUS CONTENT (last 500 chars):
...${previousContent.slice(-500)}

Continue now:`;
}

/**
 * Check if the output appears incomplete (no conclusion or FAQs)
 */
export function isOutputIncomplete(text: string): boolean {
  const lower = text.toLowerCase();
  const hasConclusion =
    lower.includes("conclusion") ||
    lower.includes("## conclusion") ||
    lower.includes("<h2>conclusion");
  const hasFaqs =
    lower.includes("faq") ||
    lower.includes("frequently asked") ||
    lower.includes("## frequently");
  return !hasConclusion && !hasFaqs;
}
