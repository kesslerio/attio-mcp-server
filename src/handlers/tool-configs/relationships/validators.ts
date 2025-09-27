/**
 * Relationship validation utilities for improved SRP compliance
 */

import { RelationshipOperationResult } from './types.js';
import {
  getTypedErrorMessage,
  type TypedError,
} from '../universal/typed-error-handling.js';

export interface ValidationResult {
  isValid: boolean;
  shouldProceed: boolean;
  result?: RelationshipOperationResult;
}

export interface InconsistencyReport {
  hasInconsistency: boolean;
  type: 'partial_link' | 'partial_unlink' | 'mismatch' | 'none';
  description: string;
}

export class RelationshipValidator {
  /**
   * Validate linking operation and determine if it should proceed
   */
  static validateForLink(
    personId: string,
    companyId: string,
    isInTeam: boolean,
    isCompanySet: boolean,
    hasConflict: boolean,
    conflictMessage: string | undefined,
    currentTeamIds: string[]
  ): ValidationResult {
    // Already fully linked
    if (isInTeam && isCompanySet) {
      return {
        isValid: true,
        shouldProceed: false,
        result: {
          success: true,
          message: 'Person is already bidirectionally linked to this company',
          companyId,
          personId,
          teamSize: currentTeamIds.length,
        },
      };
    }

    // Conflict: person already has different company
    if (hasConflict && conflictMessage) {
      return {
        isValid: false,
        shouldProceed: false,
        result: {
          success: false,
          message: conflictMessage,
          companyId,
          personId,
          error: 'Person already has a different company assigned',
        },
      };
    }

    // Valid operation that should proceed
    return {
      isValid: true,
      shouldProceed: true,
    };
  }

  /**
   * Validate unlinking operation and determine if it should proceed
   */
  static validateForUnlink(
    personId: string,
    companyId: string,
    isInTeam: boolean,
    isCompanySet: boolean,
    currentTeamIds: string[]
  ): ValidationResult {
    // Not linked at all
    if (!isInTeam && !isCompanySet) {
      return {
        isValid: true,
        shouldProceed: false,
        result: {
          success: true,
          message: 'Person is not linked to this company',
          companyId,
          personId,
          teamSize: currentTeamIds.length,
        },
      };
    }

    // Valid operation that should proceed
    return {
      isValid: true,
      shouldProceed: true,
    };
  }

  /**
   * Detect relationship inconsistencies for reporting
   */
  static detectInconsistencies(
    isInTeam: boolean,
    isCompanySet: boolean,
    currentPersonCompanyId: string | null,
    targetCompanyId: string
  ): InconsistencyReport {
    // Check for partial linking
    if (isInTeam && !isCompanySet) {
      return {
        hasInconsistency: true,
        type: 'partial_link',
        description: 'Person is in company team but company field is not set',
      };
    }

    if (!isInTeam && isCompanySet) {
      return {
        hasInconsistency: true,
        type: 'partial_link',
        description: 'Person has company field set but is not in team',
      };
    }

    // Check for company mismatch
    if (currentPersonCompanyId && currentPersonCompanyId !== targetCompanyId) {
      return {
        hasInconsistency: true,
        type: 'mismatch',
        description: `Person's company field points to ${currentPersonCompanyId}, not ${targetCompanyId}`,
      };
    }

    return {
      hasInconsistency: false,
      type: 'none',
      description: 'No inconsistencies detected',
    };
  }

  /**
   * Create successful operation result
   */
  static createSuccessResult(
    message: string,
    personId: string,
    companyId: string,
    teamSize: number
  ): RelationshipOperationResult {
    return {
      success: true,
      message,
      companyId,
      personId,
      teamSize,
    };
  }

  /**
   * Create failed operation result
   */
  static createFailureResult(
    message: string,
    personId: string,
    companyId: string,
    error: string
  ): RelationshipOperationResult {
    return {
      success: false,
      message,
      companyId,
      personId,
      error,
    };
  }
}
