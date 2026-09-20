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
  FileText, Hash, User, PenTool, Target, Loader2
} from "lucide-react";

const WORD_COUNTS = [1500, 2000, 2500, 3000, 4000];

export function UploadTab() {
  // Form state
  const [topic, setTopic] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [wordCount, setWordCount] = useState(2000);
  const [authorName, setAuthorName] = useState("ChildBloom Editorial");
  const [mode, setMode] = useState<WritingMode>("contentforge");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("cms-html");

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
  const canGenerate = topic.trim().length > 0 && focusKeyword.trim().length > 0;

  async function generateArticle() {
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) {
      setError("Please set your API key in Settings first.");
      return;
    }

    if (!canGenerate) {
      setError("Please enter a topic and focus keyword.");
      return;
    }

    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build prompts (loads soul.md + format + mode)
      const systemPrompt = await buildSystemPrompt(mode, outputFormat, wordCount);

      // Build user prompt with topic + keyword + author
      const userPrompt = buildUserPrompt({
        topic,
        focusKeyword,
        wordCount,
        authorName,
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
          onRetry: (attempt, max) => {
            setError(`Rate limited. Retrying (${attempt}/${max})...`);
          },
        },
        controller.signal
      );

      // Save to history
      if (fullText) {
        saveToHistory({
          id: generateId(),
          fileName: `${topic.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.${outputFormat === "cms-html" ? "html" : "md"}`,
          originalText: `Topic: ${topic}\nKeyword: ${focusKeyword}`,
          rewrittenText: fullText,
          mode,
          outputFormat,
          wordCount: countWords(fullText),
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
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
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
            Generate Article
          </button>
        )}
      </div>

      {/* Streaming Output */}
      <StreamingOutput
        content={progress.currentText}
        status={progress.status}
        progress={progress.progress}
      />

      {/* Post-complete actions */}
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
