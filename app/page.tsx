"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadTab } from "@/components/upload-tab";
import { HistoryTab } from "@/components/history-tab";
import { SettingsTab } from "@/components/settings-tab";
import { FileText, History, Settings, Download, Shield } from "lucide-react";

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <FileText className="text-primary-foreground" size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight truncate">ChildBloom Studio</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block leading-none">
                Pediatric content production
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground rounded-md border border-border px-2.5 py-1">
              <Shield size={12} className="text-primary" aria-hidden="true" />
              Client-side · keys stay local
            </div>
            {installPrompt && !isInstalled && (
              <button
                onClick={installApp}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-border bg-card px-2.5 py-1.5 hover:bg-muted transition-colors"
              >
                <Download size={13} aria-hidden="true" />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Content workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Rewrite or generate E-E-A-T pediatric articles. Output is CMS-ready HTML, Chirpy Markdown, or clean Markdown.
          </p>
        </div>

        <Tabs defaultTab="upload">
          <div className="mb-6 border-b border-border">
            <TabsList className="w-full sm:w-auto bg-transparent p-0 h-auto gap-0 rounded-none border-0">
              <TabsTrigger
                value="upload"
                className="gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm"
              >
                <FileText size={15} aria-hidden="true" />
                <span>Rewrite</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm"
              >
                <History size={15} aria-hidden="true" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm"
              >
                <Settings size={15} aria-hidden="true" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload">
            <UploadTab />
          </TabsContent>
          <TabsContent value="history">
            <HistoryTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-4 safe-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>
            Private browser workspace for{" "}
            <a
              href="https://childbloom.site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              childbloom.site
            </a>
          </p>
          <p>ChildBloom Studio · v1.2</p>
        </div>
      </footer>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
