"use client";

import { useState, useEffect } from "react";
import { Settings, DEFAULT_SETTINGS } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/history";
import { OpenAIClient } from "@/lib/openai-client";
import { CheckCircle, XCircle, Eye, EyeOff, Server, Key, Cpu, Thermometer, Hash, Shield, AlertTriangle } from "lucide-react";

const CORS_PROVIDERS = [
  { name: "OpenRouter (recommended)", url: "https://openrouter.ai/api/v1", keyHint: "sk-or-..." },
  { name: "OpenAI", url: "https://api.openai.com/v1", keyHint: "sk-..." },
  { name: "Together AI", url: "https://api.together.xyz/v1", keyHint: "..." },
  { name: "GitHub Inference", url: "https://models.github.ai/inference", keyHint: "ghs_...", corsWarning: true },
  { name: "Custom", url: "", keyHint: "" },
];

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "testing" | "success" | "fail">("idle");
  const [testMessage, setTestMessage] = useState("");
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
    setTestMessage("");
    const client = new OpenAIClient(settings);
    const result = await client.testConnection();
    setTestResult(result.ok ? "success" : "fail");
    setTestMessage(result.error || (result.ok ? "Connected successfully!" : "Connection failed"));
    setTimeout(() => setTestResult("idle"), 5000);
  }

  function selectProvider(name: string) {
    const provider = CORS_PROVIDERS.find(p => p.name === name);
    if (provider) {
      updateSettings({ baseUrl: provider.url });
    }
  }

  const selectedProvider = CORS_PROVIDERS.find(p => p.url === settings.baseUrl) || CORS_PROVIDERS.find(p => p.name === "Custom");

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">API Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All settings are stored locally in your browser. Nothing is sent to any server.
        </p>
      </div>

      {/* Quick Provider Select */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Server size={14} />
          API Provider
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CORS_PROVIDERS.map((provider) => (
            <button
              key={provider.name}
              onClick={() => selectProvider(provider.name)}
              className={`px-3 py-2 rounded-lg text-xs transition-all text-left ${
                selectedProvider?.name === provider.name
                  ? "bg-amber-500 text-white shadow-md"
                  : "bg-muted text-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              <span className="block font-semibold">{provider.name}</span>
              {provider.corsWarning && (
                <span className={`text-xs ${selectedProvider?.name === provider.name ? "text-amber-100" : "text-amber-600"}`}>
                  May need proxy
                </span>
              )}
            </button>
          ))}
        </div>
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
            placeholder={selectedProvider?.keyHint || "Enter your API key"}
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
          placeholder="https://openrouter.ai/api/v1"
          className="input font-mono text-sm"
        />
      </div>

      {/* CORS Proxy URL (optional) */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Shield size={14} />
          Custom CORS Proxy (optional)
        </label>
        <input
          type="text"
          value={settings.corsProxyUrl || ""}
          onChange={(e) => updateSettings({ corsProxyUrl: e.target.value })}
          placeholder="https://corsproxy.io/? or https://your-proxy.app/?url="
          className="input font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Required for providers that don't support browser CORS (like GitHub Inference).
          Use a self-hosted proxy or services like corsproxy.io. Leave blank for OpenRouter/OpenAI.
        </p>
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
          placeholder="openai/gpt-4o-mini"
          className="input font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          OpenRouter examples: openai/gpt-4o-mini, anthropic/claude-3.5-sonnet, google/gemini-flash-1.5
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
      <div className="space-y-3">
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

        {/* Test result message */}
        {testResult === "fail" && testMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{testMessage}</p>
              {testMessage.includes("CORS") && (
                <p className="mt-1 text-xs">
                  Tip: Switch to OpenRouter in the Provider dropdown, or set a CORS proxy URL above.
                </p>
              )}
            </div>
          </div>
        )}

        {testResult === "success" && testMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            <CheckCircle size={16} />
            {testMessage}
          </div>
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
            <span>Endpoint: {selectedProvider?.name || "Custom"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${settings.corsProxyUrl ? "bg-green-500" : "bg-yellow-500"}`} />
            <span>Proxy: {settings.corsProxyUrl ? "Set" : "Not set"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
