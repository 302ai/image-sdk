import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { SDXLResponse } from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

export class SDXLHandler extends BaseModelHandler {
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

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('width', parsedSize.width.toString());
    formData.append('height', parsedSize.height.toString());

    if (providerOptions?.['302ai']?.negative_prompt) {
      formData.append('negative_prompt', providerOptions['302ai'].negative_prompt);
    }

    const { value: response } = await postToApi<SDXLResponse>({
      url: `${this.settings.baseURL}/302/submit/sdxl`,
      headers: requestHeaders,
      body: {
        content: formData,
        values: {
          prompt,
          width: parsedSize.width.toString(),
          height: parsedSize.height.toString(),
          negative_prompt: providerOptions?.['302ai']?.negative_prompt,
        }
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(),
      abortSignal,
      fetch: this.fetch,
    });

    if (response.status === 'failed' || response.error) {
      throw new Error(`SDXL generation failed: ${response.error || 'Unknown error'}`);
    }

    // Parse the output string which contains the URLs array
    const urls = JSON.parse(response.output) as string[];
    const images = await this.downloadImages(urls);

    return {
      images,
      warnings,
    };
  }
} 