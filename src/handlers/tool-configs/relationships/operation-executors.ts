/**
 * Operation execution utilities for relationship operations
 */

import { executeWithRetry } from '../../../utils/relationship-helpers.js';
import { updatePerson } from '../../../objects/people/index.js';
import { updateCompany } from '../../../objects/companies/index.js';
import { RelationshipValidator } from './validators.js';
import {
  handleInconsistentLink,
  handleInconsistentUnlink,
} from './inconsistency-handlers.js';
import type { RelationshipOperationResult } from './types.js';

export class RelationshipOperationExecutor {
  /**
   * Execute partial link resolution for inconsistent relationships
   */
  static async executePartialLinkResolution(
    personId: string,
    companyId: string,
    isInTeam: boolean,
    isCompanySet: boolean,
    currentTeamIds: string[]
  ): Promise<RelationshipOperationResult> {
    return await handleInconsistentLink(personId, companyId, {
      isInTeam,
      isCompanySet,
      currentTeamIds,
    });
  }

  /**
   * Execute full bidirectional linking
   */
  static async executeFullLinking(
    personId: string,
    companyId: string,
    currentTeamIds: string[]
  ): Promise<RelationshipOperationResult> {
    const updatedTeamIds = [...currentTeamIds, personId];
    await executeWithRetry([
      () => updateCompany(companyId, { team: updatedTeamIds }),
      () => updatePerson(personId, { company: companyId }),
    ]);

    return RelationshipValidator.createSuccessResult(
      'Successfully linked person to company bidirectionally',
      personId,
      companyId,
      updatedTeamIds.length
    );
  }

  /**
   * Execute partial unlink resolution for inconsistent relationships
   */
  static async executePartialUnlinkResolution(
    personId: string,
    companyId: string,
    isInTeam: boolean,
    isCompanySet: boolean,
    currentTeamIds: string[],
    currentPersonCompanyId: string | null
  ): Promise<RelationshipOperationResult> {
    return await handleInconsistentUnlink(personId, companyId, {
      isInTeam,
      isCompanySet,
      currentTeamIds,
      currentPersonCompanyId,
    });
  }

  /**
   * Execute full bidirectional unlinking
   */
  static async executeFullUnlinking(
    personId: string,
    companyId: string,
    currentTeamIds: string[]
  ): Promise<RelationshipOperationResult> {
    const updatedTeamIds = currentTeamIds.filter((id) => id !== personId);
    await executeWithRetry([
      () => updateCompany(companyId, { team: updatedTeamIds }),
      () => updatePerson(personId, { company: undefined }),
    ]);

    return RelationshipValidator.createSuccessResult(
      'Successfully unlinked person from company bidirectionally',
      personId,
      companyId,
      updatedTeamIds.length
    );
  }
}
