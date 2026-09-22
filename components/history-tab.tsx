"use client";

import { useState, useEffect } from "react";
import { getHistory, deleteFromHistory, clearHistory } from "@/lib/history";
import type { ArticleRecord } from "@/lib/types";
import { Search, Trash2, Eye, Copy, Download, X, FileText, CheckCircle2 } from "lucide-react";

export function HistoryTab() {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ArticleRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setArticles(getHistory());
  }, []);

  function refresh() {
    setArticles(getHistory());
  }

  function handleDelete(id: string) {
    deleteFromHistory(id);
    if (viewing?.id === id) setViewing(null);
    refresh();
  }

  function handleClearAll() {
    if (confirm("Delete all history? This cannot be undone.")) {
      clearHistory();
      setViewing(null);
      refresh();
    }
  }

  async function copyArticle(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  function downloadArticle(article: ArticleRecord) {
    const ext = article.outputFormat === "cms-html" ? "html" : "md";
    const mime = article.outputFormat === "cms-html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8";
    const blob = new Blob([article.rewrittenText], { type: mime });
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
      a.rewrittenText.toLowerCase().includes(search.toLowerCase()) ||
      a.originalText.toLowerCase().includes(search.toLowerCase())
  );

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText size={24} />
        </div>
        <p className="text-lg font-medium">No articles yet</p>
        <p className="text-sm">Generate or rewrite your first article to see it here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
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

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {articles.length} articles · stored locally in your browser
      </p>

      <div className="space-y-3">
        {filtered.map((article) => (
          <div key={article.id} className="card p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{article.fileName}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  <span>{article.wordCount.toLocaleString()} words</span>
                  <span className="capitalize">{article.mode}</span>
                  <span>{article.outputFormat}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setViewing(article)}
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="View"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => copyArticle(article.id, article.rewrittenText)}
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Copy"
                >
                  {copiedId === article.id ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => downloadArticle(article)}
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-card rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b gap-2">
              <h3 className="font-medium truncate">{viewing.fileName}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyArticle(viewing.id, viewing.rewrittenText)}
                  className="p-2 hover:bg-muted rounded-md"
                  aria-label="Copy"
                >
                  {copiedId === viewing.id ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
                <button onClick={() => setViewing(null)} className="p-2 hover:bg-muted rounded-md" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {viewing.outputFormat === "cms-html" ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: viewing.rewrittenText }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{viewing.rewrittenText}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
