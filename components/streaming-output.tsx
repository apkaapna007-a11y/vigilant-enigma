"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StreamingOutputProps {
  content: string;
  status: "idle" | "parsing" | "rewriting" | "streaming" | "complete" | "error";
  progress: number;
}

export function StreamingOutput({ content, status, progress }: StreamingOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);

  // Auto-scroll to bottom as content streams
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    setWordCount(content.split(/\s+/).filter(w => w.length > 0).length);
  }, [content]);

  if (status === "idle") return null;

  const statusLabels = {
    parsing: "Parsing file...",
    rewriting: "Calling AI...",
    streaming: "Writing...",
    complete: "Complete!",
    error: "Error occurred",
  };

  const statusColors = {
    parsing: "text-blue-600",
    rewriting: "text-blue-600",
    streaming: "text-amber-600",
    complete: "text-green-600",
    error: "text-red-600",
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Progress Section */}
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

        {/* Progress Bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status dots */}
        <div className="flex gap-2">
          {["parsing", "rewriting", "streaming", "complete"].map((step) => {
            const isActive = status === step;
            const isPast =
              ["parsing", "rewriting", "streaming", "complete"].indexOf(status) >=
              ["parsing", "rewriting", "streaming", "complete"].indexOf(step);
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

      {/* Output */}
      {content && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
            <span className="text-sm font-semibold">Rewritten Article</span>
            <span className="text-xs text-muted-foreground">
              {wordCount.toLocaleString()} words
            </span>
          </div>
          <div
            ref={containerRef}
            className="max-h-[600px] overflow-y-auto p-6"
          >
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
            {status === "streaming" && (
              <span className="inline-block w-2 h-5 bg-amber-500 animate-pulse ml-1" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
