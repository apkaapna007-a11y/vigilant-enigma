"use client";

import { useState, useRef, useCallback } from "react";
import { Topic, TopicCategory, TopicPriority, CATEGORY_LABELS } from "@/lib/types";
import { Upload, FileText, AlertCircle, CheckCircle2, Table, Code, X, Download, Plus } from "lucide-react";

interface BatchImportProps {
  onImport: (topics: Topic[]) => void;
  disabled?: boolean;
}

type ImportFormat = "csv" | "json" | "text";

export function BatchImport({ onImport, disabled = false }: BatchImportProps) {
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [rawInput, setRawInput] = useState("");
  const [preview, setPreview] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => `topic_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const parseCSV = useCallback((text: string): Topic[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const titleIdx = header.findIndex(h => h.includes("title") || h.includes("topic") || h.includes("name"));
    const keywordIdx = header.findIndex(h => h.includes("keyword") || h.includes("focus"));
    const categoryIdx = header.findIndex(h => h.includes("category") || h.includes("cat"));
    const priorityIdx = header.findIndex(h => h.includes("priority"));
    const tagsIdx = header.findIndex(h => h.includes("tag"));

    if (titleIdx === -1) throw new Error("CSV must have a 'title' or 'topic' column");

    return lines.slice(1).filter(line => line.trim()).map(line => {
      const cols = parseCSVLine(line);
      const title = cols[titleIdx]?.trim() || "";
      const focusKeyword = keywordIdx >= 0 ? cols[keywordIdx]?.trim() || "" : title.toLowerCase();
      const category = categoryIdx >= 0 ? (cols[categoryIdx]?.trim().toLowerCase() as TopicCategory) || "general" : "general";
      const priority = priorityIdx >= 0 ? (cols[priorityIdx]?.trim().toLowerCase() as TopicPriority) || "normal" : "normal";
      const tags = tagsIdx >= 0 ? cols[tagsIdx]?.split(";").map(t => t.trim()).filter(Boolean) : [];

      return {
        id: generateId(),
        title,
        focusKeyword,
        status: "pending" as const,
        progress: 0,
        priority,
        category,
        createdAt: new Date().toISOString(),
        tags,
      };
    }).filter(t => t.title);
  }, []);

  const parseJSON = useCallback((text: string): Topic[] => {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : data.topics || [];
    if (!Array.isArray(items) || items.length === 0) throw new Error("JSON must be an array of topics or have a 'topics' array");

    return items.map((item: any) => ({
      id: generateId(),
      title: item.title || item.topic || item.name || "",
      focusKeyword: item.focusKeyword || item.keyword || item.focus_keyword || (item.title || "").toLowerCase(),
      status: "pending" as const,
      progress: 0,
      priority: (item.priority as TopicPriority) || "normal",
      category: (item.category as TopicCategory) || "general",
      createdAt: new Date().toISOString(),
      tags: item.tags || [],
    })).filter((t: Topic) => t.title);
  }, []);

  const parseText = useCallback((text: string): Topic[] => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split("|").map(p => p.trim());
      const title = parts[0] || "";
      const focusKeyword = parts[1] || title.toLowerCase();
      return {
        id: generateId(),
        title,
        focusKeyword,
        status: "pending" as const,
        progress: 0,
        priority: "normal" as TopicPriority,
        category: "general" as TopicCategory,
        createdAt: new Date().toISOString(),
      };
    }).filter(t => t.title);
  }, []);

  const handleParse = useCallback(() => {
    setError(null);
    setImported(false);
    try {
      let topics: Topic[];
      switch (format) {
        case "csv": topics = parseCSV(rawInput); break;
        case "json": topics = parseJSON(rawInput); break;
        case "text": topics = parseText(rawInput); break;
        default: topics = [];
      }
      if (topics.length === 0) throw new Error("No valid topics found in input");
      setPreview(topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse input");
      setPreview([]);
    }
  }, [format, rawInput, parseCSV, parseJSON, parseText]);

  const handleImport = () => {
    if (preview.length === 0) return;
    onImport(preview);
    setImported(true);
    setRawInput("");
    setPreview([]);
  };

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (ext === "csv") setFormat("csv");
    else if (ext === "json") setFormat("json");
    else setFormat("text");

    try {
      const text = await file.text();
      setRawInput(text);
    } catch {
      setError("Failed to read file");
    }
  };

  const downloadTemplate = (fmt: "csv" | "json") => {
    let content: string;
    let filename: string;
    let mime: string;

    if (fmt === "csv") {
      content = `title,focusKeyword,category,priority,tags
Newborn Bathing Guide,newborn bathing guide,newborn,normal,hygiene;first-time-parent
Baby Sleep Tips,baby sleep tips,sleep,high,sleep;routine
Starting Solids Guide,starting solids baby,nutrition,normal,nutrition;milestone`;
      filename = "topic_import_template.csv";
      mime = "text/csv";
    } else {
      content = JSON.stringify({
        topics: [
          { title: "Newborn Bathing Guide", focusKeyword: "newborn bathing guide", category: "newborn", priority: "normal", tags: ["hygiene"] },
          { title: "Baby Sleep Tips", focusKeyword: "baby sleep tips", category: "sleep", priority: "high", tags: ["sleep", "routine"] },
        ],
      }, null, 2);
      filename = "topic_import_template.json";
      mime = "application/json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Upload size={14} className="text-primary" />
            Batch Import Topics
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Import topics from CSV, JSON, or plain text</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {(["csv", "json", "text"] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFormat(f); setPreview([]); setError(null); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                format === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Template downloads */}
      <div className="flex gap-2">
        <button onClick={() => downloadTemplate("csv")} className="btn-ghost text-xs">
          <Download size={12} /> CSV Template
        </button>
        <button onClick={() => downloadTemplate("json")} className="btn-ghost text-xs">
          <Download size={12} /> JSON Template
        </button>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <div
          onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) handleFileUpload(file); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/40 transition-colors cursor-pointer bg-card/40"
        >
          <Upload size={18} className="mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs font-medium">Drop a .csv or .json file, or click to upload</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Or paste content directly below</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ""; }}
            disabled={disabled}
          />
        </div>

        <textarea
          value={rawInput}
          onChange={(e) => { setRawInput(e.target.value); setPreview([]); setError(null); }}
          placeholder={
            format === "csv"
              ? "title,focusKeyword,category,priority\ntitle,focusKeyword,category,priority"
              : format === "json"
              ? '[{"title": "...", "focusKeyword": "...", "category": "..."}]'
              : "One topic per line. Use | to separate title and keyword:\nTopic Title | focus keyword"
          }
          className="input min-h-[120px] resize-y font-mono text-xs"
          disabled={disabled}
        />
      </div>

      {/* Parse button */}
      {rawInput.trim() && preview.length === 0 && (
        <button onClick={handleParse} disabled={disabled} className="btn-secondary w-full justify-center">
          <Table size={14} /> Parse & Preview
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && !imported && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              {preview.length} topics parsed successfully
            </p>
            <button onClick={() => { setPreview([]); setRawInput(""); }} className="btn-ghost text-xs">
              <X size={12} /> Clear
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {preview.slice(0, 20).map((topic, i) => (
              <div key={topic.id} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-muted/30">
                <span className="text-muted-foreground w-5">{i + 1}</span>
                <span className="flex-1 font-medium truncate">{topic.title}</span>
                <span className="text-muted-foreground truncate max-w-[120px]">{topic.focusKeyword}</span>
                <span className="badge bg-muted text-muted-foreground border-border capitalize">{topic.category}</span>
              </div>
            ))}
            {preview.length > 20 && (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                +{preview.length - 20} more topics
              </div>
            )}
          </div>
          <button onClick={handleImport} className="btn-primary w-full justify-center">
            <Plus size={14} /> Import {preview.length} Topics
          </button>
        </div>
      )}

      {imported && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-fade-in">
          <CheckCircle2 size={14} />
          Topics imported successfully! Switch to the topic list to see them.
        </div>
      )}
    </section>
  );
}

// CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export default BatchImport;
