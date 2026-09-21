// OpenAI-compatible client with streaming + retry logic + CORS proxy fallback
// All calls happen directly from the browser — no server intermediary

import OpenAI from "openai";
import type { Settings } from "./types";

export const DEFAULT_TIMEOUT_MS = 60000; // 60s network timeout per spec

// Timeout for proxy connection attempts (fail fast so user knows quickly)
const PROXY_TIMEOUT_MS = 8000;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onRetry?: (attempt: number, maxRetries: number, reason: string) => void;
}

// ─── Error Classification ─────────────────────────────────────────────────────

export function isCorsError(error: any): boolean {
  if (error instanceof TypeError) {
    const msg = error.message?.toLowerCase() || "";
    return msg.includes("fetch") || msg.includes("network") || msg.includes("cors") || msg.includes("blocked");
  }
  const msg = error.message?.toLowerCase() || "";
  return msg.includes("cors") || msg.includes("cross-origin") || msg.includes("access-control") || msg.includes("tunnel_connection");
}

export function getErrorMessage(error: any): string {
  if (isCorsError(error)) {
    return "API blocks browser requests (CORS). This provider doesn't allow direct browser connections.";
  }
  return error.message || "Unknown error occurred";
}

// ─── Proxy URL Builder ────────────────────────────────────────────────────────

/**
 * Build proxy URL for a given base URL.
 * User's custom proxy takes priority. Format: user appends `{URL}` placeholder
 * or we auto-prepend the proxy URL to the base URL.
 */
function buildProxyUrl(baseUrl: string, proxyUrl: string): string {
  if (!proxyUrl) return baseUrl;
  // If proxy URL has {URL} placeholder, replace it
  if (proxyUrl.includes("{URL}")) {
    return proxyUrl.replace("{URL}", encodeURIComponent(baseUrl));
  }
  // Otherwise, prepend proxy (e.g., https://corsproxy.io/?https://api.example.com/v1)
  return proxyUrl.endsWith("=")
    ? `${proxyUrl}${encodeURIComponent(baseUrl)}`
    : `${proxyUrl}${baseUrl}`;
}

// ─── Client ────────────────────────────────────────────────────────────────────

export class OpenAIClient {
  private client: OpenAI;
  private settings: Settings;
  private usingProxy = false;

  constructor(settings: Settings) {
    this.settings = settings;
    this.client = this.createClient(settings, false);
  }

  private createClient(settings: Settings, useProxy: boolean): OpenAI {
    let baseUrl = settings.baseUrl;
    if (useProxy && settings.corsProxyUrl?.trim()) {
      baseUrl = buildProxyUrl(settings.baseUrl, settings.corsProxyUrl.trim());
    }
    return new OpenAI({
      apiKey: settings.apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
      timeout: DEFAULT_TIMEOUT_MS,
    });
  }

  updateSettings(settings: Settings) {
    this.settings = settings;
    this.usingProxy = false;
    this.client = this.createClient(settings, false);
  }

  async streamRewrite(
    systemPrompt: string,
    userPrompt: string,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const stream = await this.client.chat.completions.create({
          model: this.settings.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: this.settings.temperature,
          max_tokens: this.settings.maxTokens,
          stream: true,
        }, { signal });

        let fullText = "";
        for await (const chunk of stream) {
          if (signal?.aborted) {
            throw new Error("Request cancelled");
          }
          const token = chunk.choices[0]?.delta?.content || "";
          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }
        }

        callbacks.onComplete(fullText);
        return fullText;

      } catch (error: any) {
        lastError = error;

        // Handle specific error types
        if (error.name === "AbortError" || signal?.aborted) {
          throw new Error("Request cancelled");
        }

        if (error.status === 401) {
          callbacks.onError(new Error("Invalid API key. Please check your settings."));
          throw error;
        }

        if (error.status === 404) {
          callbacks.onError(new Error(`Model "${this.settings.model}" not found. Check the model name.`));
          throw error;
        }

        if (error.status === 429) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            callbacks.onRetry?.(attempt, maxRetries, "Rate limited");
            await sleep(delay);
            continue;
          }
        }

        if (error.status >= 500) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            callbacks.onRetry?.(attempt, maxRetries, "Server error");
            await sleep(delay);
            continue;
          }
        }

        // CORS / network errors — try proxy fallback
        if (isCorsError(error) && !this.usingProxy && this.settings.corsProxyUrl?.trim()) {
          this.usingProxy = true;
          this.client = this.createClient(this.settings, true);
          callbacks.onRetry?.(attempt, maxRetries, "CORS blocked — trying proxy");
          await sleep(500);
          continue;
        }

        // CORS error with no proxy configured — give actionable error
        if (isCorsError(error)) {
          const proxyHint = this.settings.corsProxyUrl?.trim()
            ? "Your proxy is also failing. Try a different proxy or use a CORS-enabled provider."
            : "Set a custom CORS proxy in Settings, or use a CORS-enabled provider like OpenRouter, OpenAI, or Together AI.";
          callbacks.onError(new Error(
            `CORS blocked: ${this.settings.baseUrl} doesn't allow browser requests. ${proxyHint}`
          ));
          throw error;
        }

        // Timeout errors — try proxy if available
        if ((error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) && !this.usingProxy && this.settings.corsProxyUrl?.trim()) {
          this.usingProxy = true;
          this.client = this.createClient(this.settings, true);
          callbacks.onRetry?.(attempt, maxRetries, "Timeout — trying proxy");
          await sleep(500);
          continue;
        }

        // For other errors, throw immediately
        const message = error.message || "Unknown error occurred";
        callbacks.onError(new Error(message));
        throw error;
      }
    }

    callbacks.onError(lastError || new Error("Max retries exceeded"));
    throw lastError;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client.chat.completions.create({
        model: this.settings.model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5,
      });
      return { ok: true };
    } catch (err: any) {
      if (isCorsError(err)) {
        return {
          ok: false,
          error: "CORS blocked. This provider doesn't allow browser requests. Use OpenRouter or set a proxy in Settings."
        };
      }
      return { ok: false, error: err.message || "Connection failed" };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
