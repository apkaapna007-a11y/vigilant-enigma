"use client";

import { useState, useRef, useCallback } from "react";
import { ModeSelector } from "./mode-selector";
import { StreamingOutput } from "./streaming-output";
import { MultiTopicInput } from "./multi-topic-input";
import { MultiTopicProcessor } from "./multi-topic-processor";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildContinuePrompt,
  isOutputIncomplete,
  validateAndCleanOutput,
  type WritingMode,
  type OutputFormat,
} from "@/lib/prompts";
import { OpenAIClient } from "@/lib/openai-client";
import { Settings, RewriteProgress, Topic, TopicStatus } from "@/lib/types";
import { getSettings, saveToHistory, generateId, countWords } from "@/lib/history";
import { parseFile, validateFile } from "@/lib/file-parser";
import {
  Zap, AlertCircle, Copy, Download, RotateCcw, Sparkles,
  FileText, Hash, User, PenTool, Target, RefreshCw,
  Upload, X, CheckCircle2, AlertTriangle, Layers
} from "lucide-react";

const WORD_COUNTS = [1500, 2000, 2500, 3000, 4000];
type GenerationMode = "generate" | "rewrite";
type WorkflowMode = "single" | "multi";

export function UploadTab() {
  // Workflow mode toggle
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("single");

  // Single-topic state (existing)
  const [topic, setTopic] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [wordCount, setWordCount] = useState(2000);
  const [authorName, setAuthorName] = useState("ChildBloom Editorial");
  const [mode, setMode] = useState<WritingMode>("contentforge");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("cms-html");
  const [genMode, setGenMode] = useState<GenerationMode>("generate");
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const [progress, setProgress] = useState<RewriteProgress>({
    status: "idle",
    progress: 0,
    currentText: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-topic state
  const [topics, setTopics] = useState<Topic[]>([]);

  const isProcessing = ["parsing", "rewriting", "streaming"].includes(progress.status);
  const isComplete = progress.status === "complete";
  const canGenerate =
    topic.trim().length > 0 &&
    focusKeyword.trim().length > 0 &&
    (genMode === "generate" || sourceText.trim().length > 50);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setProgress({ status: "parsing", progress: 5, currentText: "" });
    try {
      const parsed = await parseFile(file);
      setSourceText(parsed.text);
      setFileName(parsed.fileName);
      setGenMode("rewrite");
      if (!topic.trim()) {
        const suggested = parsed.fileName
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        if (suggested) setTopic(suggested);
      }
      setProgress({ status: "idle", progress: 0, currentText: "" });
    } catch (err: any) {
      setError(err.message || "Failed to parse file");
      setProgress({ status: "error", progress: 0, currentText: "", error: err.message });
    }
  }, [topic]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  // Single-topic generation
  async function generateArticle() {
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) {
      setError("Please set your API key in Settings first.");
      return;
    }

    if (!canGenerate) {
      setError(
        genMode === "rewrite"
          ? "Please enter a topic, focus keyword, and source article text (or upload a file)."
          : "Please enter a topic and focus keyword."
      );
      return;
    }

    setError(null);
    setWarnings([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const systemPrompt = await buildSystemPrompt(mode, outputFormat, wordCount);
      const userPrompt = buildUserPrompt({
        topic: topic.trim(),
        focusKeyword: focusKeyword.trim(),
        wordCount,
        authorName: authorName.trim() || "ChildBloom Editorial",
        outputFormat,
        sourceText: genMode === "rewrite" ? sourceText : undefined,
      });

      setProgress({ status: "rewriting", progress: 8, currentText: "" });
      const client = new OpenAIClient(settings);

      let fullText = "";
      await client.streamRewrite(
        systemPrompt,
        userPrompt,
        {
          onToken: (token) => {
            fullText += token;
            const currentWords = countWords(fullText);
            const estimatedProgress = Math.min(92, 8 + (currentWords / wordCount) * 84);
            setProgress({
              status: "streaming",
              progress: estimatedProgress,
              currentText: fullText,
            });
          },
          onComplete: (text) => {
            fullText = text;
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

      if (isOutputIncomplete(fullText) && !controller.signal.aborted) {
        setProgress({ status: "streaming", progress: 93, currentText: fullText });
        const continuePrompt = buildContinuePrompt(fullText);
        let continued = "";
        try {
          await client.streamRewrite(
            systemPrompt,
            continuePrompt,
            {
              onToken: (token) => {
                continued += token;
                setProgress({
                  status: "streaming",
                  progress: 95,
                  currentText: fullText + continued,
                });
              },
              onComplete: (text) => {
                continued = text;
              },
              onError: () => {},
            },
            controller.signal
          );
          fullText = fullText + continued;
        } catch {
          // keep partial
        }
      }

      const validation = validateAndCleanOutput(
        fullText,
        outputFormat,
        topic.trim(),
        focusKeyword.trim()
      );
      const finalText = validation.cleanedText;
      setWarnings(validation.warnings);

      setProgress({ status: "complete", progress: 100, currentText: finalText });

      if (finalText) {
        saveToHistory({
          id: generateId(),
          fileName: `${topic.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 60)}.${outputFormat === "cms-html" ? "html" : "md"}`,
          originalText:
            genMode === "rewrite"
              ? sourceText.slice(0, 800)
              : `Topic: ${topic}\nKeyword: ${focusKeyword}`,
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
    setError(null);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(progress.currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadFile() {
    const ext = outputFormat === "cms-html" ? "html" : "md";
    const mime = outputFormat === "cms-html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8";
    const blob = new Blob([progress.currentText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rewritten_${topic.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 60)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetForm() {
    setTopic("");
    setFocusKeyword("");
    setSourceText("");
    setFileName(null);
    setGenMode("generate");
    setProgress({ status: "idle", progress: 0, currentText: "" });
    setError(null);
    setWarnings([]);
  }

  // Render single-topic workflow
  const singleTopicView = (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <PenTool size={14} className="text-amber-500" />
          Article Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Newborn Circumcision Care, Baby Sleep Training..."
          className="input"
          disabled={isProcessing}
          maxLength={200}
        />
      </div>

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
            maxLength={100}
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
          maxLength={80}
        />
      </div>

      {genMode === "rewrite" && (
        <div className="space-y-3 animate-fade-in">
          <label className="text-sm font-semibold flex items-center gap-2">
            <FileText size={14} className="text-amber-500" />
            Source Article
          </label>

          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-amber-400/60 transition-colors cursor-pointer bg-card/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={22} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop file or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              .txt · .md · .docx · .pdf · .html (max 10 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,.pdf,.html,.htm"
              className="hidden"
              onChange={onFileSelect}
              disabled={isProcessing}
            />
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm bg-muted/60 rounded-lg px-3 py-2">
              <FileText size={14} className="text-amber-600" />
              <span className="truncate flex-1">{fileName}</span>
              <button
                onClick={() => {
                  setFileName(null);
                  setSourceText("");
                }}
                className="p-1 hover:bg-background rounded"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Or paste the article text here..."
            className="input min-h-[180px] resize-y font-mono text-sm"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            {sourceText.trim()
              ? `${countWords(sourceText).toLocaleString()} words`
              : "Paste or upload source text"}
          </p>
        </div>
      )}

      <ModeSelector value={mode} onChange={setMode} />

      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          Output Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "cms-html" as const, label: "CMS-Ready HTML", desc: "WordPress-ready" },
              { id: "chirpy" as const, label: "Chirpy Jekyll", desc: "GitHub Pages" },
              { id: "clean-md" as const, label: "Clean Markdown", desc: "Universal" },
            ] as const
          ).map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setOutputFormat(fmt.id)}
              disabled={isProcessing}
              className={`px-3 py-3 rounded-lg text-sm transition-all ${
                outputFormat === fmt.id
                  ? "bg-amber-500 text-white shadow-md shadow-amber-200/40"
                  : "bg-muted text-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              <span className="block font-semibold text-xs sm:text-sm">{fmt.label}</span>
              <span
                className={`text-[11px] ${
                  outputFormat === fmt.id ? "text-amber-100" : "text-muted-foreground"
                }`}
              >
                {fmt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && isComplete && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">Validation notes</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isProcessing ? (
          <button onClick={cancelRewrite} className="btn-primary bg-red-500 hover:bg-red-600">
            Cancel
          </button>
        ) : (
          <button
            onClick={generateArticle}
            disabled={!canGenerate}
            className="btn-primary animate-pulse-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={14} />
            {genMode === "rewrite" ? "Rewrite Article" : "Generate Article"}
          </button>
        )}
      </div>

      <StreamingOutput
        content={progress.currentText}
        status={progress.status}
        progress={progress.progress}
        outputFormat={outputFormat}
      />

      {isComplete && (
        <div className="flex flex-wrap gap-2 animate-slide-up">
          <button className="btn-secondary" onClick={copyToClipboard}>
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn-secondary" onClick={downloadFile}>
            <Download size={14} /> Download .{outputFormat === "cms-html" ? "html" : "md"}
          </button>
          <button className="btn-secondary" onClick={resetForm}>
            <RotateCcw size={14} /> New Article
          </button>
        </div>
      )}
    </div>
  );

  // Render multi-topic workflow
  const multiTopicView = (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Global Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            maxLength={80}
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

      <ModeSelector value={mode} onChange={setMode} />

      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          Output Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "cms-html" as const, label: "CMS-Ready HTML", desc: "WordPress-ready" },
              { id: "chirpy" as const, label: "Chirpy Jekyll", desc: "GitHub Pages" },
              { id: "clean-md" as const, label: "Clean Markdown", desc: "Universal" },
            ] as const
          ).map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setOutputFormat(fmt.id)}
              className={`px-3 py-3 rounded-lg text-sm transition-all ${
                outputFormat === fmt.id
                  ? "bg-amber-500 text-white shadow-md shadow-amber-200/40"
                  : "bg-muted text-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              <span className="block font-semibold text-xs sm:text-sm">{fmt.label}</span>
              <span
                className={`text-[11px] ${
                  outputFormat === fmt.id ? "text-amber-100" : "text-muted-foreground"
                }`}
              >
                {fmt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Topic Input */}
      <MultiTopicInput topics={topics} onTopicsChange={setTopics} />

      {/* Multi-Topic Processor */}
      {topics.length > 0 && (
        <MultiTopicProcessor
          topics={topics}
          onTopicsUpdate={setTopics}
          mode={mode}
          outputFormat={outputFormat}
          wordCount={wordCount}
          authorName={authorName}
          genMode={genMode}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Workflow Mode Toggle */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-1">
          <button
            onClick={() => setWorkflowMode("single")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              workflowMode === "single"
                ? "bg-amber-500 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={14} />
            Single Article
          </button>
          <button
            onClick={() => setWorkflowMode("multi")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              workflowMode === "multi"
                ? "bg-amber-500 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers size={14} />
            Batch Process
          </button>
        </div>
      </div>

      {/* Content based on workflow mode */}
      {workflowMode === "single" ? singleTopicView : multiTopicView}
    </div>
  );
}
