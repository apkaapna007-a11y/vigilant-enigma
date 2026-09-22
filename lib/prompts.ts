// Prompt system — strict hierarchy: soul.md (medical + identity) > mode rules > format rules
// Edit /public/soul.md to change the master system prompt (no code changes needed)

export type WritingMode = "contentforge" | "claude-seo";
export type OutputFormat = "cms-html" | "chirpy" | "clean-md";

let cachedSoul: string | null = null;

const REQUIRED_SECTIONS = [
  "IDENTITY",
  "STRUCTURE",
  "VOICE",
  "HUMANIZATION",
  "SEO",
  "MEDICAL",
];

export function validateSoul(content: string): { valid: boolean; missing: string[] } {
  const upper = content.toUpperCase();
  const missing = REQUIRED_SECTIONS.filter((section) => !upper.includes(section));
  return { valid: missing.length === 0, missing };
}

const HIERARCHY_HEADER = `
## STRICT PRIORITY HIERARCHY (NEVER VIOLATE)

You MUST obey this order. Higher priority always wins.

1. MEDICAL ACCURACY & SAFETY — never invent stats, studies, quotes, or medical advice. Use only real institutional sources or calibrated caveats. Always include safety disclaimers where relevant.
2. TOPIC, FACTS, INTENT PRESERVATION — stay strictly on the given topic and source material. Do not introduce unrelated pediatric topics, generic parenting advice, or cross-topic sections.
3. NO HALLUCINATIONS / NO ARTIFACTS — never invent numbers, years, study names, or quotes. Never output code fences, meta-commentary, internal outlines, or AI self-references.
4. WRITING MODE rules (ContentForge or Claude SEO) — apply only after the above three are satisfied.
5. OUTPUT FORMAT rules — apply last. Format must be clean and WordPress-compatible.

If any lower rule conflicts with a higher one, discard the lower rule.
`;

const PRESERVATION_RULES = `
## TOPIC & FACT PRESERVATION (NON-NEGOTIABLE)

- The article topic, core facts, medical claims, and original intent MUST be preserved exactly.
- Do not expand into adjacent topics (e.g. do not turn a sleep article into a nutrition or developmental-milestones article).
- Do not invent new statistics, study names, years, or expert quotes.
- If the source lacks a citation, use a calibrated caveat ("research is mixed", "current guidance suggests") rather than fabricating one.
- Remove any visible AI artifacts, code fences, placeholder text, or self-referential language.
- No duplicate sections. No repeated paragraphs. No filler that restates the same point.
`;

const FORMAT_INSTRUCTIONS: Record<OutputFormat, string> = {
  "cms-html": `
## OUTPUT FORMAT: CMS-Ready HTML (WordPress compatible)

Output ONLY clean, semantic HTML. No YAML. No code fences. No markdown.

Required structure:
<article class="cb-article">
  <header>
    <h1>...</h1>
    <p class="cb-excerpt">...</p>
    <div class="cb-meta">Published: <time datetime="YYYY-MM-DD">...</time> | Author: ...</div>
  </header>
  <nav class="cb-toc" aria-label="Table of Contents">...</nav>
  <section id="...">...</section>
  ...
  <section id="conclusion">...</section>
  <section id="faqs"> (only if they add new value)
    <details><summary>...</summary><p>...</p></details>
  </section>
</article>

Rules:
- All headings get unique id attributes
- Tables must use <thead> and <tbody>
- FAQs use <details>/<summary>
- <strong> only on first mention of key terms
- No inline styles
- No script/style tags
- Meta description (cb-excerpt) 120-160 characters
- Ready for direct paste into WordPress Gutenberg / classic editor
`,
  chirpy: `
## OUTPUT FORMAT: Chirpy Jekyll Markdown

Output ONLY standard markdown with YAML frontmatter at the very top. No HTML tags. No code fences wrapping the whole article.

Frontmatter must be:
---
title: "Exact title"
description: "One sentence summary (120-160 chars)"
author: [AUTHOR_NAME]
date: YYYY-MM-DD HH:MM:SS +0000
categories: [Parenting]
tags: [relevant, tags]
toc: true
---

Then pure markdown body. Use ## / ### headings, **bold**, *italic*, tables, numbered lists. No HTML.
`,
  "clean-md": `
## OUTPUT FORMAT: Clean Markdown

Output ONLY pure markdown. No YAML frontmatter. No HTML tags. No code fences.

Use ## / ### headings, **bold**, *italic*, tables, lists. Start directly with the H1 title.
`,
};

