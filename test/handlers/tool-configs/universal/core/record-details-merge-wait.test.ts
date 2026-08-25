import { afterEach, describe, expect, it, vi } from 'vitest';

const { handleUniversalGetDetails, handleSearchError } = vi.hoisted(() => ({
  handleUniversalGetDetails: vi.fn(),
  handleSearchError: vi.fn(),
}));

vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalGetDetails,
}));
vi.mock('@/handlers/tool-configs/universal/core/error-utils.js', () => ({
  handleSearchError,
}));

import { getRecordDetailsConfig } from '@/handlers/tool-configs/universal/core/record-details-operations.js';

const RECORD_ID = '33333333-3333-4333-8333-333333333333';

describe('get_record_details merge wait state', () => {
  afterEach(() => vi.resetAllMocks());

  it('treats Attio merge_in_progress 404 as wait-not-missing', async () => {
    handleUniversalGetDetails.mockRejectedValueOnce({
      response: { status: 404, data: { code: 'merge_in_progress' } },
    });

    const result = await getRecordDetailsConfig.handler({
      resource_type: 'deals',
      record_id: RECORD_ID,
    });

    expect(result).toMatchObject({
      id: { record_id: RECORD_ID },
      merge_in_progress: true,
    });
    expect(getRecordDetailsConfig.formatResult(result)).toContain(
      'not missing'
    );
    expect(handleSearchError).not.toHaveBeenCalled();
  });
});
