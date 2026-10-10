import { buildBriefingPrompt, fetchProvider, parseBriefingJson, providerError } from "./shared";
import type { BriefingProvider } from "./types";

export const anthropicProvider: BriefingProvider = {
  async generate(analytics, apiKey) {
    const response = await fetchProvider("Anthropic", "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 700,
        messages: [{ role: "user", content: buildBriefingPrompt(analytics) }],
      }),
    });
    if (!response.ok) await providerError("Anthropic", response);
    const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    const text = data.content?.find(block => block.type === "text")?.text;
    if (!text) throw new Error("Anthropic returned no briefing text");
    return parseBriefingJson(text);
  },
};