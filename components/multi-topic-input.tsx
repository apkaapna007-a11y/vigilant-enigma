"use client";

import { useState, useRef, useCallback } from "react";
import { Topic, TopicPriority, TopicCategory, CATEGORY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import { parseFile, validateFile } from "@/lib/file-parser";
import {
  Plus, X, Upload, GripVertical, Edit2, Check, AlertCircle,
  ChevronDown, ChevronUp, RotateCcw, FileText, Flag, Tag
} from "lucide-react";

interface MultiTopicInputProps {
  topics: Topic[];
  onTopicsChange: React.Dispatch<React.SetStateAction<Topic[]>>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  disabled?: boolean;
}

export function MultiTopicInput({
  topics,
  onTopicsChange,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: MultiTopicInputProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKeyword, setEditKeyword] = useState("");
  const [editCategory, setEditCategory] = useState<TopicCategory>("general");
  const [editPriority, setEditPriority] = useState<TopicPriority>("normal");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTopicIdRef = useRef<string | null>(null);

  const generateId = () => `topic_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const addTopic = () => {
    const id = generateId();
    onTopicsChange((current) => [
      ...current,
      {
        id, title: "", focusKeyword: "", status: "pending", progress: 0,
        priority: "normal" as TopicPriority, category: "general" as TopicCategory,
        createdAt: new Date().toISOString(),
      },
    ]);
    onSelectionChange(new Set([...selectedIds, id]));
    setExpandedId(id);
    setEditingId(id);
    setEditTitle("");
    setEditKeyword("");
    setEditCategory("general");
    setEditPriority("normal");
  };

  const removeTopic = (id: string) => {
    onTopicsChange((current) => current.filter((topic) => topic.id !== id));
    onSelectionChange(new Set([...selectedIds].filter((selectedId) => selectedId !== id)));
    if (expandedId === id) setExpandedId(null);
  };

  const updateTopic = useCallback((id: string, updates: Partial<Topic>) => {
    onTopicsChange((current) => current.map((topic) => topic.id === id ? { ...topic, ...updates } : topic));
  }, [onTopicsChange]);

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setEditKeyword(topic.focusKeyword);
    setEditCategory(topic.category || "general");
    setEditPriority(topic.priority || "normal");
  };

  const saveEdit = (id: string) => {
    updateTopic(id, {
      title: editTitle.trim(),
      focusKeyword: editKeyword.trim(),
      category: editCategory,
      priority: editPriority,
      error: undefined,
    });
    setEditingId(null);
  };

  const handleFileForTopic = useCallback(async (topicId: string, file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      updateTopic(topicId, { error: validationError });
      return;
    }
    try {
      const parsed = await parseFile(file);
      updateTopic(topicId, { sourceFileName: parsed.fileName, sourceText: parsed.text, error: undefined });
    } catch (err) {
      updateTopic(topicId, { error: err instanceof Error ? err.message : "Failed to parse file" });
    }
  }, [updateTopic]);

  const moveTopic = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    onTopicsChange((current) => {
      const sourceIndex = current.findIndex((topic) => topic.id === sourceId);
      const targetIndex = current.findIndex((topic) => topic.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
  };

  const statusClasses: Record<Topic["status"], string> = {
    pending: "bg-slate-100 text-slate-700 border-slate-200",
    queued: "bg-indigo-100 text-indigo-700 border-indigo-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };
  const statusIcon: Record<Topic["status"], string> = {
    pending: "◦", queued: "⊕", processing: "⟳", completed: "✓", failed: "✕"
  };

  return (
    <section className="space-y-3" aria-labelledby="topics-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="topics-heading" className="text-sm font-semibold">Topics ({topics.length})</h3>
          <p className="text-xs text-muted-foreground">Select topics to process, or process the full queue.</p>
        </div>
        <button type="button" onClick={addTopic} disabled={disabled} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors">
          <Plus size={13} aria-hidden="true" /> Add Topic
        </button>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-muted-foreground">
          <p className="text-sm font-medium">No topics added yet</p>
          <p className="text-xs mt-1">Add a topic to start building your batch, or use templates/import.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {topics.map((topic, index) => (
            <div
              key={topic.id}
              draggable={!disabled}
              onDragStart={() => setDragSource(topic.id)}
              onDragOver={(event) => { event.preventDefault(); setDragOverId(topic.id); }}
              onDrop={(event) => { event.preventDefault(); if (dragSource) moveTopic(dragSource, topic.id); setDragSource(null); setDragOverId(null); }}
              onDragLeave={() => setDragOverId(null)}
              className={`rounded-lg border bg-card transition-all ${dragOverId === topic.id ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"} ${disabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 p-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(topic.id)}
                  onChange={() => {
                    const next = new Set(selectedIds);
                    next.has(topic.id) ? next.delete(topic.id) : next.add(topic.id);
                    onSelectionChange(next);
                  }}
                  disabled={disabled || topic.status === "processing"}
                  aria-label={`Select ${topic.title || `topic ${index + 1}`}`}
                  className="rounded border-border"
                />
                <GripVertical size={16} className="text-muted-foreground cursor-grab shrink-0" aria-hidden="true" />
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border shrink-0 ${statusClasses[topic.status]}`}>
                  <span aria-hidden="true">{statusIcon[topic.status]}</span>
                  <span className="capitalize hidden sm:inline">{topic.status}</span>
                </div>
                {/* Priority indicator */}
                {topic.priority && topic.priority !== "normal" && (
                  <span className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[topic.priority]}`}>
                    <Flag size={9} /> {topic.priority}
                  </span>
                )}
                <button type="button" onClick={() => setExpandedId(expandedId === topic.id ? null : topic.id)} className="flex-1 min-w-0 text-left" disabled={disabled}>
                  <p className="text-sm font-medium truncate">{topic.title || <span className="text-muted-foreground">Untitled topic</span>}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {topic.focusKeyword || "No focus keyword"}
                    {topic.sourceFileName ? ` · ${topic.sourceFileName}` : ""}
                    {topic.category && topic.category !== "general" ? ` · ${CATEGORY_LABELS[topic.category]}` : ""}
                  </p>
                </button>
                {(topic.status === "processing" || topic.status === "completed") && (
                  <div className="hidden sm:block w-20 h-1.5 bg-muted rounded-full overflow-hidden" aria-label={`${Math.round(topic.progress)}% complete`}>
                    <div className={`h-full transition-all ${topic.status === "completed" ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${Math.max(topic.status === "completed" ? 100 : 5, topic.progress)}%` }} />
                  </div>
                )}
                <div className="flex gap-1 shrink-0">
                  {topic.status === "failed" && <button type="button" onClick={() => updateTopic(topic.id, { status: "pending", progress: 0, error: undefined, result: undefined })} className="p-1.5 hover:bg-muted rounded text-orange-600" title="Reset for retry"><RotateCcw size={14} /></button>}
                  {expandedId === topic.id ? <ChevronUp size={14} className="mt-1.5 text-muted-foreground" aria-hidden="true" /> : <ChevronDown size={14} className="mt-1.5 text-muted-foreground" aria-hidden="true" />}
                  <button type="button" onClick={() => removeTopic(topic.id)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-red-600" disabled={disabled} aria-label={`Remove ${topic.title || `topic ${index + 1}`}`}><X size={14} /></button>
                </div>
              </div>

              {expandedId === topic.id && (
                <div className="border-t border-border p-4 space-y-3 bg-muted/30">
                  {editingId === topic.id ? (
                    <>
                      <label className="block text-xs font-semibold">
                        Article Topic
                        <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="e.g., Newborn Circumcision Care" className="input mt-1" maxLength={200} autoFocus />
                      </label>
                      <label className="block text-xs font-semibold">
                        Focus Keyword
                        <input value={editKeyword} onChange={(event) => setEditKeyword(event.target.value)} placeholder="e.g., newborn circumcision care" className="input mt-1" maxLength={100} />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs font-semibold">
                          Category
                          <select value={editCategory} onChange={(event) => setEditCategory(event.target.value as TopicCategory)} className="input mt-1">
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs font-semibold">
                          Priority
                          <select value={editPriority} onChange={(event) => setEditPriority(event.target.value as TopicPriority)} className="input mt-1">
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => saveEdit(topic.id)} className="btn-primary flex-1 justify-center"><Check size={14} /> Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold mb-1">Article Topic</p>
                          <p>{topic.title || <span className="text-muted-foreground">Not set</span>}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1">Focus Keyword</p>
                          <p>{topic.focusKeyword || <span className="text-muted-foreground">Not set</span>}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1">Category</p>
                          <p className="capitalize">{CATEGORY_LABELS[topic.category || "general"]}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1">Priority</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[topic.priority || "normal"]}`}>
                            <Flag size={10} /> {topic.priority || "normal"}
                          </span>
                        </div>
                      </div>
                      {topic.tags && topic.tags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Tag size={10} /> Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {topic.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={() => startEdit(topic)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-muted hover:bg-muted/80 text-sm font-medium">
                        <Edit2 size={13} /> Edit Details
                      </button>
                    </>
                  )}
                  {topic.sourceFileName && (
                    <div className="rounded bg-background border border-border p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <FileText size={13} className="text-primary" />
                        <span className="flex-1 truncate font-medium">{topic.sourceFileName}</span>
                        <button type="button" onClick={() => updateTopic(topic.id, { sourceFileName: undefined, sourceText: undefined })} className="p-0.5 hover:bg-muted rounded" disabled={disabled} aria-label="Remove source file"><X size={12} /></button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{topic.sourceText?.length.toLocaleString() || 0} characters loaded</p>
                    </div>
                  )}
                  <div
                    onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file && !disabled) void handleFileForTopic(topic.id, file); }}
                    onDragOver={(event) => event.preventDefault()}
                    onClick={() => { if (!disabled) { pendingTopicIdRef.current = topic.id; fileInputRef.current?.click(); } }}
                    className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 cursor-pointer bg-background"
                  >
                    <Upload size={16} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-medium">Drop a source file or click to upload</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">.txt · .md · .docx · .pdf · .html</p>
                  </div>
                  {topic.error && (
                    <div className="flex gap-2 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertCircle size={14} className="shrink-0" /><span>{topic.error}</span>
                    </div>
                  )}
                  {topic.result && (
                    <div className="rounded bg-background border border-border p-2 max-h-32 overflow-y-auto">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Result preview</p>
                      <p className="text-xs line-clamp-4">{topic.result}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.docx,.pdf,.html,.htm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const topicId = pendingTopicIdRef.current;
          if (file && topicId) void handleFileForTopic(topicId, file);
          pendingTopicIdRef.current = null;
          event.target.value = "";
        }}
        disabled={disabled}
      />
    </section>
  );
}

export default MultiTopicInput;
