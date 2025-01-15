import { ImageModelV1CallWarning } from '@ai-sdk/provider';
import { postJsonToApi } from '@ai-sdk/provider-utils';
import { BaseModelHandler } from './base-model';
import { SD3Response, SD3ImageSizeSchema } from '../302ai-types';
import { createJsonResponseHandler, statusCodeErrorResponseHandler } from '../utils/api-handlers';

const SUPPORTED_SIZES = [
  '1024x1024', '1024x2048', '1536x1024',
  '1536x2048', '2048x1152', '1152x2048'
] as const;

export class SD3Handler extends BaseModelHandler {
  protected async processRequest({
    prompt,
    size,
    n,
    providerOptions,
    headers,
    abortSignal,
  }: {
    prompt: string;
    size?: string;
    n?: number;
    providerOptions?: Record<string, any>;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
  }): Promise<{
    images: string[];
    warnings: ImageModelV1CallWarning[];
  }> {
    const warnings: ImageModelV1CallWarning[] = [];

    // Validate size
    let finalSize = size || '1024x1024';
    if (size && !SUPPORTED_SIZES.includes(size as any)) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'size',
        details: `Unsupported size: ${size}. Using default 1024x1024. Supported values are: ${SUPPORTED_SIZES.join(', ')}`,
      });
      finalSize = '1024x1024';
    }

    // Validate batch size
    let batchSize = n || 1;
    if (batchSize < 1 || batchSize > 4) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'n',
        details: `Batch size must be between 1 and 4. Using ${batchSize > 4 ? 4 : 1}.`,
      });
      batchSize = batchSize > 4 ? 4 : 1;
    }

    // Validate inference steps
    let inferenceSteps = providerOptions?.['302ai']?.num_inference_steps ?? 20;
    if (inferenceSteps < 1 || inferenceSteps > 100) {
      warnings.push({
        type: 'other',
        message: `Inference steps must be between 1 and 100. Using default 20.`,
      });
      inferenceSteps = 20;
    }

    // Validate guidance scale
    let guidanceScale = providerOptions?.['302ai']?.guidance_scale ?? 7.5;
    if (guidanceScale < 0 || guidanceScale > 100) {
      warnings.push({
        type: 'other',
        message: `Guidance scale must be between 0 and 100. Using default 7.5.`,
      });
      guidanceScale = 7.5;
    }

    const requestHeaders = {
      Authorization: this.settings.apiKey,
      ...headers,
    };

    const { value: response } = await postJsonToApi<SD3Response>({
      url: `${this.settings.baseURL}/302/submit/stable-diffusion-3-v2`,
      headers: requestHeaders,
      body: {
        prompt,
        image_size: finalSize,
        batch_size: batchSize,
        num_inference_steps: inferenceSteps,
        guidance_scale: guidanceScale,
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