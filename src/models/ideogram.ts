import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postJsonToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { 
  IdeogramResponse, 
  IdeogramAspectRatioSchema,
  IdeogramResolutionSchema,
} from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

export class IdeogramHandler extends BaseModelHandler {
  protected async processRequest({
    prompt,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal,
  }: {
    prompt: string;
    size?: string;
    aspectRatio?: string;
    seed?: number;
    providerOptions?: Record<string, any>;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const warnings: ImageModelV1CallWarning[] = [];
    const convertedAspectRatio = this.convertToIdeogramAspectRatio(aspectRatio);
    const convertedResolution = this.convertToIdeogramResolution(size);

    if (aspectRatio && !convertedAspectRatio) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'aspectRatio',
        details: `Unsupported aspect ratio: ${aspectRatio}. Supported values are: 1:1, 10:16, 16:10, 9:16, 16:9, 3:2, 2:3, 4:3, 3:4, 1:3, 3:1`,
      });
    }

    if (size && !convertedResolution) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'size',
        details: `Unsupported resolution: ${size}. Please use one of the supported resolutions (e.g., '1024x1024', '768x1024', etc.)`,
      });
    }

    if (aspectRatio && size) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'size',
        details: 'Cannot use both aspectRatio and size for ideogram model',
      });
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<IdeogramResponse>({
      url: `${this.settings.baseURL}/ideogram/generate`,
      headers: requestHeaders,
      body: {
        image_request: {
          aspect_ratio: convertedAspectRatio,
          magic_prompt_option: providerOptions?.['302ai']?.magic_prompt_option ?? 'AUTO',
          model: this.settings.model.split('/')[1],
          negative_prompt: providerOptions?.['302ai']?.negative_prompt,
          prompt,
          resolution: convertedResolution,
          seed,
          style_type: providerOptions?.['302ai']?.style_type ?? 'GENERAL',
        },
      },
      failedResponseHandler: statusCodeErrorResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(),
      abortSignal,
      fetch: this.fetch,
    });

    const urls = response.data.map(img => img.url).filter(Boolean);
    const images = await this.downloadImages(urls);

    return {
      images,
      warnings,
    };
  }

  private convertToIdeogramAspectRatio(aspectRatio: string | undefined) {
    if (!aspectRatio) return undefined;
    const normalized = `ASPECT_${aspectRatio.replace(':', '_')}`;
    if (IdeogramAspectRatioSchema.safeParse(normalized).success) {
      return normalized;
    }
    return undefined;
  }

  private convertToIdeogramResolution(size: string | undefined) {
    if (!size) return undefined;
    const normalized = `RESOLUTION_${size.replace('x', '_')}`;
    if (IdeogramResolutionSchema.safeParse(normalized).success) {
      return normalized;
    }
    return undefined;
  }
} 