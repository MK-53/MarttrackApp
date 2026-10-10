import type { BusinessBriefingRequest } from "../../../../lib/api-zod/src/generated/types/businessBriefingRequest";
import type { BusinessBriefingResponse } from "../../../../lib/api-zod/src/generated/types/businessBriefingResponse";

export type BriefingAnalytics = Omit<BusinessBriefingRequest, "provider" | "userApiKey">;

export interface BriefingProvider {
  generate(analytics: BriefingAnalytics, apiKey: string): Promise<BusinessBriefingResponse>;
}