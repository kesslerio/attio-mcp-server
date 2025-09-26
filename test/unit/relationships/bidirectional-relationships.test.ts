/**
 * Unit tests for bidirectional relationship functionality - Issue #747
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  relationshipToolConfigs,
  LinkPersonToCompanyToolConfig,
  UnlinkPersonFromCompanyToolConfig,
  GetPersonCompaniesToolConfig,
  GetCompanyTeamToolConfig,
} from '../../../src/handlers/tool-configs/relationships/index.js';

// Mock the dependencies
vi.mock('../../../src/objects/companies/index.js', () => ({
  getCompanyDetails: vi.fn(),
  updateCompany: vi.fn(),
}));

vi.mock('../../../src/objects/people/index.js', () => ({
  getPersonDetails: vi.fn(),
  updatePerson: vi.fn(),
}));

import {
  getCompanyDetails,
  updateCompany,
} from '../../../src/objects/companies/index.js';
import {
  getPersonDetails,
  updatePerson,
} from '../../../src/objects/people/index.js';

describe('Bidirectional Relationship Tools - Issue #747', () => {
  const mockPersonId = 'person-123';
  const mockCompanyId = 'company-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('link-person-to-company (Bidirectional)', () => {
    const linkHandler = (
      relationshipToolConfigs.linkPersonToCompany as LinkPersonToCompanyToolConfig
    ).handler;

    it('should link person to company bidirectionally when neither is linked', async () => {
      // Mock company with no team members
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [] },
      });

      // Mock person with no company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: null },
      });

      // Mock successful updates
      (updateCompany as Mock).mockResolvedValue({});
      (updatePerson as Mock).mockResolvedValue({});

      const result = await linkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Successfully linked person to company bidirectionally'
      );
      expect(updateCompany).toHaveBeenCalledWith(mockCompanyId, {
        team: [mockPersonId],
      });
      expect(updatePerson).toHaveBeenCalledWith(mockPersonId, {
        company: mockCompanyId,
      });
    });

    it('should detect and report when person is already linked bidirectionally', async () => {
      // Mock company with person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [mockPersonId] },
      });

      // Mock person with company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: mockCompanyId },
      });

      const result = await linkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Person is already bidirectionally linked to this company'
      );
      expect(updateCompany).not.toHaveBeenCalled();
      expect(updatePerson).not.toHaveBeenCalled();
    });

    it('should fix inconsistency when person is in team but company field not set', async () => {
      // Mock company with person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [mockPersonId, 'other-person'] },
      });

      // Mock person without company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: null },
      });

      (updatePerson as Mock).mockResolvedValue({});

      const result = await linkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Fixed relationship inconsistency: updated person company field'
      );
      expect(updatePerson).toHaveBeenCalledWith(mockPersonId, {
        company: mockCompanyId,
      });
      expect(updateCompany).not.toHaveBeenCalled();
    });

    it('should fix inconsistency when person has company set but not in team', async () => {
      // Mock company without person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: ['other-person'] },
      });

      // Mock person with company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: mockCompanyId },
      });

      (updateCompany as Mock).mockResolvedValue({});

      const result = await linkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Fixed relationship inconsistency: updated company team field'
      );
      expect(updateCompany).toHaveBeenCalledWith(mockCompanyId, {
        team: ['other-person', mockPersonId],
      });
      expect(updatePerson).not.toHaveBeenCalled();
    });

    it('should reject linking when person already has different company', async () => {
      const differentCompanyId = 'company-789';

      // Mock company
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [] },
      });

      // Mock person with different company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: differentCompanyId },
      });

      const result = await linkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Person is already linked to company');
      expect(result.error).toBe(
        'Person already has a different company assigned'
      );
      expect(updateCompany).not.toHaveBeenCalled();
      expect(updatePerson).not.toHaveBeenCalled();
    });
  });

  describe('unlink-person-from-company (Bidirectional)', () => {
    const unlinkHandler = (
      relationshipToolConfigs.unlinkPersonFromCompany as UnlinkPersonFromCompanyToolConfig
    ).handler;

    it('should unlink person from company bidirectionally', async () => {
      // Mock company with person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [mockPersonId, 'other-person'] },
      });

      // Mock person with company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: mockCompanyId },
      });

      (updateCompany as Mock).mockResolvedValue({});
      (updatePerson as Mock).mockResolvedValue({});

      const result = await unlinkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Successfully unlinked person from company bidirectionally'
      );
      expect(updateCompany).toHaveBeenCalledWith(mockCompanyId, {
        team: ['other-person'],
      });
      expect(updatePerson).toHaveBeenCalledWith(mockPersonId, {
        company: undefined,
      });
    });

    it('should report success when person is not linked', async () => {
      // Mock company without person
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: ['other-person'] },
      });

      // Mock person without company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: null },
      });

      const result = await unlinkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Person is not linked to this company');
      expect(updateCompany).not.toHaveBeenCalled();
      expect(updatePerson).not.toHaveBeenCalled();
    });

    it('should fix inconsistency when person in team but company not set', async () => {
      // Mock company with person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [mockPersonId, 'other-person'] },
      });

      // Mock person without company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: null },
      });

      (updateCompany as Mock).mockResolvedValue({});

      const result = await unlinkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Fixed relationship inconsistency: removed person from company team'
      );
      expect(updateCompany).toHaveBeenCalledWith(mockCompanyId, {
        team: ['other-person'],
      });
      expect(updatePerson).not.toHaveBeenCalled();
    });

    it('should fix inconsistency when person has company set but not in team', async () => {
      // Mock company without person
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: ['other-person'] },
      });

      // Mock person with company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: mockCompanyId },
      });

      (updatePerson as Mock).mockResolvedValue({});

      const result = await unlinkHandler(mockPersonId, mockCompanyId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Fixed relationship inconsistency: cleared person company field'
      );
      expect(updatePerson).toHaveBeenCalledWith(mockPersonId, {
        company: undefined,
      });
      expect(updateCompany).not.toHaveBeenCalled();
    });
  });

  describe('get-person-companies (With Consistency Validation)', () => {
    const getPersonCompaniesHandler = (
      relationshipToolConfigs.getPersonCompanies as GetPersonCompaniesToolConfig
    ).handler;

    it('should return company with consistency validation when bidirectionally linked', async () => {
      // Mock person with company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: mockCompanyId },
      });

      // Mock company with person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: {
          name: [{ value: 'Test Company' }],
          team: [mockPersonId],
        },
      });

      const result = await getPersonCompaniesHandler(mockPersonId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompanyId);
      expect(result[0].name).toBe('Test Company');
      expect(result[0].name).not.toContain('⚠️');
    });

    it('should show warning when person has company but not in team', async () => {
      // Mock person with company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: mockCompanyId },
      });

      // Mock company without person in team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: {
          name: [{ value: 'Test Company' }],
          team: ['other-person'],
        },
      });

      const result = await getPersonCompaniesHandler(mockPersonId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompanyId);
      expect(result[0].name).toContain('⚠️ (inconsistent - not in team)');
    });

    it('should return empty array when person has no company', async () => {
      // Mock person without company
      (getPersonDetails as Mock).mockResolvedValue({
        values: { company: null },
      });

      const result = await getPersonCompaniesHandler(mockPersonId);

      expect(result).toHaveLength(0);
    });
  });

  describe('get-company-team (With Consistency Validation)', () => {
    const getCompanyTeamHandler = (
      relationshipToolConfigs.getCompanyTeam as GetCompanyTeamToolConfig
    ).handler;

    it('should return team members with consistency validation when bidirectionally linked', async () => {
      // Mock company with team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [mockPersonId] },
      });

      // Mock person with company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: {
          name: [{ value: 'John Doe' }],
          company: mockCompanyId,
        },
      });

      const result = await getCompanyTeamHandler(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPersonId);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].name).not.toContain('⚠️');
    });

    it('should show warning when person in team but company field not set', async () => {
      // Mock company with team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [mockPersonId] },
      });

      // Mock person without company set
      (getPersonDetails as Mock).mockResolvedValue({
        values: {
          name: [{ value: 'John Doe' }],
          company: null,
        },
      });

      const result = await getCompanyTeamHandler(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPersonId);
      expect(result[0].name).toContain(
        '⚠️ (inconsistent - company field: none)'
      );
    });

    it('should return empty array when company has no team', async () => {
      // Mock company without team
      (getCompanyDetails as Mock).mockResolvedValue({
        values: { team: [] },
      });

      const result = await getCompanyTeamHandler(mockCompanyId);

      expect(result).toHaveLength(0);
    });
  });

  describe('Format Results', () => {
    it('should format successful link operation result', () => {
      const result = {
        success: true,
        message: 'Successfully linked person to company bidirectionally',
        companyId: mockCompanyId,
        personId: mockPersonId,
        teamSize: 2,
      };

      const formatted =
        relationshipToolConfigs.linkPersonToCompany.formatResult(result);
      expect(formatted).toBe(
        'Successfully linked person to company bidirectionally'
      );
    });

    it('should format failed link operation result', () => {
      const result = {
        success: false,
        message: 'Person is already linked to another company',
        companyId: mockCompanyId,
        personId: mockPersonId,
        error: 'Person already has a different company assigned',
      };

      const formatted =
        relationshipToolConfigs.linkPersonToCompany.formatResult(result);
      expect(formatted).toBe(
        'Failed to link person to company: Person already has a different company assigned'
      );
    });

    it('should format person companies result with consistency warnings', () => {
      const companies = [
        { id: 'company-1', name: 'Company One' },
        {
          id: 'company-2',
          name: 'Company Two ⚠️ (inconsistent - not in team)',
        },
      ];

      const formatted =
        relationshipToolConfigs.getPersonCompanies.formatResult(companies);
      expect(formatted).toContain('Person is associated with 2 companies:');
      expect(formatted).toContain('- Company One (ID: company-1)');
      expect(formatted).toContain(
        '- Company Two ⚠️ (inconsistent - not in team) (ID: company-2)'
      );
    });

    it('should format company team result with consistency warnings', () => {
      const team = [
        { id: 'person-1', name: 'John Doe' },
        {
          id: 'person-2',
          name: 'Jane Smith ⚠️ (inconsistent - company field: none)',
        },
      ];

      const formatted =
        relationshipToolConfigs.getCompanyTeam.formatResult(team);
      expect(formatted).toContain('Company has 2 team members:');
      expect(formatted).toContain('- John Doe (ID: person-1)');
      expect(formatted).toContain(
        '- Jane Smith ⚠️ (inconsistent - company field: none) (ID: person-2)'
      );
    });
  });
});
