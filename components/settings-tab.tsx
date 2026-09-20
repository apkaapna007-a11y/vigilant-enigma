"use client";

import { useState, useEffect } from "react";
import { Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/history";
import { OpenAIClient } from "@/lib/openai-client";
import { CheckCircle, XCircle, Eye, EyeOff, Server, Key, Cpu, Thermometer, Hash } from "lucide-react";

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "testing" | "success" | "fail">("idle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedSettings = getSettings();
    if (savedSettings) setSettings(savedSettings);
  }, []);

  function updateSettings(partial: Partial<Settings>) {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    setTestResult("testing");
    const client = new OpenAIClient(settings);
    const ok = await client.testConnection();
    setTestResult(ok ? "success" : "fail");
    setTimeout(() => setTestResult("idle"), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">API Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All settings are stored locally in your browser. Nothing is sent to any server.
        </p>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Key size={14} />
          API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder="sk-..."
            className="input pr-10 font-mono text-sm"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Server size={14} />
          Base URL
        </label>
        <input
          type="text"
          value={settings.baseUrl}
          onChange={(e) => updateSettings({ baseUrl: e.target.value })}
          placeholder="https://models.github.ai/inference"
          className="input font-mono text-sm"
        />
      </div>

      {/* Model */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Cpu size={14} />
          Model Name
        </label>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => updateSettings({ model: e.target.value })}
          placeholder="openai/gpt-4.1"
          className="input font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Examples: gpt-4.1, gpt-4o, claude-sonnet-4-20250514, gemini-1.5-pro
        </p>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Thermometer size={14} />
          Temperature: {settings.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={settings.temperature}
          onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Precise</span>
          <span>Balanced</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Hash size={14} />
          Max Tokens: {settings.maxTokens.toLocaleString()}
        </label>
        <input
          type="range"
          min={4000}
          max={90000}
          step={1000}
          value={settings.maxTokens}
          onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>4K</span>
          <span>47K</span>
          <span>90K</span>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-3">
        <button
          onClick={testConnection}
          disabled={!settings.apiKey || testResult === "testing"}
          className="btn-secondary"
        >
          {testResult === "testing" ? "Testing..." : "Test Connection"}
        </button>
        {testResult === "success" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={16} /> Connected
          </span>
        )}
        {testResult === "fail" && (
          <span className="flex items-center gap-1 text-sm text-red-600">
            <XCircle size={16} /> Failed
          </span>
        )}
        {saved && (
          <span className="text-sm text-green-600">Saved</span>
        )}
      </div>

      {/* Status Card */}
      <div className="card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Configuration Status</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${settings.apiKey ? "bg-green-500" : "bg-red-500"}`} />
            <span>API Key: {settings.apiKey ? "Set" : "Not set"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${settings.model ? "bg-green-500" : "bg-red-500"}`} />
            <span>Model: {settings.model || "Not set"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${settings.baseUrl ? "bg-green-500" : "bg-red-500"}`} />
            <span>Endpoint: {settings.baseUrl ? "Set" : "Not set"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Temp: {settings.temperature.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
