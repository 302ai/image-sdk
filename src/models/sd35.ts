import { SD35BaseHandler } from './sd35-base';
import { SD35Model } from '../302ai-types';

export class SD35LargeHandler extends SD35BaseHandler {
  get modelType(): SD35Model {
    return 'sd3.5-large';
  }
}

export class SD35LargeTurboHandler extends SD35BaseHandler {
  get modelType(): SD35Model {
    return 'sd3.5-large-turbo';
  }
}

export class SD35MediumHandler extends SD35BaseHandler {
  get modelType(): SD35Model {
    return 'sd3.5-medium';
  }
} 