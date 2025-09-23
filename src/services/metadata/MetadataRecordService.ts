import { getLazyAttioClient } from '../../api/lazy-client.js';
import { OBJECT_SLUG_MAP } from '../../constants/universal.constants.js';
import type { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import type { MetadataErrorService, MetadataRecordService } from './types.js';
import { OperationType as OperationTypeEnum } from '../../utils/logger.js';
import { createScopedLogger } from '../../utils/logger.js';

const logger = createScopedLogger(
  'MetadataRecordService',
  undefined,
  OperationTypeEnum.DATA_PROCESSING
);

export class DefaultMetadataRecordService implements MetadataRecordService {
  constructor(private readonly errorService: MetadataErrorService) {}

  async getAttributesForRecord(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<Record<string, unknown>> {
    const client = getLazyAttioClient();

    try {
      const resourceSlug =
        OBJECT_SLUG_MAP[resourceType.toLowerCase()] ||
        resourceType.toLowerCase();

      const response = await client.get(
        `/objects/${resourceSlug}/records/${recordId}`
      );

      if (!response || !response.data) {
        throw {
          status: 500,
          body: {
            code: 'invalid_response',
            message: `Invalid API response for ${resourceType} record: ${recordId}`,
          },
        };
      }

      const result = response.data.data?.values || response.data.data || {};

      if (result === null || result === undefined) {
        throw {
          status: 404,
          body: {
            code: 'not_found',
            message: `${resourceType} record with ID "${recordId}" not found.`,
          },
        };
      }

      return result;
    } catch (error: unknown) {
      logger.error(
        `Failed to get attributes for ${resourceType} record ${recordId}`,
        error,
        { resourceType, recordId }
      );

      return this.errorService.toRecordFetchError(
        resourceType,
        recordId,
        error
      );
    }
  }
}
