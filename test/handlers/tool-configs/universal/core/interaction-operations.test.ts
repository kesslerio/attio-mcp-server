/**
 * Unit tests for get_record_interactions tool (Issue #1116)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalResourceType } from '../../../../../src/handlers/tool-configs/universal/types.js';
import { getRecordInteractionsSchema } from '../../../../../src/handlers/tool-configs/universal/schemas/core-schemas.js';

// Mock dependencies before importing the module under test
vi.mock('../../../../../src/objects/records/index.js', () => ({
  getObjectRecord: vi.fn(),
}));

vi.mock('../../../../../src/objects/people/basic.js', () => ({
  getPersonDetails: vi.fn(),
}));

vi.mock('../../../../../src/services/ErrorService.js', () => ({
  ErrorService: {
    createUniversalError: vi.fn(
      (tool: string, resource: string, error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        return err;
      }
    ),
  },
}));

vi.mock(
  '../../../../../src/handlers/tool-configs/universal/schemas.js',
  () => ({
    getRecordInteractionsSchema: {},
    validateUniversalToolParams: vi.fn(
      (toolName: string, params: Record<string, unknown>) => params
    ),
  })
);

vi.mock('../../../../../src/handlers/tools/standards/index.js', () => ({
  formatToolDescription: vi.fn(
    (opts: Record<string, string>) => opts.capability || ''
  ),
}));

import {
  getRecordInteractionsConfig,
  getRecordInteractionsDefinition,
  type InteractionsResult,
} from '../../../../../src/handlers/tool-configs/universal/core/interaction-operations.js';
import { getObjectRecord } from '../../../../../src/objects/records/index.js';
import { getPersonDetails } from '../../../../../src/objects/people/basic.js';

const mockGetObjectRecord = vi.mocked(getObjectRecord);
const mockGetPersonDetails = vi.mocked(getPersonDetails);

/** Helper: build a mock Attio record with interaction attributes */
function buildMockRecord(
  name: string,
  interactions: Record<string, unknown[]> = {}
) {
  return {
    id: { record_id: 'mock-record-id' },
    values: {
      name: [{ full_name: name, value: name }],
      ...interactions,
    },
  };
}

function buildInteractionValue(
  interactedAt: string,
  type = 'email',
  ownerId = 'user-123'
) {
  return [
    {
      interaction_type: type,
      interacted_at: interactedAt,
      owner_actor: { type: 'workspace-member', id: ownerId },
    },
  ];
}

