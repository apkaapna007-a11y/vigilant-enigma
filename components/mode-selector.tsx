"use client";

import { cn } from "@/lib/utils";
import type { WritingMode } from "@/lib/prompts";

interface ModeSelectorProps {
  value: WritingMode;
  onChange: (mode: WritingMode) => void;
}

const modes = [
  {
    id: "contentforge" as const,
    name: "ContentForge SEO",
    description: "Keyword-led structure, extractable answers, strong on-page SEO",
    features: ["Keyword in opening", "Query-variant H2s", "High extractability"],
  },
  {
    id: "claude-seo" as const,
    name: "Claude SEO",
    description: "Analytical depth, evidence hierarchy, counter-arguments",
    features: ["Cited evidence", "Comparisons", "Step guides"],
  },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Writing mode</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              "text-left rounded-lg border p-3.5 transition-colors",
              value === mode.id
                ? "border-primary bg-accent/60 ring-1 ring-primary/30"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sm">{mode.name}</span>
              {value === mode.id && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
              {mode.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {mode.features.map((f) => (
                <span
                  key={f}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    value === mode.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {f}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
