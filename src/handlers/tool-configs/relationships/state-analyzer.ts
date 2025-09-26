/**
 * Relationship state analysis utilities for SRP compliance
 */

import { extractRecordIds } from '@/utils/relationship-helpers.js';
import { getCompanyDetails } from '@/objects/companies/index.js';
import { getPersonDetails as getPersonDetailsFromPeople } from '@/objects/people/index.js';

export interface LinkingState {
  currentTeamIds: string[];
  currentPersonCompanyId: string | null;
  isInTeam: boolean;
  isCompanySet: boolean;
  hasConflict: boolean;
  conflictMessage?: string;
}

export interface UnlinkingState {
  currentTeamIds: string[];
  currentPersonCompanyId: string | null;
  isInTeam: boolean;
  isCompanySet: boolean;
  needsPartialUnlink: boolean;
}

export interface PersonInfo {
  id: string;
  name: string;
}

export class RelationshipStateAnalyzer {
  /**
   * Analyze current relationship state for linking operations
   */
  static async analyzeForLinking(
    personId: string,
    companyId: string
  ): Promise<LinkingState> {
    // Get current company and person details
    const [company, person] = await Promise.all([
      getCompanyDetails(companyId),
      getPersonDetailsFromPeople(personId),
    ]);

    // Extract current team members and person's company
    const currentTeam = Array.isArray(company.values?.team)
      ? company.values.team
      : [];
    const currentTeamIds = extractRecordIds(currentTeam);
    const currentPersonCompany = person.values?.company;
    const currentPersonCompanyId = currentPersonCompany
      ? typeof currentPersonCompany === 'string'
        ? currentPersonCompany
        : String(currentPersonCompany)
      : null;

    // Check current linking state
    const isInTeam = currentTeamIds.includes(personId);
    const isCompanySet = currentPersonCompanyId === companyId;

    // Check for conflicts
    const hasConflict = Boolean(
      currentPersonCompanyId && currentPersonCompanyId !== companyId
    );

    const conflictMessage = hasConflict
      ? `Person is already linked to company ${currentPersonCompanyId}. Use unlink-person-from-company first.`
      : undefined;

    return {
      currentTeamIds,
      currentPersonCompanyId,
      isInTeam,
      isCompanySet,
      hasConflict,
      conflictMessage,
    };
  }

  /**
   * Analyze current relationship state for unlinking operations
   */
  static async analyzeForUnlinking(
    personId: string,
    companyId: string
  ): Promise<UnlinkingState> {
    // Get current company and person details
    const [company, person] = await Promise.all([
      getCompanyDetails(companyId),
      getPersonDetailsFromPeople(personId),
    ]);

    // Extract current team members and person's company
    const currentTeam = Array.isArray(company.values?.team)
      ? company.values.team
      : [];
    const currentTeamIds = extractRecordIds(currentTeam);
    const currentPersonCompany = person.values?.company;
    const currentPersonCompanyId = currentPersonCompany
      ? typeof currentPersonCompany === 'string'
        ? currentPersonCompany
        : String(currentPersonCompany)
      : null;

    // Check current linking state
    const isInTeam = currentTeamIds.includes(personId);
    const isCompanySet = currentPersonCompanyId === companyId;

    // Determine if partial unlinking is needed
    const needsPartialUnlink = Boolean(
      !isInTeam || !isCompanySet || currentPersonCompanyId !== companyId
    );

    return {
      currentTeamIds,
      currentPersonCompanyId,
      isInTeam,
      isCompanySet,
      needsPartialUnlink,
    };
  }

  /**
   * Extract person name from person record with fallbacks
   */
  static extractPersonName(person: Record<string, unknown>): string {
    const values = person.values as Record<string, unknown>;
    return (
      (values?.name as { value: string }[] | undefined)?.[0]?.value ||
      (values?.full_name as { value: string }[] | undefined)?.[0]?.value ||
      'Unknown Person'
    );
  }

  /**
   * Extract and normalize person company ID
   */
  static extractPersonCompanyId(
    person: Record<string, unknown>
  ): string | null {
    const values = person.values as Record<string, unknown>;
    const personCompany = values?.company;
    return personCompany
      ? typeof personCompany === 'string'
        ? personCompany
        : String(personCompany)
      : null;
  }
}
