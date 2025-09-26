/**
 * Type definitions for relationship operations
 */

export interface RelationshipOperationResult {
  success: boolean;
  message: string;
  companyId: string;
  personId: string;
  teamSize?: number;
  error?: string;
}

export interface PersonInfo {
  id: string;
  name: string;
}

export interface RelationshipState {
  isInTeam: boolean;
  isCompanySet: boolean;
  currentTeamIds: string[];
  currentPersonCompanyId?: string | null;
}
