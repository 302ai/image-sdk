import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { AuraflowResponse } from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

export class AuraflowHandler extends BaseModelHandler {
  protected async processRequest({
    prompt,
    headers,
    abortSignal,
  }: {
    prompt: string;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const warnings: ImageModelV1CallWarning[] = [];

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const formData = new FormData();
    formData.append('prompt', prompt);

    const { value: response } = await postToApi<AuraflowResponse>({
      url: `${this.settings.baseURL}/302/submit/aura-flow`,
      headers: requestHeaders,
      body: {
        content: formData,
        values: { prompt }
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