// OpenAI-compatible client with streaming + retry logic + CORS proxy fallback
// All calls happen directly from the browser — no server intermediary

import OpenAI from "openai";
import type { Settings } from "./types";

export const DEFAULT_TIMEOUT_MS = 60000; // 60s network timeout per spec

// Free CORS proxies to try when direct API calls are blocked
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${url}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onRetry?: (attempt: number, maxRetries: number) => void;
}

// ─── Error Classification ─────────────────────────────────────────────────────

export function isCorsError(error: any): boolean {
  // CORS errors typically manifest as TypeError with no status code
  // or as a fetch failure with specific message patterns
  if (error instanceof TypeError) {
    const msg = error.message?.toLowerCase() || "";
    return msg.includes("fetch") || msg.includes("network") || msg.includes("cors") || msg.includes("blocked");
  }
  const msg = error.message?.toLowerCase() || "";
  return msg.includes("cors") || msg.includes("cross-origin") || msg.includes("access-control");
}

export function getErrorMessage(error: any): string {
  if (isCorsError(error)) {
    return "API blocks browser requests (CORS). Try a different provider or use a CORS proxy.";
  }
  return error.message || "Unknown error occurred";
}

// ─── Client ────────────────────────────────────────────────────────────────────

export class OpenAIClient {
  private client: OpenAI;
  private settings: Settings;
  private proxyIndex = -1; // -1 = direct, 0+ = proxy index

  constructor(settings: Settings) {
    this.settings = settings;
    this.client = this.createClient(settings);
  }

  private createClient(settings: Settings, proxyIdx: number = -1): OpenAI {
    let baseUrl = settings.baseUrl;
    if (proxyIdx >= 0 && proxyIdx < CORS_PROXIES.length) {
      baseUrl = CORS_PROXIES[proxyIdx](baseUrl);
    }
    return new OpenAI({
      apiKey: settings.apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true, // Required for browser usage
      timeout: DEFAULT_TIMEOUT_MS,
    });
  }

  updateSettings(settings: Settings) {
    this.settings = settings;
    this.proxyIndex = -1;
    this.client = this.createClient(settings);
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
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            callbacks.onRetry?.(attempt, maxRetries);
            await sleep(delay);
            continue;
          }
        }

        if (error.status >= 500) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            callbacks.onRetry?.(attempt, maxRetries);
            await sleep(delay);
            continue;
          }
        }

        // CORS / network errors — try proxy fallback
        if (isCorsError(error)) {
          const nextProxy = this.proxyIndex + 1;
          if (nextProxy < CORS_PROXIES.length) {
            this.proxyIndex = nextProxy;
            this.client = this.createClient(this.settings, nextProxy);
            callbacks.onRetry?.(attempt, maxRetries);
            // Brief delay before proxy retry
            await sleep(500);
            continue;
          }
          // All proxies exhausted
          callbacks.onError(new Error(
            "API blocks browser requests (CORS). All proxy attempts failed. " +
            "Try a CORS-enabled provider like OpenAI, or set up your own proxy."
          ));
          throw error;
        }

        // Timeout errors — try proxy as last resort
        if (error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) {
          const nextProxy = this.proxyIndex + 1;
          if (nextProxy < CORS_PROXIES.length) {
            this.proxyIndex = nextProxy;
            this.client = this.createClient(this.settings, nextProxy);
            callbacks.onRetry?.(attempt, maxRetries);
            await sleep(500);
            continue;
          }
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

  async testConnection(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.settings.model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
