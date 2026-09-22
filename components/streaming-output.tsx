"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { OutputFormat } from "@/lib/prompts";

interface StreamingOutputProps {
  content: string;
  status: "idle" | "parsing" | "rewriting" | "streaming" | "complete" | "error";
  progress: number;
  outputFormat?: OutputFormat;
}

export function StreamingOutput({ content, status, progress, outputFormat = "clean-md" }: StreamingOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");

  useEffect(() => {
    if (containerRef.current && status === "streaming") {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    setWordCount(content.split(/\s+/).filter((w) => w.length > 0).length);
  }, [content, status]);

  if (status === "idle") return null;

  const statusLabels = {
    parsing: "Parsing file...",
    rewriting: "Calling AI...",
    streaming: "Writing...",
    complete: "Complete",
    error: "Error",
  };

  const statusColors = {
    parsing: "text-blue-600",
    rewriting: "text-blue-600",
    streaming: "text-amber-600",
    complete: "text-green-600",
    error: "text-red-600",
  };

  const isHtml = outputFormat === "cms-html";

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{wordCount.toLocaleString()} words</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex gap-2">
          {["parsing", "rewriting", "streaming", "complete"].map((step) => {
            const steps = ["parsing", "rewriting", "streaming", "complete"];
            const isActive = status === step;
            const isPast = steps.indexOf(status) >= steps.indexOf(step);
            return (
              <div
                key={step}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  isActive
                    ? "bg-amber-500 animate-pulse"
                    : isPast
                    ? "bg-green-500"
                    : "bg-muted"
                }`}
              />
            );
          })}
        </div>
      </div>

      {content && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Rewritten Article</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`px-2.5 py-1 ${viewMode === "preview" ? "bg-amber-500 text-white" : "bg-background hover:bg-muted"}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode("raw")}
                  className={`px-2.5 py-1 ${viewMode === "raw" ? "bg-amber-500 text-white" : "bg-background hover:bg-muted"}`}
                >
                  Raw
                </button>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {wordCount.toLocaleString()} words
              </span>
            </div>
          </div>
          <div
            ref={containerRef}
            className="max-h-[560px] sm:max-h-[640px] overflow-y-auto p-4 sm:p-6"
          >
            {viewMode === "raw" ? (
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{content}</pre>
            ) : isHtml ? (
              <div
                className="prose prose-sm max-w-none cb-preview"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            )}
            {status === "streaming" && (
              <span className="inline-block w-2 h-5 bg-amber-500 animate-pulse ml-1 align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
