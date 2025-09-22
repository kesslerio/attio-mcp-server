import type { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import type { MetadataErrorService } from './types.js';

export class DefaultMetadataErrorService implements MetadataErrorService {
  toStructuredError(
    resourceType: UniversalResourceType | string,
    error: unknown
  ): never {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { error?: { message?: string }; message?: string };
        };
        message?: string;
      };
      const status = axiosError.response?.status ?? 500;
      const message =
        axiosError.response?.data?.error?.message ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        `API error: ${status}`;

      throw {
        status,
        body: {
          code: 'api_error',
          message: `Failed to discover ${resourceType} attributes: ${message}`,
        },
      };
    }

    throw new Error(
      `Failed to discover ${resourceType} attributes: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  toRecordFetchError(
    resourceType: UniversalResourceType,
    recordId: string,
    error: unknown
  ): never {
    const message =
      error instanceof Error
        ? error.message
        : (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return String(error);
            }
          })();

    throw new Error(`Failed to get record attributes: ${message}`);
  }
}
