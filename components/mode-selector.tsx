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
    name: "ContentForge",
    emoji: "🔥",
    description: "Aggressive SEO, max keyword density",
    features: ["15+ headings", "10 FAQs", "Keyword-rich"],
  },
  {
    id: "claude-seo" as const,
    name: "Claude SEO",
    emoji: "🧠",
    description: "Analytical, research-forward",
    features: ["Data citations", "Comparison tables", "Step-by-step guides"],
  },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold flex items-center gap-2">
        <span>⚡</span>
        Writing Mode
      </label>
      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all",
              value === mode.id
                ? "border-amber-500 bg-amber-50 shadow-md shadow-amber-200/30"
                : "border-border bg-card hover:border-amber-300 hover:shadow-sm"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{mode.emoji}</span>
              <span className="font-bold text-lg">{mode.name}</span>
            </div>
            <span className="text-sm text-muted-foreground mb-3">
              {mode.description}
            </span>
            <div className="flex flex-wrap gap-1">
              {mode.features.map((f) => (
                <span
                  key={f}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    value === mode.id
                      ? "bg-amber-200 text-amber-800"
                      : "bg-muted text-muted-foreground"
                  }`}
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
