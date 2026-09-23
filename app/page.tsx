"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadTab } from "@/components/upload-tab";
import { HistoryTab } from "@/components/history-tab";
import { SettingsTab } from "@/components/settings-tab";
import { DashboardTab } from "@/components/dashboard-tab";
import { Activity, Download, FileText, History, Layers3, LockKeyhole, Settings, Sparkles, BarChart3, Zap } from "lucide-react";

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsInstalled(Boolean(standalone));
    const handleInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    const handleInstalled = () => setIsInstalled(true);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 glass-elevated safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-10 rounded-xl bg-gradient-to-br from-primary via-primary to-teal-700 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 animate-float">
              <FileText className="text-primary-foreground" size={18} aria-hidden="true" />
              <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-amber-400 ring-2 ring-card" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-bold tracking-tight truncate">ChildBloom Studio</h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/10 to-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/10">
                  <Sparkles size={10} /> Pro workspace
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Pediatric content production</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground rounded-full border border-border/80 bg-background/60 px-3 py-1.5">
              <LockKeyhole size={12} className="text-primary" /> Private by design
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/80 dark:border-emerald-900/80 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-1.5">
              <Activity size={12} /> All systems ready
            </div>
            {installPrompt && !isInstalled && (
              <button type="button" onClick={installApp} className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted transition-colors">
                <Download size={13} /><span className="hidden sm:inline">Install app</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden opacity-60">
          <div className="absolute -left-20 -top-28 size-80 rounded-full bg-primary/8 blur-3xl animate-float" />
          <div className="absolute right-0 top-0 size-72 rounded-full bg-amber-400/8 blur-3xl" />
          <div className="absolute left-1/3 top-20 size-60 rounded-full bg-blue-400/5 blur-3xl" />
        </div>

        {/* Hero Section */}
        <section className="mb-7 sm:mb-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Content operations
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-foreground">
              Your content <span className="gradient-text">command center</span>.
            </h2>
            <p className="mt-3 text-sm sm:text-[15px] leading-6 text-muted-foreground max-w-2xl">
              Transform pediatric source material into polished, E-E-A-T aligned articles with a focused single rewrite or a high-throughput multi-topic batch queue with templates, priorities, and analytics.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[333px]">
            <div className="stat-card">
              <Layers3 size={15} className="mb-2 text-primary" />
              <p className="text-sm font-bold">Batch ready</p>
              <p className="text-[11px] text-muted-foreground">CSV/JSON import</p>
            </div>
            <div className="stat-card">
              <FileText size={15} className="mb-2 text-amber-600" />
              <p className="text-sm font-bold">3 formats</p>
              <p className="text-[11px] text-muted-foreground">CMS · Jekyll · MD</p>
            </div>
            <div className="stat-card">
              <LockKeyhole size={15} className="mb-2 text-emerald-600" />
              <p className="text-sm font-bold">Local-first</p>
              <p className="text-[11px] text-muted-foreground">Keys stay local</p>
            </div>
          </div>
        </section>

        {/* Main Tabs */}
        <Tabs defaultTab="dashboard">
          <div className="rounded-2xl border border-border/80 bg-card/70 shadow-[0_18px_50px_-30px_hsl(222_25%_12%_/_0.35)] overflow-hidden backdrop-blur-sm">
            <TabsList className="w-full justify-start gap-1 border-b border-border/70 bg-muted/30 p-2 h-auto rounded-none">
              <TabsTrigger value="dashboard" className="gap-2 rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <BarChart3 size={15} /><span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2 rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <FileText size={15} /><span>Rewrite workspace</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <History size={15} /><span>History</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Settings size={15} /><span>Settings</span>
              </TabsTrigger>
            </TabsList>
            <div className="p-4 sm:p-6 lg:p-8">
              <TabsContent value="dashboard" className="mt-0"><DashboardTab /></TabsContent>
              <TabsContent value="upload" className="mt-0"><UploadTab /></TabsContent>
              <TabsContent value="history" className="mt-0"><HistoryTab /></TabsContent>
              <TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent>
            </div>
          </div>
        </Tabs>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-border/70 bg-card/40 py-4 safe-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>Private browser workspace for <a href="https://childbloom.site" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">childbloom.site</a></p>
          <p>ChildBloom Studio · v2.0 · Built for thoughtful publishing</p>
        </div>
      </footer>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
