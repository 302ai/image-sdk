import type { ImageModelV1CallWarning } from "@ai-sdk/provider";
import { postJsonToApi } from "@ai-sdk/provider-utils";
import type { FluxProDevResponse } from "../302ai-types";
import {
  createJsonResponseHandler,
  statusCodeErrorResponseHandler,
} from "../utils/api-handlers";
import { BaseModelHandler } from "./base-model";

interface Provider302AIOptions {
  guidance_scale?: number;
  num_inference_steps?: number;
}

export class FluxProDevHandler extends BaseModelHandler {
  protected async processRequest({
    prompt,
    size,
    aspectRatio,
    providerOptions,
    headers,
    abortSignal,
  }: {
    prompt: string;
    size?: string;
    aspectRatio?: string;
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
    let parsedSize =
      this.parseSize(size) || this.aspectRatioToSize(aspectRatio);
    if (!parsedSize) {
      parsedSize = { width: 1024, height: 1024 };
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<FluxProDevResponse>({
      url: `${this.settings.baseURL}/302/submit/${this.settings.model}`,
      headers: requestHeaders,
      body: {
        guidance_scale: providerOptions?.["302ai"]?.guidance_scale ?? 3.5,
        image_size: parsedSize,
        num_inference_steps: providerOptions?.["302ai"]?.num_inference_steps ?? 28,
        prompt,
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
      warnings: [],
    };
  }
}
