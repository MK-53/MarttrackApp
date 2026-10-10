import { Router, type IRouter } from "express";
import {
  CreateBusinessBriefingBody,
  CreateBusinessBriefingResponse,
} from "@workspace/api-zod";
import { db, briefingsTable } from "@workspace/db";
import { getProvider, resolveApiKey, MissingApiKeyError } from "../providers";
import { ProviderRequestError } from "../providers/shared";

const router: IRouter = Router();

router.post("/business-briefing", async (req, res) => {
  const rawBody = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const rawApiKey = typeof rawBody.userApiKey === "string" ? rawBody.userApiKey : undefined;

  let apiKey: string;
  try {
    apiKey = resolveApiKey(rawApiKey);
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return res.status(400).json({ error: error.message, code: "MISSING_API_KEY" });
    }
    throw error;
  }

  const parsed = CreateBusinessBriefingBody.safeParse(rawBody);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      code: "INVALID_REQUEST",
      issues: parsed.error.issues,
    });
  }

  const { provider: providerName, userApiKey: _userApiKey, ...analytics } = parsed.data;

  let validated;
  try {
    const provider = getProvider(providerName);
    const result = await provider.generate(analytics, apiKey);
    validated = CreateBusinessBriefingResponse.parse(result);
  } catch (error) {
    const providerFailure = error instanceof ProviderRequestError;
    req.log.error(
      {
        provider: providerName,
        status: providerFailure ? error.status : undefined,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      "business briefing provider request failed",
    );
    return res.status(502).json({
      error: providerFailure
        ? error.userMessage
        : "The AI provider returned a response MartTrack couldn't use. Try again shortly.",
      code: "PROVIDER_ERROR",
    });
  }

  try {
    await db.insert(briefingsTable).values({
      provider: providerName,
      summary: validated.summary,
      recommendations: validated.recommendations,
      requestSnapshot: analytics,
    });
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "business briefing persistence failed",
    );
    return res.status(500).json({
      error: "The briefing was generated but couldn't be saved. Please try again.",
      code: "PERSISTENCE_ERROR",
    });
  }

  return res.json(validated);
});

export default router;