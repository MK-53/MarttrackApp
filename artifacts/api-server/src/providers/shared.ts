import type { BriefingAnalytics } from "./types";
import type { BusinessBriefingResponse } from "../../../../lib/api-zod/src/generated/types/businessBriefingResponse";

export class ProviderRequestError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number | undefined,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = "ProviderRequestError";
  }
}

export const fetchProvider = async (
  provider: string,
  input: string,
  init: RequestInit,
): Promise<Response> => {
  try {
    return await fetch(input, init);
  } catch {
    throw new ProviderRequestError(
      provider,
      undefined,
      `Couldn't reach ${provider}. Check your internet connection and try again.`,
    );
  }
};

export const buildBriefingPrompt = (analytics: BriefingAnalytics) => `
You are a practical business adviser for a small Nigerian shop owner.
Use the shop data below to write a concise briefing in plain, encouraging language.
Focus on concrete actions: what to restock, what to watch, how to prepare for the next festival,
and where a supplier quote could save money.

Return JSON only, with this exact shape:
{"summary":"one short paragraph","recommendations":["action 1","action 2","action 3"]}

Shop data:
${JSON.stringify(analytics)}
`;

export const parseBriefingJson = (text: string): BusinessBriefingResponse => {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed: unknown = JSON.parse(withoutFence);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { summary?: unknown }).summary !== "string" ||
    !Array.isArray((parsed as { recommendations?: unknown }).recommendations) ||
    !(parsed as { recommendations: unknown[] }).recommendations.every(
      recommendation => typeof recommendation === "string",
    )
  ) {
    throw new Error("AI provider returned an invalid briefing shape");
  }

  return {
    summary: (parsed as { summary: string }).summary.trim(),
    recommendations: (parsed as { recommendations: string[] }).recommendations
      .map(recommendation => recommendation.trim())
      .filter(Boolean)
      .slice(0, 5),
  };
};

export const providerError = async (provider: string, response: Response) => {
  let providerDetail = "";
  try {
    const body = await response.json() as {
      error?: { message?: string; code?: string; status?: string };
      message?: string;
      code?: string;
      status?: string;
    };
    providerDetail = [
      body.error?.message,
      body.error?.code,
      body.error?.status,
      body.message,
      body.code,
      body.status,
    ].filter(Boolean).join(" ").toLowerCase();
  } catch {
    // Provider response content is used only for safe error classification.
  }

  const status = response.status;
  let userMessage: string;
  if (
    status === 401 ||
    status === 403 ||
    /api.?key|unauthorized|permission_denied/.test(providerDetail)
  ) {
    userMessage = `The ${provider} API key was rejected. Check that the key in Settings belongs to the selected provider and is active.`;
  } else if (
    status === 429 ||
    /quota|rate.?limit|resource_exhausted|billing/.test(providerDetail)
  ) {
    userMessage = `${provider} has reached a usage limit. Check your provider account's quota or billing, then try again.`;
  } else if (status >= 500) {
    userMessage = `${provider} is temporarily unavailable. Try again shortly.`;
  } else {
    userMessage = `${provider} rejected the briefing request. Check the provider selected in Settings and try again.`;
  }

  throw new ProviderRequestError(provider, status, userMessage);
};