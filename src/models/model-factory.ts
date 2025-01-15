import { FetchFunction } from '@ai-sdk/provider-utils';
import { ThreeZeroTwoAIImageSettings } from '../302ai-image-settings';
import { BaseModelHandler } from './base-model';
import { FluxV11UltraHandler } from './flux-v11-ultra';
import { FluxProV11Handler } from './flux-pro-v11';
import { FluxProDevHandler } from './flux-pro-dev';
import { FluxSchnellHandler } from './flux-schnell';
import { IdeogramHandler } from './ideogram';
import { DallEHandler } from './dalle';
import { RecraftHandler } from './recraft';
import { SDXLLightningHandler } from './sdxl-lightning';
import { KolorsHandler } from './kolors';
import { AuraflowHandler } from './auraflow';
import { LumaPhotonHandler } from './luma-photon';
import { SDXLHandler } from './sdxl';
import { SD3UltraHandler } from './sd3-ultra';
import { SD3Handler } from './sd3';
import { SD35LargeHandler, SD35LargeTurboHandler, SD35MediumHandler } from './sd35';
import { MidjourneyHandler } from './midjourney';

export class ModelFactory {
  static createHandler(
    settings: ThreeZeroTwoAIImageSettings,
    fetch?: FetchFunction
  ): BaseModelHandler {
    switch (settings.model) {
      case 'flux-v1.1-ultra':
        return new FluxV11UltraHandler(settings, fetch);
      case 'flux-pro-v1.1':
        return new FluxProV11Handler(settings, fetch);
      case 'flux-pro':
      case 'flux-dev':
        return new FluxProDevHandler(settings, fetch);
      case 'flux-schnell':
        return new FluxSchnellHandler(settings, fetch);
      case 'ideogram/V_1':
      case 'ideogram/V_1_TURBO':
      case 'ideogram/V_2':
      case 'ideogram/V_2_TURBO':
        return new IdeogramHandler(settings, fetch);
      case 'dall-e-2':
      case 'dall-e-3':
        return new DallEHandler(settings, fetch);
      case 'recraft-v3':
        return new RecraftHandler(settings, fetch);
      case 'sdxl-lightning-v2':
        return new SDXLLightningHandler(settings, fetch);
      case 'kolors':
        return new KolorsHandler(settings, fetch);
      case 'aura-flow':
        return new AuraflowHandler(settings, fetch);
      case 'luma-photon':
        return new LumaPhotonHandler(settings, fetch);
      case 'sdxl':
        return new SDXLHandler(settings, fetch);
      case 'sd3-ultra':
        return new SD3UltraHandler(settings, fetch);
      case 'sd3':
        return new SD3Handler(settings, fetch);
      case 'sd3.5-large':
        return new SD35LargeHandler(settings, fetch);
      case 'sd3.5-large-turbo':
        return new SD35LargeTurboHandler(settings, fetch);
      case 'sd3.5-medium':
        return new SD35MediumHandler(settings, fetch);
      case 'midjourney':
        return new MidjourneyHandler(settings, fetch);
      default:
        throw new Error(`Unsupported model: ${settings.model}`);
    }
  }
} 