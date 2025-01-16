import type { ImageModelV1CallWarning } from "@ai-sdk/provider";
import { postJsonToApi } from "@ai-sdk/provider-utils";
import type { RecraftResponse, RecraftStyle } from "../302ai-types";
import {
  createJsonResponseHandler,
  statusCodeErrorResponseHandler,
} from "../utils/api-handlers";
import { BaseModelHandler } from "./base-model";

const SUPPORTED_SIZES = [
  "1024x1024",
  "1365x1024",
  "1024x1365",
  "1536x1024",
  "1024x1536",
  "1820x1024",
  "1024x1820",
  "1024x2048",
  "2048x1024",
  "1434x1024",
  "1024x1434",
  "1024x1280",
  "1280x1024",
  "1024x1707",
  "1707x1024",
];

interface Provider302AIOptions {
  style: RecraftStyle;
  substyle: string;
  artistic_level: number;
  text_layout: string;
  controls: string;
}

export class RecraftHandler extends BaseModelHandler {
  protected async processRequest({
    prompt,
    size,
    aspectRatio,
    n,
    providerOptions,
    headers,
    abortSignal,
  }: {
    prompt: string;
    size?: string;
    aspectRatio?: string;
    n?: number;
    providerOptions?: {
      "302ai"?: Provider302AIOptions;
      [key: string]: unknown;
    };
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const warnings: ImageModelV1CallWarning[] = [];

    let parsedSize =
      this.parseSize(size) || this.aspectRatioToSize(aspectRatio);
    if (!parsedSize) {
      parsedSize = { width: 1024, height: 1024 };
    }

    const sizeStr = `${parsedSize.width}x${parsedSize.height}`;
    if (!SUPPORTED_SIZES.includes(sizeStr)) {
      warnings.push({
        type: "unsupported-setting",
        setting: "size",
        details: `Unsupported size: ${sizeStr}. Using closest supported size.`,
      });
      // Find the closest supported size
      const closest = this.findClosestSize(parsedSize.width, parsedSize.height);
      parsedSize = this.parseSize(closest);
    }

    if (!parsedSize?.width || !parsedSize?.height) {
      parsedSize = { width: 1024, height: 1024 };
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<RecraftResponse>({
      url: `${this.settings.baseURL}/302/submit/recraft-v3`,
      headers: requestHeaders,
      body: {
        prompt,
        size: `${parsedSize.width}x${parsedSize.height}`,
        n: n && n > 1 ? 2 : 1,
        style:
          (providerOptions?.["302ai"]?.style as RecraftStyle) ||
          "realistic_image",
        substyle: providerOptions?.["302ai"]?.substyle,
        model: "recraftv3",
        response_format: "url",
        artistic_level: providerOptions?.["302ai"]?.artistic_level,
        text_layout: providerOptions?.["302ai"]?.text_layout,
        controls: providerOptions?.["302ai"]?.controls,
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(),
      abortSignal,
      fetch: this.fetch,
    });

    const urls = response.images.map((img) => img.url).filter(Boolean);
    const images = await this.downloadImages(urls);

    return {
      images,
      warnings,
    };
  }

  private findClosestSize(width: number, height: number): string {
    let minDiff = Number.POSITIVE_INFINITY;
    let closest = SUPPORTED_SIZES[0];

    for (const size of SUPPORTED_SIZES) {
      const [w, h] = size.split("x").map(Number);
      const diff = Math.abs(w - width) + Math.abs(h - height);
      if (diff < minDiff) {
        minDiff = diff;
        closest = size;
      }
    }

    return closest;
  }
}
