import type { ImageModelV1 } from "@ai-sdk/provider";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import type { ThreeZeroTwoAIImageSettings } from "./302ai-image-settings";
import { createModelHandler } from "./models/model-factory";

export class ThreeZeroTwoAIClient implements ImageModelV1 {
  readonly specificationVersion = "v1";
  readonly modelId: string;
  private modelHandler;

  get provider(): string {
    return "302ai";
  }

  get maxImagesPerCall(): number {
    return 1;
  }

  constructor(
    readonly settings: ThreeZeroTwoAIImageSettings,
    private fetch?: FetchFunction,
  ) {
    this.modelId = settings.model;
    this.settings = settings;
    this.modelHandler = createModelHandler(settings, fetch);
    console.log("this.settings", this.settings);
  }

  async doGenerate(
    params: Parameters<ImageModelV1["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<ImageModelV1["doGenerate"]>>> {
    return this.modelHandler.handleRequest(params);
  }
}
