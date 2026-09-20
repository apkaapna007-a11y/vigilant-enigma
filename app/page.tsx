"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadTab } from "@/components/upload-tab";
import { HistoryTab } from "@/components/history-tab";
import { SettingsTab } from "@/components/settings-tab";
import { Baby, Upload, Clock, Settings, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                <Baby className="text-white" size={22} />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">ChildBloom Rewriter</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" />
                AI-powered pediatric content studio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              v1.0 • Client-side only
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <Tabs defaultTab="upload">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-muted/50 border p-1">
              <TabsTrigger value="upload" className="gap-2">
                <Upload size={15} />
                <span>Rewrite</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock size={15} />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings size={15} />
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

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground">
            ChildBloom Rewriter — Pure client-side. Your API key never leaves your browser.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Built for{" "}
            <a
              href="https://childbloom.site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              childbloom.site
            </a>
            {" "}• Powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
}