const MODE_INSTRUCTIONS: Record<WritingMode, string> = {
  contentforge: `
## WRITING MODE: ContentForge SEO

After medical safety and topic preservation are satisfied:
- Place exact-match focus keyword in the first 100 words
- Use semantic variations and LSI keywords naturally
- Target distinct query variants in H2 headings
- Prefer 8-12 high-value FAQs only if they answer new questions
- Structure for extractability (front-loaded answers)
- Never keyword-stuff or force density that harms readability
`,
  "claude-seo": `
## WRITING MODE: Claude SEO (analytical depth)

After medical safety and topic preservation are satisfied:
- Thesis-driven structure
- Evidence hierarchy with real citations only
- Address 1-2 real counter-arguments
- Prefer comparison tables or step-by-step guides when they genuinely help
- Data density only with attributable sources
- Never invent statistics to increase "depth"
`,
};

async function getMasterPrompt(): Promise<string> {
  if (cachedSoul) return cachedSoul;

  try {
    const res = await fetch("/soul.md");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();

    const check = validateSoul(text);
    if (!check.valid) {
      throw new Error(
        "soul.md is missing required sections: " +
          check.missing.join(", ") +
          ". The file may be corrupted or incomplete."
      );
    }

    cachedSoul = text;
    return cachedSoul;
  } catch (err: any) {
    if (err.message?.includes("missing required sections")) throw err;
    cachedSoul =
      "You are a senior pediatric content strategist for childbloom.site. " +
      "Always prioritize medical accuracy, never invent sources, and stay strictly on the given topic. " +
      "Include safety disclaimers. Output only the final article.";
    return cachedSoul;
  }
}

export async function buildSystemPrompt(
  mode: WritingMode,
  outputFormat: OutputFormat,
  wordCount: number = 2000,
  _options: { topic?: string; focusKeyword?: string; authorName?: string } = {}
): Promise<string> {
  const master = await getMasterPrompt();

  const base = master.includes("## SOURCE ARTICLE")
    ? master.split("## SOURCE ARTICLE")[0].trim()
    : master.includes("## TASK INSTRUCTIONS")
      ? master.split("## TASK INSTRUCTIONS")[0].trim()
      : master.trim();

  const wordCountInstruction =
    "\n\n## WORD COUNT TARGET\n" +
    "Aim for approximately " +
    wordCount.toLocaleString() +
    " words (±15%).\n" +
    "Quality and medical accuracy outrank hitting an exact number.\n" +
    "Never pad with filler or duplicate content to reach a count.\n" +
    "Never truncate mid-sentence or leave incomplete sections.\n";

  return (
    base +
    "\n\n" +
    HIERARCHY_HEADER +
    PRESERVATION_RULES +
    MODE_INSTRUCTIONS[mode] +
    FORMAT_INSTRUCTIONS[outputFormat] +
    wordCountInstruction
  );
}

export function buildUserPrompt(options: {
  topic: string;
  focusKeyword: string;
  wordCount: number;
  authorName: string;
  outputFormat: OutputFormat;
  sourceText?: string;
}): string {
  const { topic, focusKeyword, wordCount, authorName, outputFormat, sourceText } = options;

  const formatReminder =
    outputFormat === "cms-html"
      ? "\n\nFINAL REMINDER: Output CMS-Ready HTML only. No YAML. No code fences. No meta-commentary."
      : outputFormat === "chirpy"
        ? "\n\nFINAL REMINDER: Output Chirpy Markdown with YAML frontmatter only. No HTML. No code fences."
        : "\n\nFINAL REMINDER: Output Clean Markdown only. No YAML. No HTML. No code fences.";

  const commonRules =
    "\nSTRICT RULES FOR THIS REQUEST:\n" +
    '- Stay exclusively on the topic: "' +
    topic +
    '"\n' +
    '- Focus keyword: "' +
    focusKeyword +
    '" must appear naturally in the first 100 words\n' +
    '- Author byline: "' +
    authorName +
    '"\n' +
    "- Target ~" +
    wordCount.toLocaleString() +
    " words\n" +
    "- Never invent statistics, study names, years, or quotes\n" +
    "- Never add unrelated sections or topics\n" +
    "- Never output code fences, outlines, or explanations outside the article\n" +
    "- Medical safety first. If unsure about a claim, use a calibrated caveat.\n";

  if (sourceText) {
    return (
      "## SOURCE ARTICLE TO REWRITE (preserve topic, facts, and medical intent)\n\n" +
      "Topic: " +
      topic +
      "\nFocus Keyword: " +
      focusKeyword +
      "\nTarget Author: " +
      authorName +
      "\nTarget Length: ~" +
      wordCount.toLocaleString() +
      " words\n\nSOURCE TEXT:\n" +
      sourceText +
      "\n\n---\n" +
      commonRules +
      "Rewrite the source from scratch according to the system hierarchy.\n" +
      "Preserve every factual medical claim and the original intent.\n" +
      "Expand depth and structure, but do not change the core topic or invent new medical facts.\n" +
      "Output ONLY the final article." +
      formatReminder
    );
  }

  return (
    "Write a complete original article on the following topic only.\n\n" +
    "**Topic:** " +
    topic +
    "\n**Focus Keyword:** " +
    focusKeyword +
    "\n**Author:** " +
    authorName +
    "\n**Target Length:** ~" +
    wordCount.toLocaleString() +
    " words\n\n" +
    commonRules +
    "Output ONLY the final article." +
    formatReminder
  );
}

