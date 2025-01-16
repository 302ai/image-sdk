import { z } from "zod";

export const ThreeZeroTwoAIImageModelSchema = z.enum([
  "flux-v1.1-ultra",
  "flux-pro-v1.1",
  "flux-pro",
  "flux-dev",
  "flux-schnell",
  "ideogram/V_1",
  "ideogram/V_1_TURBO",
  "ideogram/V_2",
  "ideogram/V_2_TURBO",
  "dall-e-2",
  "dall-e-3",
  "recraft-v3",
  "sdxl-lightning-v2",
  "kolors",
  "aura-flow",
  "luma-photon",
  "sdxl",
  "sd3-ultra",
  "sd3",
  "sd3.5-large",
  "sd3.5-large-turbo",
  "sd3.5-medium",
  "midjourney",
]);

export type ThreeZeroTwoAIImageModel = z.infer<
  typeof ThreeZeroTwoAIImageModelSchema
>;

export const ThreeZeroTwoAIImageSettingsSchema = z.object({
  apiKey: z.string(),
  baseURL: z.string().default("https://api.302.ai"),
  model: ThreeZeroTwoAIImageModelSchema,
});

export type ThreeZeroTwoAIImageSettings = z.infer<
  typeof ThreeZeroTwoAIImageSettingsSchema
>;
