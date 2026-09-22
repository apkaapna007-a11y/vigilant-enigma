"use client";

import { useState, useRef, useCallback } from "react";
import { Topic, BatchJob, WritingMode, OutputFormat, Settings } from "@/lib/types";
import { OpenAIClient } from "@/lib/openai-client";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildContinuePrompt,
  isOutputIncomplete,
  validateAndCleanOutput,
} from "@/lib/prompts";
import { getSettings, saveToHistory, generateId, countWords } from "@/lib/history";
import { Zap, Pause, Play, X, Download, Copy, CheckCircle2, AlertTriangle, Loader } from "lucide-react";

interface MultiTopicProcessorProps {
  topics: Topic[];
  onTopicsUpdate: (topics: Topic[]) => void;
  mode: WritingMode;
  outputFormat: OutputFormat;
  wordCount: number;
  authorName: string;
  genMode: "generate" | "rewrite";
}

export function MultiTopicProcessor({
  topics,
  onTopicsUpdate,
  mode,
  outputFormat,
  wordCount,
  authorName,
  genMode,
}: MultiTopicProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const completed = topics.filter((t) => t.status === "completed").length;
  const failed = topics.filter((t) => t.status === "failed").length;
  const canRetry = topics.some((t) => t.status === "failed");

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === topics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(topics.map((t) => t.id)));
    }
  };

  const updateTopic = (id: string, updates: Partial<Topic>) => {
    onTopicsUpdate(
      topics.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const processSingleTopic = useCallback(
    async (topic: Topic, controller: AbortController) => {
      const settings = getSettings() as Settings | null;
      if (!settings?.apiKey) throw new Error("API key not configured");

      if (!topic.title.trim() || !topic.focusKeyword.trim()) {
        throw new Error("Topic title and keyword required");
      }

      if (genMode === "rewrite" && !topic.sourceText?.trim()) {
        throw new Error("Source text required for rewrite mode");
      }

      updateTopic(topic.id, { status: "processing", progress: 5, error: undefined });

      try {
        const systemPrompt = await buildSystemPrompt(mode, outputFormat, wordCount);
        const userPrompt = buildUserPrompt({
          topic: topic.title.trim(),
          focusKeyword: topic.focusKeyword.trim(),
          wordCount,
          authorName: authorName.trim() || "ChildBloom Editorial",
          outputFormat,
          sourceText: genMode === "rewrite" ? topic.sourceText : undefined,
        });

        const client = new OpenAIClient(settings);
        let fullText = "";

        await client.streamRewrite(
          systemPrompt,
          userPrompt,
          {
            onToken: (token) => {
              fullText += token;
              const currentWords = countWords(fullText);
              const estimatedProgress = Math.min(92, 5 + (currentWords / wordCount) * 87);
              updateTopic(topic.id, { progress: estimatedProgress, result: fullText });
            },
            onComplete: (text) => {
              fullText = text;
            },
            onError: (err) => {
              throw err;
            },
          },
          controller.signal
        );

        // Handle incomplete output
        if (isOutputIncomplete(fullText) && !controller.signal.aborted) {
          updateTopic(topic.id, { progress: 93 });
          const continuePrompt = buildContinuePrompt(fullText);
          let continued = "";

          try {
            await client.streamRewrite(
              systemPrompt,
              continuePrompt,
              {
                onToken: (token) => {
                  continued += token;
                  updateTopic(topic.id, { result: fullText + continued });
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
            // Keep partial result
          }
        }

        // Validate output
        const validation = validateAndCleanOutput(
          fullText,
          outputFormat,
          topic.title.trim(),
          topic.focusKeyword.trim()
        );
        const finalText = validation.cleanedText;

        updateTopic(topic.id, {
          status: "completed",
          progress: 100,
          result: finalText,
          wordCount: countWords(finalText),
          completedAt: new Date().toISOString(),
        });

        // Save to history
        if (finalText) {
          saveToHistory({
            id: generateId(),
            fileName: `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 60)}.${
              outputFormat === "cms-html" ? "html" : "md"
            }`,
            originalText:
              genMode === "rewrite"
                ? topic.sourceText!.slice(0, 800)
                : `Topic: ${topic.title}\nKeyword: ${topic.focusKeyword}`,
            rewrittenText: finalText,
            mode,
            outputFormat,
            wordCount: countWords(finalText),
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && !err.message?.includes("cancelled")) {
          updateTopic(topic.id, {
            status: "failed",
            error: err.message || "Processing failed",
            progress: 0,
          });
        }
      }
    },
    [mode, outputFormat, wordCount, authorName, genMode, updateTopic]
  );

  const processTopics = useCallback(
    async (topicIds: string[]) => {
      const settings = getSettings() as Settings | null;
      if (!settings?.apiKey) {
        alert("Please set your API key in Settings first.");
        return;
      }

      setIsProcessing(true);
      setIsPaused(false);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for (const id of topicIds) {
          if (controller.signal.aborted) break;

          // Check pause state
          while (isPaused && !controller.signal.aborted) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const topic = topics.find((t) => t.id === id);
          if (topic && topic.status === "pending") {
            await processSingleTopic(topic, controller);
          }
        }
      } finally {
        setIsProcessing(false);
        abortRef.current = null;
      }
    },
    [topics, isPaused, processSingleTopic]
  );

  const handleProcessAll = () => {
    const pendingIds = topics
      .filter((t) => t.status === "pending" || t.status === "failed")
      .map((t) => t.id);
    if (pendingIds.length > 0) {
      processTopics(pendingIds);
    }
  };

  const handleProcessSelected = () => {
    const toProcess = Array.from(selectedIds).filter((id) => {
      const topic = topics.find((t) => t.id === id);
      return topic && (topic.status === "pending" || topic.status === "failed");
    });
    if (toProcess.length > 0) {
      processTopics(toProcess);
    }
  };

  const handleRetryFailed = () => {
    const failedIds = topics.filter((t) => t.status === "failed").map((t) => t.id);
    failedIds.forEach((id) => {
      updateTopic(id, { status: "pending", progress: 0, error: undefined, result: undefined });
    });
    processTopics(failedIds);
  };

  const copyResult = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const downloadResult = (topic: Topic) => {
    if (!topic.result) return;
    const ext = outputFormat === "cms-html" ? "html" : "md";
    const mime = outputFormat === "cms-html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8";
    const blob = new Blob([topic.result], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedTopics = topics.filter((t) => t.status === "completed");
  const failedTopics = topics.filter((t) => t.status === "failed");
  const processingTopics = topics.filter((t) => t.status === "processing");
  const pendingTopics = topics.filter((t) => t.status === "pending");

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{processingTopics.length}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-600">{pendingTopics.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            {failed > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-background rounded-lg p-1">
            <div
              className="h-2 bg-green-500 rounded-full transition-all"
              style={{ width: `${(completed / topics.length) * 100}%` }}
            />
            <div
              className="h-2 bg-blue-500 rounded-full transition-all"
              style={{ width: `${(processingTopics.length / topics.length) * 100}%` }}
            />
            <div
              className="h-2 bg-slate-300 rounded-full transition-all"
              style={{ width: `${(pendingTopics.length / topics.length) * 100}%` }}
            />
            {failed > 0 && (
              <div
                className="h-2 bg-red-500 rounded-full transition-all"
                style={{ width: `${(failed / topics.length) * 100}%` }}
              />
            )}
          </div>
        </div>

        <p className="text-sm font-medium text-foreground">
          {completed}/{topics.length} topics completed
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isProcessing ? (
          <>
            <button
              onClick={handleProcessAll}
              disabled={topics.length === 0 || (pendingTopics.length === 0 && failedTopics.length === 0)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Zap size={14} />
              Process All
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleProcessSelected}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                <Zap size={14} />
                Process {selectedIds.size} Selected
              </button>
            )}

            {canRetry && (
              <button
                onClick={handleRetryFailed}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50 transition-colors"
              >
                <AlertTriangle size={14} />
                Retry {failed} Failed
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => {
                abortRef.current?.abort();
                setIsProcessing(false);
                setIsPaused(false);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Selection Controls (only show if not processing) */}
      {!isProcessing && topics.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <input
            type="checkbox"
            checked={selectedIds.size === topics.length && topics.length > 0}
            onChange={toggleSelectAll}
            className="rounded border-border"
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size === 0 ? "Select topics" : `${selectedIds.size} selected`}
          </span>
        </div>
      )}

      {/* Completed Results */}
      {completedTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Completed ({completed})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {completedTopics.map((topic) => (
              <div key={topic.id} className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{topic.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic.wordCount?.toLocaleString()} words · {new Date(topic.completedAt!).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => copyResult(topic.id, topic.result!)}
                      className="p-1.5 hover:bg-green-200 rounded"
                      title="Copy"
                    >
                      {copied === topic.id ? (
                        <CheckCircle2 size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} className="text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => downloadResult(topic)}
                      className="p-1.5 hover:bg-green-200 rounded text-muted-foreground"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Results */}
      {failedTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            Failed ({failed})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {failedTopics.map((topic) => (
              <div key={topic.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{topic.title}</p>
                    <p className="text-xs text-red-600">{topic.error}</p>
                  </div>
                  <button
                    onClick={() => {
                      updateTopic(topic.id, {
                        status: "pending",
                        progress: 0,
                        error: undefined,
                        result: undefined,
                      });
                      processTopics([topic.id]);
                    }}
                    className="px-2 py-1 rounded text-xs font-medium bg-orange-500 text-white hover:bg-orange-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Topics */}
      {processingTopics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Loader size={16} className="animate-spin" />
            Processing ({processingTopics.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {processingTopics.map((topic) => (
              <div key={topic.id} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-medium mb-2">{topic.title}</p>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${Math.max(5, topic.progress)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.round(topic.progress)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection checkboxes for topic list (hidden, handled separately in parent) */}
      <input
        type="hidden"
        value={JSON.stringify(Array.from(selectedIds))}
        onChange={() => {}}
      />
    </div>
  );
}
