/**
 * Inconsistent relationship repair handlers
 */

import { updatePerson } from '../../../objects/people/index.js';
import { updateCompany } from '../../../objects/companies/index.js';
import type { RelationshipOperationResult } from './types.js';

/**
 * Helper function to handle inconsistent relationships during linking
 */
export async function handleInconsistentLink(
  personId: string,
  companyId: string,
  state: { isInTeam: boolean; isCompanySet: boolean; currentTeamIds: string[] }
): Promise<RelationshipOperationResult> {
  const { isInTeam, isCompanySet, currentTeamIds } = state;

  if (isInTeam && !isCompanySet) {
    await updatePerson(personId, { company: companyId });
    return {
      success: true,
      message: 'Fixed relationship inconsistency: updated person company field',
      companyId,
      personId,
      teamSize: currentTeamIds.length,
    };
  }

  const updatedTeamIds = [...currentTeamIds, personId];
  await updateCompany(companyId, { team: updatedTeamIds });
  return {
    success: true,
    message: 'Fixed relationship inconsistency: updated company team field',
    companyId,
    personId,
    teamSize: updatedTeamIds.length,
  };
}

/**
 * Helper function to handle inconsistent relationships during unlinking
 */
export async function handleInconsistentUnlink(
  personId: string,
  companyId: string,
  state: {
    isInTeam: boolean;
    isCompanySet: boolean;
    currentTeamIds: string[];
    currentPersonCompanyId: string | null;
  }
): Promise<RelationshipOperationResult> {
  const { isInTeam, isCompanySet, currentTeamIds, currentPersonCompanyId } =
    state;

  if (isInTeam && !isCompanySet) {
    const updatedTeamIds = currentTeamIds.filter((id) => id !== personId);
    await updateCompany(companyId, { team: updatedTeamIds });
    return {
      success: true,
      message:
        'Fixed relationship inconsistency: removed person from company team',
      companyId,
      personId,
      teamSize: updatedTeamIds.length,
    };
  }

  if (!isInTeam && isCompanySet) {
    await updatePerson(personId, { company: undefined });
    return {
      success: true,
      message: 'Fixed relationship inconsistency: cleared person company field',
      companyId,
      personId,
      teamSize: currentTeamIds.length,
    };
  }

  // Company mismatch but person is in team
  if (currentPersonCompanyId !== companyId && isInTeam) {
    const updatedTeamIds = currentTeamIds.filter((id) => id !== personId);
    await updateCompany(companyId, { team: updatedTeamIds });
    return {
      success: true,
      message: `Removed person from team, but person's company field points to ${currentPersonCompanyId}, not ${companyId}`,
      companyId,
      personId,
      teamSize: updatedTeamIds.length,
    };
  }

  throw new Error('Unexpected state in handleInconsistentUnlink');
}
