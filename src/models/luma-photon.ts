import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postJsonToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { LumaPhotonResponse, LumaPhotonAspectRatioSchema } from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

const SUPPORTED_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '9:21', '21:9'] as const;

export class LumaPhotonHandler extends BaseModelHandler {
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
    const warnings: ImageModelV1CallWarning[] = [];

    // Validate aspect ratio
    let finalAspectRatio = aspectRatio || '16:9';
    if (aspectRatio && !SUPPORTED_ASPECT_RATIOS.includes(aspectRatio as any)) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'aspectRatio',
        details: `Unsupported aspect ratio: ${aspectRatio}. Using default 16:9. Supported values are: ${SUPPORTED_ASPECT_RATIOS.join(', ')}`,
      });
      finalAspectRatio = '16:9';
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<LumaPhotonResponse>({
      url: `${this.settings.baseURL}/302/submit/luma-photon`,
      headers: requestHeaders,
      body: {
        prompt,
        aspect_ratio: finalAspectRatio,
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