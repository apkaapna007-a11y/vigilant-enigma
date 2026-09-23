"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Topic, WritingMode, OutputFormat, Settings, PRIORITY_COLORS, CATEGORY_LABELS } from "@/lib/types";
import { OpenAIClient } from "@/lib/openai-client";
import { buildSystemPrompt, buildUserPrompt, buildContinuePrompt, isOutputIncomplete, validateAndCleanOutput } from "@/lib/prompts";
import { getSettings, saveToHistory, generateId, countWords } from "@/lib/history";
import {
  AlertTriangle, Check, CheckCircle2, Copy, Download, Loader, Pause, Play,
  RotateCcw, X, Zap, Package, Flag, BarChart3, ArrowUpDown
} from "lucide-react";

interface MultiTopicProcessorProps {
  topics: Topic[];
  onTopicsUpdate: React.Dispatch<React.SetStateAction<Topic[]>>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  mode: WritingMode;
  outputFormat: OutputFormat;
  wordCount: number;
  authorName: string;
  genMode: "generate" | "rewrite";
}

const MAX_CONCURRENT = 3;

export function MultiTopicProcessor({ topics, onTopicsUpdate, selectedIds, onSelectionChange, mode, outputFormat, wordCount, authorName, genMode }: MultiTopicProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "priority" | "category">("default");
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  const updateTopic = useCallback((id: string, updates: Partial<Topic>) => {
    onTopicsUpdate((current) => current.map((topic) => topic.id === id ? { ...topic, ...updates } : topic));
  }, [onTopicsUpdate]);

  const processSingleTopic = useCallback(async (topic: Topic, controller: AbortController) => {
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) throw new Error("API key not configured");
    if (!topic.title.trim() || !topic.focusKeyword.trim()) throw new Error("Topic title and focus keyword are required");
    if (genMode === "rewrite" && !topic.sourceText?.trim()) throw new Error("A source file is required in rewrite mode");

    const topicStart = Date.now();
    updateTopic(topic.id, { status: "processing", progress: 3, error: undefined, result: undefined });
    try {
      const systemPrompt = await buildSystemPrompt(mode, outputFormat, wordCount);
      const userPrompt = buildUserPrompt({ topic: topic.title.trim(), focusKeyword: topic.focusKeyword.trim(), wordCount, authorName: authorName.trim() || "ChildBloom Editorial", outputFormat, sourceText: genMode === "rewrite" ? topic.sourceText : undefined });
      const client = new OpenAIClient(settings);
      let fullText = "";
      await client.streamRewrite(systemPrompt, userPrompt, {
        onToken: (token) => {
          fullText += token;
          updateTopic(topic.id, { progress: Math.min(91, 5 + (countWords(fullText) / wordCount) * 86), result: fullText });
        },
        onComplete: (text) => { fullText = text; },
        onError: () => undefined,
      }, controller.signal);

      if (isOutputIncomplete(fullText) && !controller.signal.aborted) {
        updateTopic(topic.id, { progress: 93 });
        let continued = "";
        try {
          await client.streamRewrite(systemPrompt, buildContinuePrompt(fullText), {
            onToken: (token) => { continued += token; updateTopic(topic.id, { result: fullText + continued, progress: 96 }); },
            onComplete: (text) => { continued = text; },
            onError: () => undefined,
          }, controller.signal);
          fullText += continued;
        } catch { /* keep first response */ }
      }

      const finalText = validateAndCleanOutput(fullText, outputFormat, topic.title.trim(), topic.focusKeyword.trim()).cleanedText;
      const processingTimeMs = Date.now() - topicStart;
      updateTopic(topic.id, {
        status: "completed", progress: 100, result: finalText,
        wordCount: countWords(finalText), completedAt: new Date().toISOString(),
        error: undefined, processingTimeMs,
      });
      if (finalText) {
        saveToHistory({
          id: generateId(),
          fileName: `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 60)}.${outputFormat === "cms-html" ? "html" : "md"}`,
          originalText: genMode === "rewrite" ? (topic.sourceText || "").slice(0, 800) : `Topic: ${topic.title}\nKeyword: ${topic.focusKeyword}`,
          rewrittenText: finalText, mode, outputFormat, wordCount: countWords(finalText),
          createdAt: new Date().toISOString(),
          topicCategory: topic.category,
          processingTimeMs,
        });
      }
    } catch (err) {
      const error = err as Error;
      if (!controller.signal.aborted && !error.message?.toLowerCase().includes("cancelled")) {
        updateTopic(topic.id, { status: "failed", progress: 0, error: error.message || "Processing failed" });
      }
    }
  }, [authorName, genMode, mode, onTopicsUpdate, outputFormat, updateTopic, wordCount]);

  const processTopics = useCallback(async (topicIds: string[]) => {
    if (!topicIds.length || isProcessing) return;
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) { alert("Please set your API key in Settings first."); return; }
    setIsProcessing(true); setIsPaused(false); pausedRef.current = false;
    startTimeRef.current = Date.now();
    const controller = new AbortController(); abortRef.current = controller;

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const sortedIds = [...topicIds].sort((a, b) => {
      const topicA = topics.find(t => t.id === a);
      const topicB = topics.find(t => t.id === b);
      return (priorityOrder[topicA?.priority || "normal"] || 2) - (priorityOrder[topicB?.priority || "normal"] || 2);
    });

    let cursor = 0;
    const worker = async () => {
      while (!controller.signal.aborted) {
        while (pausedRef.current && !controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, 120));
        const id = sortedIds[cursor++];
        if (!id) return;
        const topic = topics.find((item) => item.id === id);
        if (topic && (topic.status === "pending" || topic.status === "failed")) {
          try {
            await processSingleTopic(topic, controller);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Processing failed";
            updateTopic(id, { status: "failed", progress: 0, error: message });
          }
        }
      }
    };
    try { await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, topicIds.length) }, worker)); }
    finally { setIsProcessing(false); setIsPaused(false); pausedRef.current = false; abortRef.current = null; }
  }, [isProcessing, processSingleTopic, topics]);

  // Batch export as ZIP
  const exportAllAsZip = async () => {
    const completedTopics = topics.filter(t => t.status === "completed" && t.result);
    if (completedTopics.length === 0) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const ext = outputFormat === "cms-html" ? "html" : "md";

    completedTopics.forEach((topic, i) => {
      const filename = `${String(i + 1).padStart(2, "0")}_${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 50)}.${ext}`;
      zip.file(filename, topic.result || "");
    });

    // Add summary
    const summary = completedTopics.map((t, i) =>
      `${i + 1}. ${t.title} | ${t.wordCount || 0} words | ${CATEGORY_LABELS[t.category || "general"]}`
    ).join("\n");
    zip.file("_summary.txt", `Batch Export Summary\nGenerated: ${new Date().toLocaleString()}\nTotal articles: ${completedTopics.length}\nTotal words: ${completedTopics.reduce((s, t) => s + (t.wordCount || 0), 0)}\n\n${summary}`);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `childbloom_batch_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all as individual files
  const downloadAll = () => {
    const completedTopics = topics.filter(t => t.status === "completed" && t.result);
    const ext = outputFormat === "cms-html" ? "html" : "md";
    const mime = outputFormat === "cms-html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8";

    completedTopics.forEach((topic) => {
      const blob = new Blob([topic.result || ""], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 50)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const pendingIds = topics.filter((topic) => topic.status === "pending").map((topic) => topic.id);
  const selectedProcessable = topics.filter((topic) => selectedIds.has(topic.id) && (topic.status === "pending" || topic.status === "failed")).map((topic) => topic.id);
  const completedTopics = topics.filter((topic) => topic.status === "completed");
  const failedTopics = topics.filter((topic) => topic.status === "failed");
  const processingTopics = topics.filter((topic) => topic.status === "processing");
  const pendingTopics = topics.filter((topic) => topic.status === "pending");
  const completed = completedTopics.length;
  const total = topics.length;
  const totalWords = completedTopics.reduce((sum, t) => sum + (t.wordCount || 0), 0);

  const resetAndProcess = (ids: string[]) => {
    onTopicsUpdate((current) => current.map((topic) => ids.includes(topic.id) ? { ...topic, status: "pending", progress: 0, error: undefined, result: undefined } : topic));
    void processTopics(ids);
  };
  const copyResult = async (id: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); } catch { /* */ } };
  const downloadResult = (topic: Topic) => { if (!topic.result) return; const ext = outputFormat === "cms-html" ? "html" : "md"; const blob = new Blob([topic.result], { type: outputFormat === "cms-html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.${ext}`; anchor.click(); URL.revokeObjectURL(url); };

  return (
    <section className="space-y-4" aria-label="Batch processing">
      {/* Stats Bar */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-5">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{completed}/{total}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{processingTopics.length}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-600">{pendingTopics.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            {failedTopics.length > 0 && (
              <div>
                <p className="text-2xl font-bold text-red-600">{failedTopics.length}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            )}
            {completed > 0 && (
              <div>
                <p className="text-2xl font-bold text-amber-600">{totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}K` : totalWords}</p>
                <p className="text-xs text-muted-foreground">Total Words</p>
              </div>
            )}
          </div>
          <div className="min-w-[180px] flex-1 max-w-sm">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${total ? (completed / total) * 100 : 0}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--glow-amber)))",
                }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {total ? Math.round((completed / total) * 100) : 0}% complete
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isProcessing ? <>
          <button type="button" onClick={() => void processTopics(pendingIds)} disabled={!pendingIds.length} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            <Zap size={14} /> Process All{pendingIds.length ? ` (${pendingIds.length})` : ""}
          </button>
          <button type="button" onClick={() => resetAndProcess(selectedProcessable)} disabled={!selectedProcessable.length} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Zap size={14} /> Process Selected{selectedProcessable.length ? ` (${selectedProcessable.length})` : ""}
          </button>
          {failedTopics.length > 0 && (
            <button type="button" onClick={() => resetAndProcess(failedTopics.map(t => t.id))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50 transition-colors">
              <RotateCcw size={14} /> Retry all failed ({failedTopics.length})
            </button>
          )}
          {completedTopics.length > 0 && (
            <>
              <button type="button" onClick={exportAllAsZip} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors ml-auto">
                <Package size={14} /> Export ZIP
              </button>
              <button type="button" onClick={downloadAll} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                <Download size={14} /> Download All
              </button>
            </>
          )}
        </> : <>
          <button type="button" onClick={() => setIsPaused((value) => !value)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
            {isPaused ? <Play size={14} /> : <Pause size={14} />}{isPaused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            <X size={14} /> Cancel
          </button>
        </>}
        <button type="button" onClick={() => onSelectionChange(selectedIds.size === topics.length ? new Set() : new Set(topics.map((topic) => topic.id)))} disabled={!topics.length || isProcessing} className="ml-auto px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
          {selectedIds.size === topics.length ? "Clear selection" : "Select all"}
        </button>
      </div>

      {/* Processing Queue */}
      {processingTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Loader size={16} className="animate-spin" /> Processing ({processingTopics.length})
          </h3>
          {processingTopics.map((topic) => (
            <div key={topic.id} className="queue-item processing">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{topic.title}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[topic.category || "general"]}</p>
                </div>
                <span className="text-xs text-blue-700 font-medium">{Math.round(topic.progress)}%</span>
              </div>
              <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(4, topic.progress)}%`,
                    background: "linear-gradient(90deg, hsl(var(--glow-blue)), hsl(var(--primary)))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completedTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={16} /> Completed ({completedTopics.length})
          </h3>
          {completedTopics.map((topic) => (
            <article key={topic.id} className="queue-item completed">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{topic.title}</p>
                    {topic.priority && topic.priority !== "normal" && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[topic.priority]}`}>
                        <Flag size={9} /> {topic.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {topic.wordCount?.toLocaleString()} words
                    {topic.processingTimeMs ? ` · ${(topic.processingTimeMs / 1000).toFixed(1)}s` : ""}
                    {" · "}{CATEGORY_LABELS[topic.category || "general"]}
                    {" · saved to history"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => void copyResult(topic.id, topic.result || "")} className="p-1.5 hover:bg-emerald-200 rounded transition-colors" title="Copy result">
                    {copied === topic.id ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  </button>
                  <button type="button" onClick={() => downloadResult(topic)} className="p-1.5 hover:bg-emerald-200 rounded transition-colors" title="Download result">
                    <Download size={14} />
                  </button>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-emerald-800 hover:text-emerald-900">Preview result</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-foreground p-3 rounded bg-background border border-border">{topic.result}</pre>
              </details>
            </article>
          ))}
        </div>
      )}

      {/* Failed */}
      {failedTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} /> Failed ({failedTopics.length})
          </h3>
          {failedTopics.map((topic) => (
            <article key={topic.id} className="queue-item failed">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{topic.title || "Untitled topic"}</p>
                  <p className="text-xs text-red-700 mt-1">{topic.error || "Processing failed"}</p>
                </div>
                <button type="button" onClick={() => resetAndProcess([topic.id])} className="shrink-0 px-2.5 py-1.5 rounded text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                  Retry
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default MultiTopicProcessor;
