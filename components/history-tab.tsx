"use client";

import { useState, useEffect } from "react";
import { getHistory, deleteFromHistory, clearHistory, formatFileSize, countWords } from "@/lib/history";
import type { ArticleRecord } from "@/lib/types";
import { Search, Trash2, Eye, Copy, Download, X, FileText } from "lucide-react";

export function HistoryTab() {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ArticleRecord | null>(null);

  useEffect(() => {
    setArticles(getHistory());
  }, []);

  function refresh() {
    setArticles(getHistory());
  }

  function handleDelete(id: string) {
    deleteFromHistory(id);
    refresh();
  }

  function handleClearAll() {
    if (confirm("Delete all history? This cannot be undone.")) {
      clearHistory();
      refresh();
    }
  }

  function copyArticle(text: string) {
    navigator.clipboard.writeText(text);
  }

  function downloadArticle(article: ArticleRecord) {
    const ext = article.outputFormat === "cms-html" ? "html" : "md";
    const blob = new Blob([article.rewrittenText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rewritten_${article.fileName.replace(/\.[^.]+$/, "")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = articles.filter(
    (a) =>
      a.fileName.toLowerCase().includes(search.toLowerCase()) ||
      a.rewrittenText.toLowerCase().includes(search.toLowerCase())
  );

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText size={24} />
        </div>
        <p className="text-lg font-medium">No articles yet</p>
        <p className="text-sm">Upload and rewrite your first article to see it here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Search & Actions */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="input pl-9"
          />
        </div>
        <button onClick={handleClearAll} className="btn-secondary text-red-600 hover:bg-red-50">
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      {/* Article List */}
      <div className="space-y-3">
        {filtered.map((article) => (
          <div
            key={article.id}
            className="card p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{article.fileName}</h3>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  <span>{article.wordCount.toLocaleString()} words</span>
                  <span className="capitalize">{article.mode}</span>
                  <span>{article.outputFormat}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setViewing(article)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
                  <Eye size={14} />
                </button>
                <button onClick={() => copyArticle(article.rewrittenText)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
                  <Copy size={14} />
                </button>
                <button onClick={() => downloadArticle(article)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
                  <Download size={14} />
                </button>
                <button onClick={() => handleDelete(article.id)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-card rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">{viewing.fileName}</h3>
              <button onClick={() => setViewing(null)} className="p-2 hover:bg-muted rounded-md">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-sans">{viewing.rewrittenText}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
