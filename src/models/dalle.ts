import type { ImageModelV1CallWarning } from "@ai-sdk/provider";
import { postJsonToApi } from "@ai-sdk/provider-utils";
import type { DallEResponse } from "../302ai-types";
import {
  createJsonResponseHandler,
  statusCodeErrorResponseHandler,
} from "../utils/api-handlers";
import { BaseModelHandler } from "./base-model";

export class DallEHandler extends BaseModelHandler {
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
    providerOptions?: Record<string, unknown>;
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

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<DallEResponse>({
      url: `${this.settings.baseURL}/v1/images/generations`,
      headers: requestHeaders,
      body: {
        prompt,
        model: this.settings.model,
        size: `${parsedSize.width}x${parsedSize.height}`,
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(),
      abortSignal,
      fetch: this.fetch,
    });

    const urls = response.data.map((img) => img.url).filter(Boolean);
    const images = await this.downloadImages(urls);

    return {
      images,
      warnings,
    };
  }
}
