import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postJsonToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { FluxV11UltraResponse } from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

export class FluxV11UltraHandler extends BaseModelHandler {
  protected async processRequest({
    prompt,
    aspectRatio,
    providerOptions,
    headers,
    abortSignal,
  }: {
    prompt: string;
    aspectRatio?: string;
    providerOptions?: Record<string, any>;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<FluxV11UltraResponse>({
      url: `${this.settings.baseURL}/302/submit/flux-v1.1-ultra`,
      headers: requestHeaders,
      body: {
        aspect_ratio: aspectRatio || '1:1',
        prompt,
        raw: false,
        ...(providerOptions?.['302ai'] ?? {}),
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(),
      abortSignal,
      fetch: this.fetch,
    });

    const urls = response.images.map(img => img.url || '').filter(Boolean);
    const images = await this.downloadImages(urls);

    return {
      images,
      warnings: [],
    };
  }
} 