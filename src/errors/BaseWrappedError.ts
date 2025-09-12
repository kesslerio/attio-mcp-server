// src/errors/BaseWrappedError.ts
export class BaseWrappedError extends Error {
  cause?: unknown;
  original?: unknown;
  error?: unknown;
  innerError?: unknown;
  serverData?: {
    status_code: number;
    type?: string;
    code?: string;
    message?: string;
  };

  constructor(name: string, message: string, opts?: { cause?: unknown }) {
    // Use native cause when available (Node 16.9+ / ES2022)
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = name;

    if (opts?.cause) {
      this.cause = opts.cause;
      this.original = opts.cause;
      this.error = opts.cause;
      this.innerError = opts.cause;

      // If the cause was Axios, also mirror serverData so findServerDataCarrier can see it
      const sd =
        (opts.cause as { serverData?: unknown })?.serverData ??
        (opts.cause as { response?: { data?: unknown } })?.response?.data;
      if (sd)
        this.serverData = sd as {
          status_code: number;
          type?: string;
          code?: string;
          message?: string;
        };
    }

    // Ensure the prototype chain is correct (TS/ES quirk)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