describe('get_record_interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handler', () => {
    it('returns interaction metadata for a person record', async () => {
      const mockPerson = buildMockRecord('Alice Johnson', {
        first_email_interaction: buildInteractionValue('2024-01-15T10:00:00Z'),
        last_email_interaction: buildInteractionValue('2025-02-01T14:30:00Z'),
        first_interaction: buildInteractionValue(
          '2024-01-10T09:00:00Z',
          'calendar'
        ),
        last_interaction: buildInteractionValue('2025-02-01T14:30:00Z'),
      });

      mockGetPersonDetails.mockResolvedValue(mockPerson as never);

      const result = await getRecordInteractionsConfig.handler({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person-abc',
      });

      expect(mockGetPersonDetails).toHaveBeenCalledWith('person-abc');
      expect(result.record_id).toBe('person-abc');
      expect(result.resource_type).toBe('people');
      expect(result.record_name).toBe('Alice Johnson');
      expect(result.interactions.first_email_interaction).toEqual({
        date: '2024-01-15T10:00:00Z',
        interaction_type: 'email',
        owner_actor_type: 'workspace-member',
        owner_actor_id: 'user-123',
      });
      expect(result.interactions.last_email_interaction).not.toBeNull();
      expect(result.interactions.first_interaction).not.toBeNull();
      expect(result.interactions.last_interaction).not.toBeNull();
      // Attributes without data should be null
      expect(result.interactions.first_calendar_interaction).toBeNull();
      expect(result.interactions.last_calendar_interaction).toBeNull();
      expect(result.interactions.next_calendar_interaction).toBeNull();
      expect(result.interactions.next_interaction).toBeNull();
    });

    it('returns interaction metadata for a company record', async () => {
      const mockCompany = buildMockRecord('Acme Corp', {
        first_email_interaction: buildInteractionValue('2023-06-01T08:00:00Z'),
        last_email_interaction: buildInteractionValue('2025-01-20T16:00:00Z'),
      });

      mockGetObjectRecord.mockResolvedValue(mockCompany as never);

      const result = await getRecordInteractionsConfig.handler({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'company-xyz',
      });

      expect(mockGetObjectRecord).toHaveBeenCalledWith(
        'companies',
        'company-xyz'
      );
      expect(result.record_id).toBe('company-xyz');
      expect(result.resource_type).toBe('companies');
      expect(result.record_name).toBe('Acme Corp');
      expect(result.interactions.first_email_interaction).toEqual({
        date: '2023-06-01T08:00:00Z',
        interaction_type: 'email',
        owner_actor_type: 'workspace-member',
        owner_actor_id: 'user-123',
      });
    });

    it('returns nulls for record with no interactions', async () => {
      const mockPerson = buildMockRecord('Bob Smith');
      mockGetPersonDetails.mockResolvedValue(mockPerson as never);

      const result = await getRecordInteractionsConfig.handler({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person-no-interactions',
      });

      expect(result.record_name).toBe('Bob Smith');
      for (const key of Object.keys(result.interactions)) {
        expect(result.interactions[key]).toBeNull();
      }
    });

    it('rejects unsupported resource types', async () => {
      await expect(
        getRecordInteractionsConfig.handler({
          resource_type: UniversalResourceType.DEALS,
          record_id: 'deal-123',
        })
      ).rejects.toThrow(
        'Interaction metadata is only available for people and companies'
      );
    });

    it('rejects tasks resource type', async () => {
      await expect(
        getRecordInteractionsConfig.handler({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'task-123',
        })
      ).rejects.toThrow(
        'Interaction metadata is only available for people and companies'
      );
    });

    it('handles API errors gracefully', async () => {
      mockGetPersonDetails.mockRejectedValue(new Error('API timeout'));

      await expect(
        getRecordInteractionsConfig.handler({
          resource_type: UniversalResourceType.PEOPLE,
          record_id: 'person-err',
        })
      ).rejects.toThrow('API timeout');
    });

    it('handles interaction entries with missing owner_actor', async () => {
      const mockPerson = buildMockRecord('Charlie', {
        first_email_interaction: [
          {
            interaction_type: 'email',
            interacted_at: '2024-03-01T12:00:00Z',
            // no owner_actor
          },
        ],
      });
      mockGetPersonDetails.mockResolvedValue(mockPerson as never);

      const result = await getRecordInteractionsConfig.handler({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person-no-owner',
      });

      expect(result.interactions.first_email_interaction).toEqual({
        date: '2024-03-01T12:00:00Z',
        interaction_type: 'email',
        owner_actor_type: null,
        owner_actor_id: null,
      });
    });

    it('handles empty interaction arrays', async () => {
      const mockPerson = buildMockRecord('Diana', {
        first_email_interaction: [],
        last_email_interaction: [],
      });
      mockGetPersonDetails.mockResolvedValue(mockPerson as never);

      const result = await getRecordInteractionsConfig.handler({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person-empty-arrays',
      });

      expect(result.interactions.first_email_interaction).toBeNull();
      expect(result.interactions.last_email_interaction).toBeNull();
    });
  });

  describe('formatResult', () => {
    it('formats interactions into readable text', () => {
      const result: InteractionsResult = {
        record_id: 'person-abc',
        resource_type: 'people',
        record_name: 'Alice Johnson',
        interactions: {
          first_email_interaction: {
            date: '2024-01-15T10:00:00Z',
            interaction_type: 'email',
            owner_actor_type: 'workspace-member',
            owner_actor_id: 'user-123',
          },
          last_email_interaction: {
            date: '2025-02-01T14:30:00Z',
            interaction_type: 'email',
            owner_actor_type: 'workspace-member',
            owner_actor_id: 'user-123',
          },
          first_calendar_interaction: null,
          last_calendar_interaction: null,
          next_calendar_interaction: null,
          first_interaction: null,
          last_interaction: null,
          next_interaction: null,
        },
      };

      const formatted = getRecordInteractionsConfig.formatResult(result);
      expect(formatted).toContain('Alice Johnson');
      expect(formatted).toContain('person-abc');
      expect(formatted).toContain('First Email');
      expect(formatted).toContain('Last Email');
      expect(formatted).toContain('(email)');
    });

    it('handles record with no interactions', () => {
      const result: InteractionsResult = {
        record_id: 'person-none',
        resource_type: 'people',
        record_name: 'Bob',
        interactions: {
          first_email_interaction: null,
          last_email_interaction: null,
          first_calendar_interaction: null,
          last_calendar_interaction: null,
          next_calendar_interaction: null,
          first_interaction: null,
          last_interaction: null,
          next_interaction: null,
        },
      };

      const formatted = getRecordInteractionsConfig.formatResult(result);
      expect(formatted).toContain('No interaction history recorded');
    });

    it('handles null/undefined result', () => {
      const formatted = getRecordInteractionsConfig.formatResult(
        null as unknown as InteractionsResult
      );
      expect(formatted).toContain('No interaction data found');
    });

    it('returns error string instead of throwing on formatting crash', () => {
      // Force a crash by providing a result whose interactions getter throws
      const badResult = {
        record_id: 'test',
        resource_type: 'people',
        record_name: 'Test',
        get interactions() {
          throw new Error('boom');
        },
      } as unknown as InteractionsResult;

      const formatted = getRecordInteractionsConfig.formatResult(badResult);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('definition', () => {
    it('has correct name', () => {
      expect(getRecordInteractionsDefinition.name).toBe(
        'get_record_interactions'
      );
    });

    it('has readOnly and idempotent annotations', () => {
      expect(getRecordInteractionsDefinition.annotations.readOnlyHint).toBe(
        true
      );
      expect(getRecordInteractionsDefinition.annotations.idempotentHint).toBe(
        true
      );
    });

    it('schema requires resource_type and record_id', () => {
      expect(getRecordInteractionsSchema.required).toContain('resource_type');
      expect(getRecordInteractionsSchema.required).toContain('record_id');
    });

    it('schema limits resource_type to people and companies', () => {
      const rtProp = getRecordInteractionsSchema.properties.resource_type;
      expect(rtProp.enum).toEqual(['people', 'companies']);
    });
  });
});
