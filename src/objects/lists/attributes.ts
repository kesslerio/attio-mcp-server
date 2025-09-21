/**
 * List attribute utilities.
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import { createScopedLogger, OperationType } from '../../utils/logger.js';
import { extract } from './shared.js';

export async function getListAttributes(): Promise<Record<string, unknown>> {
  const log = createScopedLogger(
    'objects.lists',
    'getListAttributes',
    OperationType.API_CALL
  );
  const api = getLazyAttioClient();
  const path = '/lists/attributes';

  try {
    const response = await api.get(path);
    return extract<Record<string, unknown>>(response);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      log.error(
        'Failed to fetch list attributes, returning default schema',
        error instanceof Error ? error : undefined
      );
    }

    return {
      name: { type: 'string', required: true },
      parent_object: { type: 'string', required: true },
      description: { type: 'string', required: false },
    };
  }
}
