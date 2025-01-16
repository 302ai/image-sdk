import type { ImageModelV1CallWarning } from "@ai-sdk/provider";
import { postJsonToApi } from "@ai-sdk/provider-utils";
import {
  type MidjourneySubmitResponse,
  type MidjourneyTaskResponse,
  MidjourneyTaskStatus,
} from "../302ai-types";
import {
  createJsonResponseHandler,
  statusCodeErrorResponseHandler,
} from "../utils/api-handlers";
import { BaseModelHandler } from "./base-model";

const SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "2:3",
  "3:2",
  "4:5",
  "5:4",
] as const;
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_TIME = 300000; // 5 minutes

export class MidjourneyHandler extends BaseModelHandler {
  private async pollTask(
    taskId: string,
    abortSignal?: AbortSignal,
  ): Promise<MidjourneyTaskResponse> {
    const startTime = Date.now();
    const fetchFn = this.fetch || fetch;

    while (true) {
      if (abortSignal?.aborted) {
        throw new Error("Task polling aborted");
      }

      if (Date.now() - startTime > MAX_POLL_TIME) {
        throw new Error("Task polling timed out");
      }

      const response = await fetchFn(
        `${this.settings.baseURL}/mj/task/${taskId}/fetch`,
        {
          method: "GET",
          headers: {
            "mj-api-secret": this.settings.apiKey.replace(/^Bearer\s+/, ""),
          },
          signal: abortSignal,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as MidjourneyTaskResponse;

      if (data.status === "FAILED") {
        throw new Error(`Task failed: ${data.failReason || "Unknown error"}`);
      }

      if (data.status === "SUCCESS") {
        return data;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  private async upscaleImage(
    taskId: string,
    response: MidjourneyTaskResponse,
    abortSignal?: AbortSignal,
  ): Promise<MidjourneyTaskResponse> {
    // Find the U1 button (first upscale option)
    const upscaleButton = response.buttons.find((b) => b.label === "U1");
    if (!upscaleButton) {
      throw new Error("No upscale option available");
    }

    // Submit upscale action
    const { value: actionResponse } =
      await postJsonToApi<MidjourneySubmitResponse>({
        url: `${this.settings.baseURL}/mj/submit/action`,
        headers: {
          "mj-api-secret": this.settings.apiKey.replace(/^Bearer\s+/, ""),
        },
        body: {
          customId: upscaleButton.customId,
          taskId: taskId,
        },
        failedResponseHandler: statusCodeErrorResponseHandler,
        successfulResponseHandler: createJsonResponseHandler(),
        abortSignal,
        fetch: this.fetch,
      });

    // Poll for upscaled result
    return await this.pollTask(actionResponse.result, abortSignal);
  }

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

    // Handle aspect ratio
    if (aspectRatio) {
      if (!SUPPORTED_ASPECT_RATIOS.includes(aspectRatio as any)) {
        warnings.push({
          type: "unsupported-setting",
          setting: "aspectRatio",
          details: `Unsupported aspect ratio: ${aspectRatio}. Supported values are: ${SUPPORTED_ASPECT_RATIOS.join(", ")}`,
        });
      } else {
        prompt = `${prompt} --ar ${aspectRatio}`;
      }
    }

    // Submit initial request
    const { value: submitResponse } =
      await postJsonToApi<MidjourneySubmitResponse>({
        url: `${this.settings.baseURL}/mj/submit/imagine`,
        headers: {
          "mj-api-secret": this.settings.apiKey.replace(/^Bearer\s+/, ""),
        },
        body: {
          prompt,
          botType: providerOptions?.["302ai"]?.botType || "MID_JOURNEY",
        },
        failedResponseHandler: statusCodeErrorResponseHandler,
        successfulResponseHandler: createJsonResponseHandler(),
        abortSignal,
        fetch: this.fetch,
      });

    // Poll for initial result
    const initialResult = await this.pollTask(
      submitResponse.result,
      abortSignal,
    );

    // Automatically upscale the first image
    const finalResult = await this.upscaleImage(
      submitResponse.result,
      initialResult,
      abortSignal,
    );

    // Get the final image URL
    if (!finalResult.imageUrl) {
      throw new Error("No image URL in the response");
    }

    // Download the image
    const images = await this.downloadImages([finalResult.imageUrl]);

    return {
      images,
      warnings,
    };
  }
}
