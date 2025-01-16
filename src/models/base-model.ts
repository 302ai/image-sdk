import {
  ImageModelV1,
  type ImageModelV1CallOptions,
  type ImageModelV1CallWarning,
} from "@ai-sdk/provider";
import {
  type FetchFunction,
  ResponseHandler,
  combineHeaders,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { ThreeZeroTwoAIImageSettings } from "../302ai-image-settings";
import type { ImageSize } from "../302ai-types";

export abstract class BaseModelHandler {
  constructor(
    protected settings: ThreeZeroTwoAIImageSettings,
    protected fetch?: FetchFunction,
  ) {}

  public async handleRequest(params: ImageModelV1CallOptions): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const { headers, ...rest } = params;
    const requestHeaders = headers
      ? Object.fromEntries(
          Object.entries(headers)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v as string]),
        )
      : undefined;

    return this.processRequest({
      ...rest,
      headers: requestHeaders,
    });
  }

  protected abstract processRequest(params: {
    prompt: string;
    n?: number;
    size?: string;
    aspectRatio?: string;
    seed?: number;
    providerOptions?: Record<string, unknown>;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }>;

  protected parseSize(size: string | undefined): ImageSize | undefined {
    if (!size) return undefined;
    const [width, height] = size.split("x").map(Number);
    return { width, height };
  }

  protected aspectRatioToSize(
    aspectRatio: string | undefined,
  ): ImageSize | undefined {
    if (!aspectRatio) return undefined;
    const [width, height] = aspectRatio.split(":").map(Number);
    if (!width || !height) return undefined;

    const base = 1024;
    if (width >= height) {
      return { width: base, height: Math.round(base * (height / width)) };
    }
    return { width: Math.round(base * (width / height)), height: base };
  }

  protected async downloadImage(url: string): Promise<string> {
    const maxRetries = 5;
    const timeout = 120000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      try {
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const imageResponse = await (this.fetch || fetch)(url, {
          signal: controller.signal,
          headers: {
            Accept: "image/*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        clearTimeout(timeoutId);

        if (!imageResponse.ok) {
          throw new Error(`HTTP error! status: ${imageResponse.status}`);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return base64;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Attempt ${attempt + 1} failed:`, errorMessage);

        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to download image after ${maxRetries} attempts: ${errorMessage}`,
          );
        }

        const delay = Math.min(
          (2 ** attempt) * 2000 + Math.random() * 1000,
          30000,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        controller.abort();
      }
    }
    throw new Error("Failed to download image after retries");
  }

  protected async downloadImages(urls: string[]): Promise<string[]> {
    const imagePromises = urls.map(async (url) => {
      try {
        return await this.downloadImage(url);
      } catch (error) {
        console.error("Image download failed:", error);
        return null;
      }
    });

    const base64Images = await Promise.all(imagePromises);
    const validImages = base64Images.filter(Boolean) as string[];

    if (validImages.length === 0) {
      throw new Error("All image downloads failed");
    }

    return validImages;
  }
}
