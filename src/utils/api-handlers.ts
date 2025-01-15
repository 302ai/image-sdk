import { APICallError } from '@ai-sdk/provider';
import {
  extractResponseHeaders,
  ResponseHandler,
} from '@ai-sdk/provider-utils';

export const createJsonResponseHandler = <T>(): ResponseHandler<T> =>
  async ({ response, url, requestBodyValues }) => {
    const responseHeaders = extractResponseHeaders(response);
    const responseBody = await response.json();
    return {
      responseHeaders,
      value: responseBody as T,
    };
  };

export const statusCodeErrorResponseHandler: ResponseHandler<APICallError> = async ({
  response,
  url,
  requestBodyValues,
}) => {
  const responseHeaders = extractResponseHeaders(response);
  const responseBody = await response.text();

  return {
    responseHeaders,
    value: new APICallError({
      message: response.statusText,
      url,
      requestBodyValues,
      statusCode: response.status,
      responseHeaders,
      responseBody,
    }),
  };
}; 