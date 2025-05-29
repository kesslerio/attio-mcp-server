// Custom type definitions for cacheable-request to resolve the issue with ResponseLike
declare module 'cacheable-request' {
  import { ServerResponse } from 'http';
  import { Readable } from 'stream';
  import { URL } from 'url';
  import { CachePolicy } from 'http-cache-semantics';

  type ResponseLikeBody = Readable | Buffer | string;

  interface ResponseLike {
    statusCode: number;
    headers: { [key: string]: string };
    body?: ResponseLikeBody;
  }

  interface RequestInput {
    url: string | URL;
    method?: string;
    headers?: { [key: string]: string };
    body?: string | Buffer | Readable;
    cache?: string;
    signal?: AbortSignal;
    retry?: Record<string, unknown>;
    maxRetryAfter?: number;
    throwHttpErrors?: boolean;
    followRedirect?: boolean;
    timeout?: number;
    agent?: Record<string, unknown>;
    json?: boolean;
    cookieJar?: Record<string, unknown>;
  }

  interface Options {
    cache?: unknown;
    strictTtl?: boolean;
    automaticFailover?: boolean;
    forceRefresh?: boolean;
    context?: Record<string, unknown>;
  }

  interface CacheableRequest {
    (
      requestInput: RequestInput,
      options?: Options
    ): Promise<{
      statusCode: number;
      headers: { [key: string]: string };
      body: ResponseLikeBody;
      cachePolicy: CachePolicy;
    }>;
    (
      requestInput: RequestInput,
      cb?: (response: ServerResponse | ResponseLike) => void
    ): Promise<void>;

    on(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    on(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    on(event: 'error', listener: (error: Error) => void): this;

    once(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    once(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    once(event: 'error', listener: (error: Error) => void): this;

    addListener(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    addListener(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    addListener(event: 'error', listener: (error: Error) => void): this;

    prependListener(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    prependListener(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    prependListener(event: 'error', listener: (error: Error) => void): this;

    prependOnceListener(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    prependOnceListener(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    prependOnceListener(event: 'error', listener: (error: Error) => void): this;

    off(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    off(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    off(event: 'error', listener: (error: Error) => void): this;

    removeListener(
      event: 'request',
      listener: (request: Record<string, unknown>) => void
    ): this;
    removeListener(
      event: 'response',
      listener: (response: ServerResponse | ResponseLike) => void
    ): this;
    removeListener(event: 'error', listener: (error: Error) => void): this;

    listeners(
      event: 'request'
    ): Array<(request: Record<string, unknown>) => void>;
    listeners(
      event: 'response'
    ): Array<(response: ServerResponse | ResponseLike) => void>;
    listeners(event: 'error'): Array<(error: Error) => void>;

    rawListeners(
      event: 'request'
    ): Array<(request: Record<string, unknown>) => void>;
    rawListeners(
      event: 'response'
    ): Array<(response: ServerResponse | ResponseLike) => void>;
    rawListeners(event: 'error'): Array<(error: Error) => void>;

    emit(event: 'request', request: Record<string, unknown>): boolean;
    emit(event: 'response', response: ServerResponse | ResponseLike): boolean;
    emit(event: 'error', error: Error): boolean;
  }

  function CacheableRequest(request: (...args: any[]) => any): CacheableRequest;

  export = CacheableRequest;
}
