// OpenAI-compatible client with streaming + retry logic
// All calls happen directly from the browser — no server intermediary

import OpenAI from "openai";
import type { Settings } from "./types";

export const DEFAULT_TIMEOUT_MS = 60000; // 60s network timeout per spec

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

  constructor(settings: Settings) {
    this.settings = settings;
    this.client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl,
      dangerouslyAllowBrowser: true, // Required for browser usage
      timeout: DEFAULT_TIMEOUT_MS,
    });
  }

  updateSettings(settings: Settings) {
    this.settings = settings;
    this.client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl,
      dangerouslyAllowBrowser: true,
      timeout: DEFAULT_TIMEOUT_MS,
    });
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

        // Timeout / network / CORS errors
        if (isCorsError(error)) {
          callbacks.onError(new Error(getErrorMessage(error)));
          throw error;
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
