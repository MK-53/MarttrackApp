import { buildBriefingPrompt, fetchProvider, parseBriefingJson, providerError } from "./shared";
import type { BriefingProvider } from "./types";

export const openaiProvider: BriefingProvider = {
  async generate(analytics, apiKey) {
    const response = await fetchProvider("OpenAI", "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return only the requested JSON object. Do not use markdown.",
          },
          { role: "user", content: buildBriefingPrompt(analytics) },
        ],
      }),
    });
    if (!response.ok) await providerError("OpenAI", response);
    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("OpenAI returned no briefing text");
    return parseBriefingJson(text);
  },
};