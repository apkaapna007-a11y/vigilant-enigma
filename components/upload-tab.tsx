"use client";

import { useState, useRef } from "react";
import { ModeSelector } from "./mode-selector";
import { StreamingOutput } from "./streaming-output";
import { buildSystemPrompt, buildUserPrompt, type WritingMode, type OutputFormat } from "@/lib/prompts";
import { OpenAIClient } from "@/lib/openai-client";
import { Settings, RewriteProgress } from "@/lib/types";
import { getSettings, saveToHistory, generateId, countWords } from "@/lib/history";
import {
  Zap, AlertCircle, Copy, Download, RotateCcw, Sparkles,
  FileText, Hash, User, PenTool, Target, Loader2, RefreshCw
} from "lucide-react";

const WORD_COUNTS = [1500, 2000, 2500, 3000, 4000];

type GenerationMode = "generate" | "rewrite";

export function UploadTab() {
  // Form state
  const [topic, setTopic] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [wordCount, setWordCount] = useState(2000);
  const [authorName, setAuthorName] = useState("ChildBloom Editorial");
  const [mode, setMode] = useState<WritingMode>("contentforge");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("cms-html");
  const [genMode, setGenMode] = useState<GenerationMode>("generate");
  const [sourceText, setSourceText] = useState("");

  // UI state
  const [progress, setProgress] = useState<RewriteProgress>({
    status: "idle",
    progress: 0,
    currentText: "",
  });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isProcessing = ["parsing", "rewriting", "streaming"].includes(progress.status);
  const isComplete = progress.status === "complete";
  const canGenerate = topic.trim().length > 0 && focusKeyword.trim().length > 0
    && (genMode === "generate" || sourceText.trim().length > 0);

  /**
   * Truncate text to target word count, cutting at the last complete section
   * (heading or paragraph break) before the limit.
   */
  function truncateToWordCount(text: string, target: number): string {
    const maxWords = Math.round(target * 1.1); // Allow 10% over
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;

    // Find a good cut point — last heading or double newline before limit
    const cutPoint = maxWords;
    const beforeCut = words.slice(0, cutPoint).join(" ");

    // Try to cut at last heading
    const lastHeading = beforeCut.lastIndexOf("\n## ");
    const lastParaBreak = beforeCut.lastIndexOf("\n\n");

    // Use the later of the two cut points (closer to target)
    const cutAt = Math.max(lastHeading, lastParaBreak);
    if (cutAt > target * 0.5) {
      return beforeCut.slice(0, cutAt).trim() + "\n\n[Article truncated to target word count]";
    }

    // Fallback: cut at last sentence before limit
    const lastSentence = beforeCut.lastIndexOf(". ");
    if (lastSentence > target * 0.5) {
      return beforeCut.slice(0, lastSentence + 1).trim() + "\n\n[Article truncated to target word count]";
    }

    return beforeCut.trim() + "\n\n[Article truncated to target word count]";
  }

  async function generateArticle() {
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) {
      setError("Please set your API key in Settings first.");
      return;
    }

    if (!canGenerate) {
      setError(genMode === "rewrite"
        ? "Please enter a topic, focus keyword, and source article text."
        : "Please enter a topic and focus keyword.");
      return;
    }

    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build prompts (loads soul.md + format + mode)
      const systemPrompt = await buildSystemPrompt(mode, outputFormat, wordCount);

      // Build user prompt with topic + keyword + author + format
      const userPrompt = buildUserPrompt({
        topic,
        focusKeyword,
        wordCount,
        authorName,
        outputFormat,
        sourceText: genMode === "rewrite" ? sourceText : undefined,
      });

      // Call API
      setProgress({ status: "rewriting", progress: 10, currentText: "" });
      const client = new OpenAIClient(settings);

      let fullText = "";
      await client.streamRewrite(
        systemPrompt,
        userPrompt,
        {
          onToken: (token) => {
            fullText += token;
            const currentWords = countWords(fullText);
            const estimatedProgress = Math.min(95, 10 + (currentWords / wordCount) * 85);
            setProgress({
              status: "streaming",
              progress: estimatedProgress,
              currentText: fullText,
            });
          },
          onComplete: (text) => {
            fullText = text;
            setProgress({ status: "complete", progress: 100, currentText: text });
          },
          onError: (err) => {
            setError(err.message);
            setProgress({ status: "error", progress: 0, currentText: "", error: err.message });
          },
          onRetry: (attempt, max, reason) => {
            setError(`${reason} — Retrying (${attempt}/${max})...`);
          },
        },
        controller.signal
      );

      // Fix C: Truncate if output exceeds target by >15%
      const finalText = truncateToWordCount(fullText, wordCount);
      if (finalText !== fullText) {
        setProgress({ status: "complete", progress: 100, currentText: finalText });
      }

      // Save to history
      if (finalText) {
        saveToHistory({
          id: generateId(),
          fileName: `${topic.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.${outputFormat === "cms-html" ? "html" : "md"}`,
          originalText: genMode === "rewrite" ? sourceText.slice(0, 500) : `Topic: ${topic}\nKeyword: ${focusKeyword}`,
          rewrittenText: finalText,
          mode,
          outputFormat,
          wordCount: countWords(finalText),
          createdAt: new Date().toISOString(),
        });
      }

    } catch (err: any) {
      if (err.name !== "AbortError" && !err.message?.includes("cancelled")) {
        setError(err.message || "An unexpected error occurred.");
        setProgress({ status: "error", progress: 0, currentText: "", error: err.message });
      }
    }
  }

  function cancelRewrite() {
    abortRef.current?.abort();
    setProgress({ status: "idle", progress: 0, currentText: "" });
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(progress.currentText);
  }

  function downloadFile() {
    const ext = outputFormat === "cms-html" ? "html" : outputFormat === "chirpy" ? "md" : "md";
    const mimeType = outputFormat === "cms-html" ? "text/html" : "text/markdown";
    const blob = new Blob([progress.currentText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "article"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetForm() {
    setProgress({ status: "idle", progress: 0, currentText: "" });
    setError(null);
    setSourceText("");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Generation Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <RefreshCw size={14} className="text-amber-500" />
          Generation Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setGenMode("generate")}
            disabled={isProcessing}
            className={`px-4 py-3 rounded-lg text-sm transition-all ${
              genMode === "generate"
                ? "bg-amber-500 text-white shadow-md shadow-amber-200/40"
                : "bg-muted text-foreground hover:bg-muted/80 border border-border"
            }`}
          >
            <span className="block font-semibold">Generate from Scratch</span>
            <span className={`text-xs ${genMode === "generate" ? "text-amber-100" : "text-muted-foreground"}`}>
              Write a new article from topic + keyword
            </span>
          </button>
          <button
            onClick={() => setGenMode("rewrite")}
            disabled={isProcessing}
            className={`px-4 py-3 rounded-lg text-sm transition-all ${
              genMode === "rewrite"
                ? "bg-amber-500 text-white shadow-md shadow-amber-200/40"
                : "bg-muted text-foreground hover:bg-muted/80 border border-border"
            }`}
          >
            <span className="block font-semibold">Rewrite Existing Article</span>
            <span className={`text-xs ${genMode === "rewrite" ? "text-amber-100" : "text-muted-foreground"}`}>
              Paste an article to rewrite
            </span>
          </button>
        </div>
      </div>

      {/* Topic Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <PenTool size={14} className="text-amber-500" />
          Article Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Newborn Circumcision Care, Baby Sleep Training, Toddler Nutrition..."
          className="input"
          disabled={isProcessing}
        />
      </div>

      {/* Focus Keyword + Word Count */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Target size={14} className="text-amber-500" />
            Focus Keyword
          </label>
          <input
            type="text"
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            placeholder="e.g., newborn circumcision care"
            className="input"
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Hash size={14} className="text-amber-500" />
            Target Word Count: {wordCount.toLocaleString()}
          </label>
          <div className="flex gap-2">
            {WORD_COUNTS.map((wc) => (
              <button
                key={wc}
                onClick={() => setWordCount(wc)}
                disabled={isProcessing}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  wordCount === wc
                    ? "bg-amber-500 text-white shadow-md shadow-amber-200/40"
                    : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                }`}
              >
                {wc >= 1000 ? `${wc / 1000}K` : wc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Author Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <User size={14} className="text-amber-500" />
          Author Name
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="ChildBloom Editorial"
          className="input"
          disabled={isProcessing}
        />
      </div>

      {/* Source Text (only in rewrite mode) */}
      {genMode === "rewrite" && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-semibold flex items-center gap-2">
            <FileText size={14} className="text-amber-500" />
            Source Article to Rewrite
          </label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste the article you want to rewrite here..."
            className="input min-h-[200px] resize-y font-mono text-sm"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            {sourceText.trim() ? `${countWords(sourceText)} words pasted` : "Paste your article text above"}
          </p>
        </div>
      )}

      {/* Mode Selector */}
      <ModeSelector value={mode} onChange={setMode} />

      {/* Output Format */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          Output Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "cms-html" as const, label: "CMS-Ready HTML", desc: "WordPress-ready" },
            { id: "chirpy" as const, label: "Chirpy Jekyll", desc: "GitHub Pages" },
            { id: "clean-md" as const, label: "Clean Markdown", desc: "Universal" },
          ]).map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setOutputFormat(fmt.id)}
              disabled={isProcessing}
              className={`px-4 py-3 rounded-lg text-sm transition-all ${
                outputFormat === fmt.id
                  ? "bg-amber-500 text-white shadow-md shadow-amber-200/40"
                  : "bg-muted text-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              <span className="block font-semibold">{fmt.label}</span>
              <span className={`text-xs ${outputFormat === fmt.id ? "text-amber-100" : "text-muted-foreground"}`}>
                {fmt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isProcessing ? (
          <button onClick={cancelRewrite} className="btn-primary bg-red-500 hover:bg-red-600">
            Cancel Generation
          </button>
        ) : (
          <button
            onClick={generateArticle}
            disabled={!canGenerate}
            className="btn-primary animate-pulse-glow"
          >
            <Zap size={14} />
            {genMode === "rewrite" ? "Rewrite Article" : "Generate Article"}
          </button>
        )}
      </div>

      {/* Streaming Output */}
      <StreamingOutput
        content={progress.currentText}
        status={progress.status}
        progress={progress.progress}
      />

      {/* Post-complete Actions */}
      {isComplete && (
        <div className="flex flex-wrap gap-2 animate-slide-up">
          <button className="btn-secondary" onClick={copyToClipboard}>
            <Copy size={14} /> Copy
          </button>
          <button className="btn-secondary" onClick={downloadFile}>
            <Download size={14} /> Download {outputFormat === "cms-html" ? ".html" : ".md"}
          </button>
          <button className="btn-secondary" onClick={resetForm}>
            <RotateCcw size={14} /> New Article
          </button>
        </div>
      )}
    </div>
  );
}
