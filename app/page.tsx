"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadTab } from "@/components/upload-tab";
import { HistoryTab } from "@/components/history-tab";
import { SettingsTab } from "@/components/settings-tab";
import { Baby, Upload, Clock, Settings, Sparkles, Download, Wifi } from "lucide-react";

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsInstalled(Boolean(standalone));
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", () => setIsInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col app-shell">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Baby className="text-primary-foreground" size={22} aria-hidden="true" />
              </div>
              <span className="absolute -right-1 -top-1 size-3.5 rounded-full border-2 border-background bg-emerald-500" aria-label="Ready" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-lg font-bold tracking-tight">ChildBloom Rewriter</h1>
              <p className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles size={11} className="text-primary" aria-hidden="true" />
                A calmer way to create trusted pediatric content
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
              <Wifi size={12} className="text-emerald-600" aria-hidden="true" />
              Ready to work offline
            </div>
            {installPrompt && !isInstalled && (
              <button onClick={installApp} className="btn-secondary text-xs sm:text-sm" aria-label="Install ChildBloom app">
                <Download size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Install app</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-7 max-w-3xl">
          <p className="eyebrow">Content studio / Private by design</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">Turn a topic into something parents can trust.</h2>
          <p className="mt-3 text-sm sm:text-base leading-7 text-muted-foreground max-w-2xl">Shape evidence-based pediatric content with a focused workflow that stays close at hand, even when you&apos;re offline.</p>
        </div>

        <Tabs defaultTab="upload">
          <div className="mb-6 overflow-x-auto pb-1">
            <TabsList className="w-full sm:w-auto bg-card/70 border border-border/70 p-1 shadow-sm">
              <TabsTrigger value="upload" className="gap-2 flex-1 sm:flex-none"><Upload size={15} aria-hidden="true" /><span>Rewrite</span></TabsTrigger>
              <TabsTrigger value="history" className="gap-2 flex-1 sm:flex-none"><Clock size={15} aria-hidden="true" /><span>History</span></TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 flex-1 sm:flex-none"><Settings size={15} aria-hidden="true" /><span>Settings</span></TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="upload"><UploadTab /></TabsContent>
          <TabsContent value="history"><HistoryTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/70 py-5 safe-bottom">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>Private in your browser. Built for <a href="https://childbloom.site" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">childbloom.site</a>.</p>
          <p>ChildBloom Rewriter <span aria-hidden="true">•</span> v1.1</p>
        </div>
      </footer>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

