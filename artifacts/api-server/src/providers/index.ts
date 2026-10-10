import type { BriefingProvider } from "./types";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";

const PROVIDERS: Record<string, BriefingProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  openai: openaiProvider,
};

export function getProvider(name: string): BriefingProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown AI provider: ${name}`);
  return provider;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("No API key on file for this provider. Add one in Settings → AI Briefing.");
    this.name = "MissingApiKeyError";
  }
}

export function resolveApiKey(userApiKey: string | undefined): string {
  const trimmed = userApiKey?.trim();
  if (!trimmed) throw new MissingApiKeyError();
  return trimmed;
}