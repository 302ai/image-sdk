import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postJsonToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { SDXLLightningResponse } from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

export class SDXLLightningHandler extends BaseModelHandler {
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
    providerOptions?: Record<string, any>;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const warnings: ImageModelV1CallWarning[] = [];
    
    let parsedSize = this.parseSize(size) || this.aspectRatioToSize(aspectRatio);
    if (!parsedSize) {
      parsedSize = { width: 1024, height: 1024 };
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<SDXLLightningResponse>({
      url: `${this.settings.baseURL}/302/submit/sdxl-lightning-v2`,
      headers: requestHeaders,
      body: {
        prompt,
        image_size: parsedSize,
        embeddings: providerOptions?.['302ai']?.embeddings || [],
        format: providerOptions?.['302ai']?.format || 'jpeg',
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(),
      abortSignal,
      fetch: this.fetch,
    });

    const urls = response.images.map(img => img.url).filter(Boolean);
    const images = await this.downloadImages(urls);

    return {
      images,
      warnings,
    };
  }
} 