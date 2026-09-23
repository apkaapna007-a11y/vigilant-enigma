"use client";

import { useState } from "react";
import { Topic, TopicTemplate, TopicCategory, DEFAULT_TEMPLATES, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/types";
import { BookOpen, ChevronRight, Check, Plus, Search, Filter, Sparkles } from "lucide-react";

interface TopicTemplatesProps {
  onApplyTemplate: (topics: Topic[]) => void;
  disabled?: boolean;
}

export function TopicTemplates({ onApplyTemplate, disabled = false }: TopicTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TopicTemplate | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<TopicCategory | "all">("all");

  const generateId = () => `topic_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const filteredTemplates = DEFAULT_TEMPLATES.filter(t => {
    const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: TopicTemplate) => {
    setSelectedTemplate(template);
    setSelectedTopics(new Set(template.topics.map((_, i) => i)));
  };

  const handleApply = () => {
    if (!selectedTemplate) return;
    const topics: Topic[] = Array.from(selectedTopics)
      .map(idx => selectedTemplate.topics[idx])
      .filter(Boolean)
      .map(item => ({
        id: generateId(),
        title: item.title,
        focusKeyword: item.focusKeyword,
        status: "pending" as const,
        progress: 0,
        priority: "normal" as const,
        category: selectedTemplate.category,
        createdAt: new Date().toISOString(),
        tags: item.tags,
        templateId: selectedTemplate.id,
      }));
    onApplyTemplate(topics);
    setSelectedTemplate(null);
    setSelectedTopics(new Set());
  };

  const toggleTopicSelection = (idx: number) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (selectedTemplate) {
    return (
      <section className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => setSelectedTemplate(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
              <ChevronRight size={12} className="rotate-180" /> Back to templates
            </button>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span>{selectedTemplate.icon}</span>
              {selectedTemplate.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedTemplate.description}</p>
          </div>
          <span className="badge bg-primary/10 text-primary border-primary/20">
            {selectedTopics.size}/{selectedTemplate.topics.length} selected
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {selectedTemplate.topics.map((item, idx) => (
            <label
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedTopics.has(idx)
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTopics.has(idx)}
                onChange={() => toggleTopicSelection(idx)}
                className="mt-0.5 rounded border-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Keyword: {item.focusKeyword}
                </p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTopics(new Set(selectedTemplate.topics.map((_, i) => i)))}
            className="btn-ghost text-xs"
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedTopics(new Set())}
            className="btn-ghost text-xs"
          >
            Deselect All
          </button>
          <button
            onClick={handleApply}
            disabled={selectedTopics.size === 0 || disabled}
            className="btn-primary ml-auto"
          >
            <Plus size={13} /> Add {selectedTopics.size} Topics
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BookOpen size={14} className="text-primary" />
            Topic Templates
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Pre-built topic bundles for common pediatric content</p>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="input pl-8 text-xs py-2"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as TopicCategory | "all")}
          className="input text-xs py-2 w-auto min-w-[130px]"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            disabled={disabled}
            className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all group disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">{template.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {template.topics.length} topics
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {CATEGORY_LABELS[template.category]}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Sparkles size={20} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No templates match your search</p>
        </div>
      )}
    </section>
  );
}

export default TopicTemplates;
