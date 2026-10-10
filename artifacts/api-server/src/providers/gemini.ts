import { buildBriefingPrompt, fetchProvider, parseBriefingJson, providerError } from "./shared";
import type { BriefingProvider } from "./types";

export const geminiProvider: BriefingProvider = {
  async generate(analytics, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetchProvider("Gemini", url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildBriefingPrompt(analytics) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) await providerError("Gemini", response);
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
    if (!text) throw new Error("Gemini returned no briefing text");
    return parseBriefingJson(text);
  },
};