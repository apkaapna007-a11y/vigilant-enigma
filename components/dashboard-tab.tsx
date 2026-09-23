"use client";

import { useState, useEffect, useMemo } from "react";
import { getHistory } from "@/lib/history";
import type { ArticleRecord, DashboardStats } from "@/lib/types";
import {
  BarChart3, FileText, TrendingUp, Clock, Award, Layers,
  ArrowUpRight, ArrowDownRight, PieChart, Activity, Zap,
  BookOpen, Target, Calendar, Hash
} from "lucide-react";

export function DashboardTab() {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);

  useEffect(() => {
    setArticles(getHistory());
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    const totalArticles = articles.length;
    const totalWords = articles.reduce((sum, a) => sum + a.wordCount, 0);
    const avgWordCount = totalArticles > 0 ? Math.round(totalWords / totalArticles) : 0;
    const totalBatches = new Set(articles.map(a => a.createdAt.slice(0, 10))).size;

    const completed = articles.filter(a => a.wordCount > 0).length;
    const successRate = totalArticles > 0 ? Math.round((completed / totalArticles) * 100) : 0;

    // Category analysis
    const categoryMap = new Map<string, number>();
    articles.forEach(a => {
      const cat = a.topicCategory || "general";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity (last 7 days)
    const now = new Date();
    const recentActivity: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = articles.filter(a => a.createdAt.slice(0, 10) === dateStr).length;
      recentActivity.push({ date: dateStr, count });
    }

    // Mode distribution
    const modeDistribution = {
      contentforge: articles.filter(a => a.mode === "contentforge").length,
      "claude-seo": articles.filter(a => a.mode === "claude-seo").length,
    };

    // Format distribution
    const formatDistribution = {
      "cms-html": articles.filter(a => a.outputFormat === "cms-html").length,
      chirpy: articles.filter(a => a.outputFormat === "chirpy").length,
      "clean-md": articles.filter(a => a.outputFormat === "clean-md").length,
    };

    return { totalArticles, totalWords, avgWordCount, totalBatches, successRate, topCategories, recentActivity, modeDistribution, formatDistribution };
  }, [articles]);

  const maxActivity = Math.max(...stats.recentActivity.map(d => d.count), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your content production pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-primary/10 text-primary border-primary/20">
            <Activity size={11} /> Live
          </span>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<FileText size={18} />}
          label="Total Articles"
          value={stats.totalArticles.toLocaleString()}
          trend={stats.totalArticles > 0 ? "+active" : "No data"}
          trendUp={stats.totalArticles > 0}
          color="primary"
        />
        <StatCard
          icon={<Hash size={18} />}
          label="Total Words"
          value={stats.totalWords > 1000 ? `${(stats.totalWords / 1000).toFixed(1)}K` : stats.totalWords.toString()}
          trend={`Avg ${stats.avgWordCount.toLocaleString()}`}
          trendUp={true}
          color="amber"
        />
        <StatCard
          icon={<Award size={18} />}
          label="Success Rate"
          value={`${stats.successRate}%`}
          trend={stats.successRate >= 80 ? "Excellent" : stats.successRate >= 50 ? "Good" : "Needs attention"}
          trendUp={stats.successRate >= 50}
          color="success"
        />
        <StatCard
          icon={<Layers size={18} />}
          label="Active Days"
          value={stats.totalBatches.toString()}
          trend="Publishing days"
          trendUp={true}
          color="blue"
        />
      </div>

      {/* Activity Chart + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 size={15} className="text-primary" />
                Publishing Activity
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={12} />
              {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </div>
          </div>
          <div className="flex items-end gap-2 h-36">
            {stats.recentActivity.map((day, i) => {
              const height = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
              const dayLabel = new Date(day.date).toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground">{day.count || ""}</span>
                  <div className="w-full relative rounded-t-md overflow-hidden bg-muted/50" style={{ height: "100px" }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.max(height, day.count > 0 ? 8 : 0)}%`,
                        background: day.count > 0
                          ? "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))"
                          : "transparent",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <PieChart size={15} className="text-amber-500" />
            Mode Distribution
          </h3>
          <div className="space-y-4">
            <DistributionBar
              label="ContentForge SEO"
              count={stats.modeDistribution.contentforge}
              total={stats.totalArticles}
              color="primary"
            />
            <DistributionBar
              label="Claude SEO"
              count={stats.modeDistribution["claude-seo"]}
              total={stats.totalArticles}
              color="amber"
            />
            <div className="divider-premium my-3" />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output Formats</h4>
            <DistributionBar
              label="CMS HTML"
              count={stats.formatDistribution["cms-html"]}
              total={stats.totalArticles}
              color="blue"
            />
            <DistributionBar
              label="Chirpy Jekyll"
              count={stats.formatDistribution.chirpy}
              total={stats.totalArticles}
              color="success"
            />
            <DistributionBar
              label="Clean Markdown"
              count={stats.formatDistribution["clean-md"]}
              total={stats.totalArticles}
              color="muted"
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Categories + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Categories */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Target size={15} className="text-primary" />
            Top Categories
          </h3>
          {stats.topCategories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No categories yet</p>
              <p className="text-xs mt-1">Start creating articles to see category breakdown</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topCategories.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{cat.category}</span>
                      <span className="text-xs text-muted-foreground">{cat.count} articles</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(cat.count / stats.totalArticles) * 100}%`,
                          background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--glow-amber)))`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Zap size={15} className="text-amber-500" />
            Quick Insights
          </h3>
          <div className="space-y-3">
            <InsightRow
              icon={<TrendingUp size={14} />}
              label="Avg. words per article"
              value={stats.avgWordCount.toLocaleString()}
              color="primary"
            />
            <InsightRow
              icon={<Clock size={14} />}
              label="Total content produced"
              value={`${(stats.totalWords / 1000).toFixed(1)}K words`}
              color="amber"
            />
            <InsightRow
              icon={<FileText size={14} />}
              label="Most used format"
              value={getMostUsedFormat(stats.formatDistribution)}
              color="blue"
            />
            <InsightRow
              icon={<Award size={14} />}
              label="Preferred writing mode"
              value={stats.modeDistribution.contentforge >= stats.modeDistribution["claude-seo"] ? "ContentForge SEO" : "Claude SEO"}
              color="success"
            />
            {stats.totalArticles === 0 && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary font-medium">Get started!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first article in the Rewrite workspace to see analytics populate here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components

function StatCard({ icon, label, value, trend, trendUp, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  color: "primary" | "amber" | "success" | "blue";
}) {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    amber: "text-amber-600 bg-amber-50",
    success: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
  };

  return (
    <div className="stat-card">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <div className="flex items-center gap-1 mt-2">
        {trendUp ? (
          <ArrowUpRight size={11} className="text-emerald-500" />
        ) : (
          <ArrowDownRight size={11} className="text-red-500" />
        )}
        <span className={`text-[11px] font-medium ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function DistributionBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: "primary" | "amber" | "blue" | "success" | "muted";
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColors = {
    primary: "bg-primary",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    success: "bg-emerald-500",
    muted: "bg-muted-foreground/40",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">{count} ({percentage}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function InsightRow({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "primary" | "amber" | "blue" | "success";
}) {
  const iconColors = {
    primary: "text-primary",
    amber: "text-amber-500",
    blue: "text-blue-500",
    success: "text-emerald-500",
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`${iconColors[color]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <span className="text-sm font-semibold truncate">{value}</span>
    </div>
  );
}

function getMostUsedFormat(dist: { "cms-html": number; chirpy: number; "clean-md": number }): string {
  const entries = Object.entries(dist) as [string, number][];
  const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0] as [string, number]);
  if (max[1] === 0) return "None yet";
  const labels: Record<string, string> = { "cms-html": "CMS HTML", chirpy: "Chirpy Jekyll", "clean-md": "Clean Markdown" };
  return labels[max[0]] || max[0];
}
