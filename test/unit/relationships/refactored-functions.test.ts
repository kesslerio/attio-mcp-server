/**
 * Tests for refactored relationship functions
 * Testing the simplified business logic after Phase 2 refactoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { relationshipToolConfigs } from '@handlers/tool-configs/relationships/index.js';

// Mock dependencies
vi.mock('@utils/relationship-helpers.js', () => ({
  extractRecordIds: vi.fn(),
  extractSingleRecordId: vi.fn(),
  analyzeRelationshipState: vi.fn(),
  executeWithRetry: vi.fn(),
}));

vi.mock('@src/objects/companies/index.js', () => ({
  getCompanyDetails: vi.fn(),
  updateCompany: vi.fn(),
}));

vi.mock('@src/objects/people/index.js', () => ({
  getPersonDetails: vi.fn(),
  updatePerson: vi.fn(),
}));

import {
  extractRecordIds,
  extractSingleRecordId,
  executeWithRetry,
} from '@utils/relationship-helpers.js';
import {
  getCompanyDetails,
  updateCompany,
} from '@src/objects/companies/index.js';
import { getPersonDetails, updatePerson } from '@src/objects/people/index.js';

describe('Refactored Relationship Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('linkPersonToCompany', () => {
    it('should successfully link person to company when not linked', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      // Mock company data - no existing team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: { team: [] },
      });

      // Mock person data - no existing company
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: { company: null },
      });

      // Mock extractRecordIds returning empty array
      vi.mocked(extractRecordIds).mockReturnValue([]);

      // Mock executeWithRetry to simulate successful updates
      vi.mocked(executeWithRetry).mockResolvedValue(undefined);

      const result = await relationshipToolConfigs.linkPersonToCompany.handler(
        personId,
        companyId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Successfully linked person to company bidirectionally'
      );
      expect(result.companyId).toBe(companyId);
      expect(result.personId).toBe(personId);
      expect(result.teamSize).toBe(1);

      // Verify both updates were attempted
      expect(executeWithRetry).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return success if already fully linked', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      // Mock company data with person already in team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: { team: [{ record_id: personId }] },
      });

      // Mock person data with company already set
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: { company: companyId },
      });

      // Mock extractRecordIds returning person ID
      vi.mocked(extractRecordIds).mockReturnValue([personId]);

      const result = await relationshipToolConfigs.linkPersonToCompany.handler(
        personId,
        companyId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Person is already bidirectionally linked to this company'
      );
      expect(executeWithRetry).not.toHaveBeenCalled();
    });

    it('should handle conflict when person already has different company', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';
      const otherCompanyId = 'company-789';

      // Mock company data - no existing team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: { team: [] },
      });

      // Mock person data - already has different company
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: { company: otherCompanyId },
      });

      vi.mocked(extractRecordIds).mockReturnValue([]);

      const result = await relationshipToolConfigs.linkPersonToCompany.handler(
        personId,
        companyId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        `Person is already linked to company ${otherCompanyId}`
      );
      expect(result.error).toBe(
        'Person already has a different company assigned'
      );
      expect(executeWithRetry).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      vi.mocked(getCompanyDetails).mockRejectedValue(
        new Error('Company not found')
      );

      await expect(
        relationshipToolConfigs.linkPersonToCompany.handler(personId, companyId)
      ).rejects.toThrow('Failed to link person to company: Company not found');
    });
  });

  describe('unlinkPersonFromCompany', () => {
    it('should successfully unlink person from company when fully linked', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      // Mock company data with person in team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: {
          team: [{ record_id: personId }, { record_id: 'other-person' }],
        },
      });

      // Mock person data with company set
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: { company: companyId },
      });

      vi.mocked(extractRecordIds).mockReturnValue([personId, 'other-person']);
      vi.mocked(executeWithRetry).mockResolvedValue(undefined);

      const result =
        await relationshipToolConfigs.unlinkPersonFromCompany.handler(
          personId,
          companyId
        );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Successfully unlinked person from company bidirectionally'
      );
      expect(result.teamSize).toBe(1); // One person remaining
      expect(executeWithRetry).toHaveBeenCalled();
    });

    it('should return success if already not linked', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      // Mock company data without person in team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: { team: [] },
      });

      // Mock person data without company set
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: { company: null },
      });

      vi.mocked(extractRecordIds).mockReturnValue([]);

      const result =
        await relationshipToolConfigs.unlinkPersonFromCompany.handler(
          personId,
          companyId
        );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Person is not linked to this company');
      expect(executeWithRetry).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      vi.mocked(getCompanyDetails).mockRejectedValue(
        new Error('Company not found')
      );

      await expect(
        relationshipToolConfigs.unlinkPersonFromCompany.handler(
          personId,
          companyId
        )
      ).rejects.toThrow(
        'Failed to unlink person from company: Company not found'
      );
    });
  });

  describe('getPersonCompanies', () => {
    it('should return company when person has one company', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      // Mock person data with company
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: {
          company: companyId,
          companies: [], // Empty legacy field
        },
      });

      // Mock company data for validation
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: {
          name: [{ value: 'Test Company' }],
          team: [{ record_id: personId }],
        },
      });

      vi.mocked(extractRecordIds).mockReturnValue([personId]);

      const result =
        await relationshipToolConfigs.getPersonCompanies.handler(personId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: companyId,
        name: 'Test Company',
      });
    });

    it('should return empty array when person has no companies', async () => {
      const personId = 'person-123';

      // Mock person data without company
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: {
          company: null,
          companies: [],
        },
      });

      const result =
        await relationshipToolConfigs.getPersonCompanies.handler(personId);

      expect(result).toHaveLength(0);
    });

    it('should detect inconsistent relationships', async () => {
      const personId = 'person-123';
      const companyId = 'company-456';

      // Mock person data with company
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: {
          company: companyId,
          companies: [],
        },
      });

      // Mock company data where person is NOT in team (inconsistency)
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: {
          name: [{ value: 'Test Company' }],
          team: [], // Person not in team
        },
      });

      vi.mocked(extractRecordIds).mockReturnValue([]); // Empty team

      const result =
        await relationshipToolConfigs.getPersonCompanies.handler(personId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('⚠️ (inconsistent - not in team)');
    });

    it('should handle errors gracefully', async () => {
      const personId = 'person-123';

      vi.mocked(getPersonDetails).mockRejectedValue(
        new Error('Person not found')
      );

      await expect(
        relationshipToolConfigs.getPersonCompanies.handler(personId)
      ).rejects.toThrow("Failed to get person's companies: Person not found");
    });
  });

  describe('getCompanyTeam', () => {
    it('should return team members when company has team', async () => {
      const companyId = 'company-456';
      const personId1 = 'person-123';
      const personId2 = 'person-789';

      // Mock company data with team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: {
          team: [{ record_id: personId1 }, { record_id: personId2 }],
        },
      });

      // Mock extractSingleRecordId calls
      vi.mocked(extractSingleRecordId)
        .mockReturnValueOnce(personId1)
        .mockReturnValueOnce(personId2);

      // Mock person details
      vi.mocked(getPersonDetails)
        .mockResolvedValueOnce({
          id: { record_id: personId1 },
          values: {
            name: [{ value: 'John Doe' }],
            company: companyId,
          },
        })
        .mockResolvedValueOnce({
          id: { record_id: personId2 },
          values: {
            full_name: [{ value: 'Jane Smith' }],
            company: companyId,
          },
        });

      const result =
        await relationshipToolConfigs.getCompanyTeam.handler(companyId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: personId1,
        name: 'John Doe',
      });
      expect(result[1]).toEqual({
        id: personId2,
        name: 'Jane Smith',
      });
    });

    it('should return empty array when company has no team', async () => {
      const companyId = 'company-456';

      // Mock company data without team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: { team: [] },
      });

      const result =
        await relationshipToolConfigs.getCompanyTeam.handler(companyId);

      expect(result).toHaveLength(0);
    });

    it('should detect inconsistent relationships in team members', async () => {
      const companyId = 'company-456';
      const personId = 'person-123';
      const otherCompanyId = 'company-789';

      // Mock company data with team
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: companyId },
        values: {
          team: [{ record_id: personId }],
        },
      });

      vi.mocked(extractSingleRecordId).mockReturnValue(personId);

      // Mock person with different company (inconsistency)
      vi.mocked(getPersonDetails).mockResolvedValue({
        id: { record_id: personId },
        values: {
          name: [{ value: 'John Doe' }],
          company: otherCompanyId, // Different company
        },
      });

      const result =
        await relationshipToolConfigs.getCompanyTeam.handler(companyId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('⚠️ (inconsistent - company field:');
      expect(result[0].name).toContain(otherCompanyId);
    });

    it('should handle errors gracefully', async () => {
      const companyId = 'company-456';

      vi.mocked(getCompanyDetails).mockRejectedValue(
        new Error('Company not found')
      );

      await expect(
        relationshipToolConfigs.getCompanyTeam.handler(companyId)
      ).rejects.toThrow('Failed to get company team: Company not found');
    });
  });

  describe('formatResult functions', () => {
    it('should format successful link result', () => {
      const result = {
        success: true,
        message: 'Successfully linked person to company',
        companyId: 'company-123',
        personId: 'person-456',
        teamSize: 3,
      };

      const formatted =
        relationshipToolConfigs.linkPersonToCompany.formatResult(result);

      expect(formatted).toBe('Successfully linked person to company');
    });

    it('should format failed link result', () => {
      const result = {
        success: false,
        message: 'Failed to link',
        error: 'Person already has a different company',
        companyId: 'company-123',
        personId: 'person-456',
      };

      const formatted =
        relationshipToolConfigs.linkPersonToCompany.formatResult(result);

      expect(formatted).toBe(
        'Failed to link person to company: Person already has a different company'
      );
    });

    it('should format person companies result', () => {
      const companies = [
        { id: 'company-1', name: 'Company A' },
        { id: 'company-2', name: 'Company B' },
      ];

      const formatted =
        relationshipToolConfigs.getPersonCompanies.formatResult(companies);

      expect(formatted).toContain('Person is associated with 2 companies:');
      expect(formatted).toContain('- Company A (ID: company-1)');
      expect(formatted).toContain('- Company B (ID: company-2)');
    });

    it('should format empty companies result', () => {
      const companies: never[] = [];

      const formatted =
        relationshipToolConfigs.getPersonCompanies.formatResult(companies);

      expect(formatted).toBe(
        'This person is not associated with any companies.'
      );
    });

    it('should format company team result', () => {
      const team = [
        { id: 'person-1', name: 'John Doe' },
        { id: 'person-2', name: 'Jane Smith' },
      ];

      const formatted =
        relationshipToolConfigs.getCompanyTeam.formatResult(team);

      expect(formatted).toContain('Company has 2 team members:');
      expect(formatted).toContain('- John Doe (ID: person-1)');
      expect(formatted).toContain('- Jane Smith (ID: person-2)');
    });

    it('should format empty team result', () => {
      const team: never[] = [];

      const formatted =
        relationshipToolConfigs.getCompanyTeam.formatResult(team);

      expect(formatted).toBe('This company has no team members.');
    });
  });
});
