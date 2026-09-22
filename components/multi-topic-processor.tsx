"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Topic, WritingMode, OutputFormat, Settings } from "@/lib/types";
import { OpenAIClient } from "@/lib/openai-client";
import { buildSystemPrompt, buildUserPrompt, buildContinuePrompt, isOutputIncomplete, validateAndCleanOutput } from "@/lib/prompts";
import { getSettings, saveToHistory, generateId, countWords } from "@/lib/history";
import { AlertTriangle, Check, CheckCircle2, Copy, Download, Loader, Pause, Play, RotateCcw, X, Zap } from "lucide-react";

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
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  const updateTopic = useCallback((id: string, updates: Partial<Topic>) => {
    onTopicsUpdate((current) => current.map((topic) => topic.id === id ? { ...topic, ...updates } : topic));
  }, [onTopicsUpdate]);

  const processSingleTopic = useCallback(async (topic: Topic, controller: AbortController) => {
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) throw new Error("API key not configured");
    if (!topic.title.trim() || !topic.focusKeyword.trim()) throw new Error("Topic title and focus keyword are required");
    if (genMode === "rewrite" && !topic.sourceText?.trim()) throw new Error("A source file is required in rewrite mode");

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
        } catch { /* Keep the first complete-looking response if continuation fails. */ }
      }

      const finalText = validateAndCleanOutput(fullText, outputFormat, topic.title.trim(), topic.focusKeyword.trim()).cleanedText;
      updateTopic(topic.id, { status: "completed", progress: 100, result: finalText, wordCount: countWords(finalText), completedAt: new Date().toISOString(), error: undefined });
      if (finalText) {
        saveToHistory({ id: generateId(), fileName: `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 60)}.${outputFormat === "cms-html" ? "html" : "md"}`, originalText: genMode === "rewrite" ? (topic.sourceText || "").slice(0, 800) : `Topic: ${topic.title}\nKeyword: ${topic.focusKeyword}`, rewrittenText: finalText, mode, outputFormat, wordCount: countWords(finalText), createdAt: new Date().toISOString() });
      }
    } catch (err) {
      const error = err as Error;
      if (!controller.signal.aborted && !error.message?.toLowerCase().includes("cancelled")) updateTopic(topic.id, { status: "failed", progress: 0, error: error.message || "Processing failed" });
    }
  }, [authorName, genMode, mode, onTopicsUpdate, outputFormat, updateTopic, wordCount]);

  const processTopics = useCallback(async (topicIds: string[]) => {
    if (!topicIds.length || isProcessing) return;
    const settings = getSettings() as Settings | null;
    if (!settings?.apiKey) { alert("Please set your API key in Settings first."); return; }
    setIsProcessing(true); setIsPaused(false); pausedRef.current = false;
    const controller = new AbortController(); abortRef.current = controller;
    let cursor = 0;
    const worker = async () => {
      while (!controller.signal.aborted) {
        while (pausedRef.current && !controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, 120));
        const id = topicIds[cursor++];
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

  const pendingIds = topics.filter((topic) => topic.status === "pending").map((topic) => topic.id);
  const selectedProcessable = topics.filter((topic) => selectedIds.has(topic.id) && (topic.status === "pending" || topic.status === "failed")).map((topic) => topic.id);
  const completedTopics = topics.filter((topic) => topic.status === "completed");
  const failedTopics = topics.filter((topic) => topic.status === "failed");
  const processingTopics = topics.filter((topic) => topic.status === "processing");
  const pendingTopics = topics.filter((topic) => topic.status === "pending");
  const completed = completedTopics.length;
  const total = topics.length;

  const resetAndProcess = (ids: string[]) => {
    onTopicsUpdate((current) => current.map((topic) => ids.includes(topic.id) ? { ...topic, status: "pending", progress: 0, error: undefined, result: undefined } : topic));
    void processTopics(ids);
  };
  const copyResult = async (id: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); } catch { /* clipboard unavailable */ } };
  const downloadResult = (topic: Topic) => { if (!topic.result) return; const ext = outputFormat === "cms-html" ? "html" : "md"; const blob = new Blob([topic.result], { type: outputFormat === "cms-html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.${ext}`; anchor.click(); URL.revokeObjectURL(url); };

  return (
    <section className="space-y-4" aria-label="Batch processing">
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-5">
            <div><p className="text-2xl font-bold text-green-600">{completed}/{total}</p><p className="text-xs text-muted-foreground">Completed</p></div>
            <div><p className="text-2xl font-bold text-blue-600">{processingTopics.length}</p><p className="text-xs text-muted-foreground">Processing</p></div>
            <div><p className="text-2xl font-bold text-slate-600">{pendingTopics.length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
            {failedTopics.length > 0 && <div><p className="text-2xl font-bold text-red-600">{failedTopics.length}</p><p className="text-xs text-muted-foreground">Failed</p></div>}
          </div>
          <div className="min-w-[180px] flex-1 max-w-sm"><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></div><p className="mt-1 text-right text-xs text-muted-foreground">{total ? Math.round((completed / total) * 100) : 0}% complete</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isProcessing ? <>
          <button type="button" onClick={() => void processTopics(pendingIds)} disabled={!pendingIds.length} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"><Zap size={14} /> Process All{pendingIds.length ? ` (${pendingIds.length})` : ""}</button>
          <button type="button" onClick={() => resetAndProcess(selectedProcessable)} disabled={!selectedProcessable.length} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"><Zap size={14} /> Process Selected{selectedProcessable.length ? ` (${selectedProcessable.length})` : ""}</button>
          {failedTopics.length > 0 && <button type="button" onClick={() => resetAndProcess([failedTopics[0].id])} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50"><RotateCcw size={14} /> Retry first failed</button>}
        </> : <>
          <button type="button" onClick={() => setIsPaused((value) => !value)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">{isPaused ? <Play size={14} /> : <Pause size={14} />}{isPaused ? "Resume" : "Pause"}</button>
          <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"><X size={14} /> Cancel</button>
        </>}
        <button type="button" onClick={() => onSelectionChange(selectedIds.size === topics.length ? new Set() : new Set(topics.map((topic) => topic.id)))} disabled={!topics.length || isProcessing} className="ml-auto px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">{selectedIds.size === topics.length ? "Clear selection" : "Select all"}</button>
      </div>

      {processingTopics.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2"><Loader size={16} className="animate-spin" /> Processing ({processingTopics.length})</h3>{processingTopics.map((topic) => <div key={topic.id} className="rounded-lg border border-blue-200 bg-blue-50 p-3"><div className="flex justify-between gap-3"><p className="text-sm font-medium truncate">{topic.title}</p><span className="text-xs text-blue-700">{Math.round(topic.progress)}%</span></div><div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(4, topic.progress)}%` }} /></div></div>)}</div>}

      {completedTopics.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold text-green-700 flex items-center gap-2"><CheckCircle2 size={16} /> Completed ({completedTopics.length})</h3>{completedTopics.map((topic) => <article key={topic.id} className="rounded-lg border border-green-200 bg-green-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium truncate">{topic.title}</p><p className="text-xs text-muted-foreground">{topic.wordCount?.toLocaleString()} words · saved to history</p></div><div className="flex gap-1 shrink-0"><button type="button" onClick={() => void copyResult(topic.id, topic.result || "")} className="p-1.5 hover:bg-green-200 rounded" title="Copy result">{copied === topic.id ? <Check size={14} className="text-green-700" /> : <Copy size={14} />}</button><button type="button" onClick={() => downloadResult(topic)} className="p-1.5 hover:bg-green-200 rounded" title="Download result"><Download size={14} /></button></div></div><details className="mt-2"><summary className="cursor-pointer text-xs text-green-800">Preview result</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-foreground">{topic.result}</pre></details></article>)}</div>}

      {failedTopics.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertTriangle size={16} /> Failed ({failedTopics.length})</h3>{failedTopics.map((topic) => <article key={topic.id} className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium truncate">{topic.title || "Untitled topic"}</p><p className="text-xs text-red-700 mt-1">{topic.error || "Processing failed"}</p></div><button type="button" onClick={() => resetAndProcess([topic.id])} className="shrink-0 px-2.5 py-1.5 rounded text-xs font-medium bg-orange-500 text-white hover:bg-orange-600">Retry</button></article>)}</div>}
    </section>
  );
}

export default MultiTopicProcessor;