export function buildContinuePrompt(previousContent: string): string {
  return (
    "Continue the article seamlessly from where it stopped.\n" +
    "Do not repeat previous content. Do not add meta-commentary.\n" +
    "Stay on the same topic and medical safety rules.\n\n" +
    "LAST 400 CHARACTERS:\n..." +
    previousContent.slice(-400) +
    "\n\nContinue now:"
  );
}

export function isOutputIncomplete(text: string): boolean {
  const lower = text.toLowerCase();
  const hasConclusion =
    lower.includes("conclusion") ||
    lower.includes("## conclusion") ||
    (lower.includes("<h2") && lower.includes("conclusion"));
  const hasFaqs =
    lower.includes("faq") ||
    lower.includes("frequently asked") ||
    lower.includes("## frequently");
  return text.length > 800 && !hasConclusion && !hasFaqs;
}

export interface ValidationResult {
  ok: boolean;
  warnings: string[];
  cleanedText: string;
}

export function validateAndCleanOutput(
  text: string,
  outputFormat: OutputFormat,
  topic: string,
  focusKeyword: string
): ValidationResult {
  const warnings: string[] = [];
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:html|markdown|md|yaml)?\n?/i, "").replace(/\n?```$/i, "");
    warnings.push("Removed surrounding code fences");
  }

  const metaPatterns = [
    /^(here is the (rewritten )?article[:\s]*)/i,
    /^(sure[,!]?\s*)/i,
    /^(of course[,!]?\s*)/i,
    /^(i'?ve rewritten[:\s]*)/i,
    /^(below is the article[:\s]*)/i,
  ];
  for (const p of metaPatterns) {
    if (p.test(cleaned)) {
      cleaned = cleaned.replace(p, "").trim();
      warnings.push("Removed meta-commentary prefix");
    }
  }

  if (outputFormat === "cms-html") {
    if (!cleaned.includes("<article") && !cleaned.includes("<h1")) {
      warnings.push("Output may not be valid CMS HTML (missing <article> or <h1>)");
    }
    if (cleaned.startsWith("---")) {
      const end = cleaned.indexOf("---", 3);
      if (end > 0) {
        cleaned = cleaned.slice(end + 3).trim();
        warnings.push("Removed unexpected YAML frontmatter from HTML output");
      }
    }
  }

  if (outputFormat === "chirpy" && !cleaned.startsWith("---")) {
    warnings.push("Chirpy output is missing YAML frontmatter");
  }

  const firstChunk = cleaned.slice(0, 600).toLowerCase();
  if (focusKeyword && !firstChunk.includes(focusKeyword.toLowerCase().slice(0, 20))) {
    warnings.push('Focus keyword "' + focusKeyword + '" may be missing from the opening');
  }

  const topicTokens = topic.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
  const bodyLower = cleaned.toLowerCase();
  const matched = topicTokens.filter((t) => bodyLower.includes(t)).length;
  if (topicTokens.length > 0 && matched / topicTokens.length < 0.4) {
    warnings.push("Possible topic drift detected — review carefully");
  }

  const artifactPatterns = [
    /as an ai language model/i,
    /i hope this helps/i,
    /let me know if you (need|want)/i,
    /\[insert (source|citation|link)\]/i,
    /\[your (name|credentials)\]/i,
  ];
  for (const p of artifactPatterns) {
    if (p.test(cleaned)) {
      cleaned = cleaned.replace(p, "");
      warnings.push("Removed residual AI artifact phrase");
    }
  }

  cleaned = cleaned.trim();

  return {
    ok:
      warnings.length === 0 ||
      warnings.every((w) => !w.includes("topic drift") && !w.includes("missing")),
    warnings,
    cleanedText: cleaned,
  };
}
