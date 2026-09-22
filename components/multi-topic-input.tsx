"use client";

import { useState, useRef, useCallback } from "react";
import { Topic } from "@/lib/types";
import { parseFile, validateFile } from "@/lib/file-parser";
import {
  Plus, X, Upload, GripVertical, Edit2, Check, AlertCircle,
  ChevronDown, ChevronUp, Trash2, RotateCcw, FileText
} from "lucide-react";

interface MultiTopicInputProps {
  topics: Topic[];
  onTopicsChange: (topics: Topic[]) => void;
  disabled?: boolean;
}

export function MultiTopicInput({ topics, onTopicsChange, disabled = false }: MultiTopicInputProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKeyword, setEditKeyword] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTopicIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);

  const generateId = () => `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addTopic = () => {
    const newTopic: Topic = {
      id: generateId(),
      title: "",
      focusKeyword: "",
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    onTopicsChange([...topics, newTopic]);
  };

  const removeTopic = (id: string) => {
    onTopicsChange(topics.filter((t) => t.id !== id));
  };

  const updateTopic = (id: string, updates: Partial<Topic>) => {
    onTopicsChange(
      topics.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setEditKeyword(topic.focusKeyword);
  };

  const saveEdit = (id: string) => {
    updateTopic(id, {
      title: editTitle.trim(),
      focusKeyword: editKeyword.trim(),
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
      updateTopic(topicId, {
        sourceFileName: parsed.fileName,
        sourceText: parsed.text,
        error: undefined,
      });
    } catch (err: any) {
      updateTopic(topicId, { error: err.message || "Failed to parse file" });
    }
  }, []);

  const handleDragStart = (id: string) => {
    setDragSource(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSource || !expandedId) return;

    const sourceIdx = topics.findIndex((t) => t.id === dragSource);
    const targetIdx = topics.findIndex((t) => t.id === expandedId);

    if (sourceIdx !== -1 && targetIdx !== -1 && sourceIdx !== targetIdx) {
      const newTopics = [...topics];
      [newTopics[sourceIdx], newTopics[targetIdx]] = [newTopics[targetIdx], newTopics[sourceIdx]];
      onTopicsChange(newTopics);
    }

    setDragSource(null);
    setDragOverId(null);
  };

  const retryTopic = (id: string) => {
    updateTopic(id, { status: "pending", progress: 0, error: undefined, result: undefined });
  };

  const getStatusColor = (status: Topic["status"]) => {
    const colors = {
      pending: "bg-slate-100 text-slate-700 border-slate-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      failed: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status];
  };

  const getStatusIcon = (status: Topic["status"]) => {
    const icons = {
      pending: "◦",
      processing: "⟳",
      completed: "✓",
      failed: "✕",
    };
    return icons[status];
  };

  const openFilePicker = (topicId: string) => {
    pendingTopicIdRef.current = topicId;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">Topics ({topics.length})</label>
        <button
          onClick={addTopic}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={13} />
          Add Topic
        </button>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-muted-foreground">
          <p className="text-sm font-medium">No topics added yet</p>
          <p className="text-xs mt-1">Click "Add Topic" to start building your batch</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {topics.map((topic) => (
            <div
              key={topic.id}
              draggable={!disabled}
              onDragStart={() => handleDragStart(topic.id)}
              onDragOver={(e) => handleDragOver(e, topic.id)}
              onDrop={handleDrop}
              onDragLeave={() => setDragOverId(null)}
              className={`rounded-lg border transition-all ${
                dragOverId === topic.id
                  ? "border-primary bg-accent/40 ring-1 ring-primary/30"
                  : "border-border bg-card"
              } ${disabled ? "opacity-60" : "hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2 p-3">
                <GripVertical size={16} className="text-muted-foreground cursor-move" />

                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                    topic.status
                  )}`}
                >
                  <span className="text-xs">{getStatusIcon(topic.status)}</span>
                  <span className="capitalize">{topic.status}</span>
                </div>

                {expandedId !== topic.id && editingId !== topic.id && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {topic.title || <span className="text-muted-foreground">Untitled</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {topic.focusKeyword || "No keyword"}
                    </p>
                  </div>
                )}

                {(topic.status === "processing" || topic.status === "completed") && (
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        topic.status === "completed" ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.max(5, topic.progress)}%` }}
                    />
                  </div>
                )}

                <div className="flex gap-1 shrink-0">
                  {topic.status === "failed" && (
                    <button
                      onClick={() => retryTopic(topic.id)}
                      className="p-1.5 hover:bg-muted rounded text-orange-600 hover:text-orange-700"
                      title="Retry"
                      disabled={disabled}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}

                  <button
                    onClick={() =>
                      expandedId === topic.id ? setExpandedId(null) : setExpandedId(topic.id)
                    }
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                    disabled={disabled}
                  >
                    {expandedId === topic.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <button
                    onClick={() => removeTopic(topic.id)}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-red-600"
                    disabled={disabled}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {expandedId === topic.id && (
                <div className="border-t border-border p-4 space-y-3 bg-muted/30 animate-fade-in">
                  {editingId === topic.id ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Article Topic</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="e.g., Newborn Circumcision Care"
                          className="input"
                          maxLength={200}
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Focus Keyword</label>
                        <input
                          type="text"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          placeholder="e.g., newborn circumcision care"
                          className="input"
                          maxLength={100}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(topic.id)}
                          className="btn-primary flex-1 justify-center"
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-secondary flex-1 justify-center"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-semibold mb-1">Article Topic</p>
                        <p className="text-sm text-foreground">
                          {topic.title || <span className="text-muted-foreground">Not set</span>}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold mb-1">Focus Keyword</p>
                        <p className="text-sm text-foreground">
                          {topic.focusKeyword || <span className="text-muted-foreground">Not set</span>}
                        </p>
                      </div>

                      <button
                        onClick={() => startEdit(topic)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-muted hover:bg-muted/80 text-sm font-medium"
                      >
                        <Edit2 size={13} /> Edit Details
                      </button>
                    </>
                  )}

                  {topic.sourceFileName && (
                    <div className="rounded bg-background border border-border p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <FileText size={13} className="text-primary" />
                        <span className="flex-1 truncate font-medium">{topic.sourceFileName}</span>
                        <button
                          onClick={() =>
                            updateTopic(topic.id, {
                              sourceFileName: undefined,
                              sourceText: undefined,
                            })
                          }
                          className="p-0.5 hover:bg-muted rounded"
                          disabled={disabled}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {topic.sourceText?.length || 0} characters loaded
                      </p>
                    </div>
                  )}

                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file && !disabled) handleFileForTopic(topic.id, file);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors cursor-pointer bg-background"
                    onClick={() => {
                      if (!disabled) openFilePicker(topic.id);
                    }}
                  >
                    <Upload size={16} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-medium">Drop file or click to upload</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      .txt · .md · .docx · .pdf · .html
                    </p>
                  </div>

                  {topic.error && (
                    <div className="flex gap-2 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{topic.error}</span>
                    </div>
                  )}

                  {topic.result && (
                    <div className="rounded bg-background border border-border p-2 max-h-32 overflow-y-auto">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Result</p>
                      <p className="text-xs text-foreground line-clamp-4">{topic.result}</p>
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          const topicId = pendingTopicIdRef.current;
          if (file && topicId) {
            handleFileForTopic(topicId, file);
          }
          pendingTopicIdRef.current = null;
          e.target.value = "";
        }}
        disabled={disabled}
      />
    </div>
  );
}
