import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { SD35AspectRatioSchema, SD35Model } from '../302ai-types';
import { statusCodeErrorResponseHandler } from '../utils/api-handlers';

const SUPPORTED_ASPECT_RATIOS = ['16:9', '1:1', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'] as const;

export abstract class SD35BaseHandler extends BaseModelHandler {
  abstract get modelType(): SD35Model;

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
    let finalAspectRatio = aspectRatio || '1:1';
    if (aspectRatio && !SUPPORTED_ASPECT_RATIOS.includes(aspectRatio as any)) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'aspectRatio',
        details: `Unsupported aspect ratio: ${aspectRatio}. Using default 1:1. Supported values are: ${SUPPORTED_ASPECT_RATIOS.join(', ')}`,
      });
      finalAspectRatio = '1:1';
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      Accept: 'image/*',
      ...headers,
    };

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('aspect_ratio', finalAspectRatio);
    formData.append('model', this.modelType);
    formData.append('mode', 'text-to-image');

    if (providerOptions?.['302ai']?.negative_prompt) {
      formData.append('negative_prompt', providerOptions['302ai'].negative_prompt);
    }
    if (providerOptions?.['302ai']?.output_format) {
      formData.append('output_format', providerOptions['302ai'].output_format);
    }
    if (providerOptions?.['302ai']?.seed) {
      formData.append('seed', providerOptions['302ai'].seed.toString());
    }

    const { value: response } = await postToApi<ArrayBuffer>({
      url: `${this.settings.baseURL}/sd/v2beta/stable-image/generate/sd3`,
      headers: requestHeaders,
      body: {
        content: formData,
        values: {
          prompt,
          aspect_ratio: finalAspectRatio,
          model: this.modelType,
          mode: 'text-to-image',
          negative_prompt: providerOptions?.['302ai']?.negative_prompt,
          output_format: providerOptions?.['302ai']?.output_format,
          seed: providerOptions?.['302ai']?.seed,
        }
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: async ({ response }) => {
        const arrayBuffer = await response.arrayBuffer();
        return { value: arrayBuffer };
      },
      abortSignal,
      fetch: this.fetch,
    });

    // Convert the binary response to base64
    const base64 = Buffer.from(response).toString('base64');

    return {
      images: [base64],
      warnings,
    };
  }
} 