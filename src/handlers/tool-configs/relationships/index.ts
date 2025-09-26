/**
 * Relationship helper tool configurations
 *
 * These tools provide intuitive ways to manage relationships between
 * people and companies in Attio, abstracting away the complexity of
 * which direction the relationship needs to be updated.
 */
import { ToolConfig } from '@handlers/tool-types.js';
import {
  extractRecordIds,
  extractSingleRecordId,
  analyzeRelationshipState,
  executeWithRetry,
  type TeamMember,
} from '@utils/relationship-helpers.js';
import { getCompanyDetails } from '@src/objects/companies/index.js';
import { getPersonDetails, updatePerson } from '@src/objects/people/index.js';
import { updateCompany } from '@src/objects/companies/index.js';
import { RelationshipStateAnalyzer } from './state-analyzer.js';
import { RelationshipValidator } from './validators.js';
import { RelationshipOperationExecutor } from './operation-executors.js';
import { getTypedErrorMessage } from '../universal/typed-error-handling.js';

// Relationship result interfaces
interface RelationshipOperationResult {
  success: boolean;
  message: string;
  companyId: string;
  personId: string;
  teamSize?: number;
  error?: string;
}

interface CompanyInfo {
  id: string;
  name: string;
}

interface PersonInfo {
  id: string;
  name: string;
}

// TeamMember type is now imported from @utils/relationship-helpers.js

export interface LinkPersonToCompanyToolConfig extends ToolConfig {
  handler: (
    personId: string,
    companyId: string
  ) => Promise<RelationshipOperationResult>;
}

export interface UnlinkPersonFromCompanyToolConfig extends ToolConfig {
  handler: (
    personId: string,
    companyId: string
  ) => Promise<RelationshipOperationResult>;
}

export interface GetPersonCompaniesToolConfig extends ToolConfig {
  handler: (personId: string) => Promise<CompanyInfo[]>;
}

export interface GetCompanyTeamToolConfig extends ToolConfig {
  handler: (companyId: string) => Promise<PersonInfo[]>;
}

/**
 * Helper function to bidirectionally link a person to a company
 * Updates both the company's team field and the person's company field
 */
async function linkPersonToCompany(
  personId: string,
  companyId: string
): Promise<RelationshipOperationResult> {
  try {
    // Analyze current relationship state
    const state = await RelationshipStateAnalyzer.analyzeForLinking(
      personId,
      companyId
    );

    // Validate operation before proceeding
    const validation = RelationshipValidator.validateForLink(
      personId,
      companyId,
      state.isInTeam,
      state.isCompanySet,
      state.hasConflict,
      state.conflictMessage,
      state.currentTeamIds
    );

    // Return early if validation says not to proceed
    if (!validation.shouldProceed) {
      return validation.result!;
    }

    // Handle partial linking inconsistencies
    if (state.isInTeam || state.isCompanySet) {
      return await RelationshipOperationExecutor.executePartialLinkResolution(
        personId,
        companyId,
        state.isInTeam,
        state.isCompanySet,
        state.currentTeamIds
      );
    }

    // Perform new bidirectional linking
    return await RelationshipOperationExecutor.executeFullLinking(
      personId,
      companyId,
      state.currentTeamIds
    );
  } catch (error: unknown) {
    throw new Error(
      `Failed to link person to company: ${getTypedErrorMessage(error)}`
    );
  }
}

/**
 * Helper function to bidirectionally unlink a person from a company
 * Updates both the company's team field and the person's company field
 */
async function unlinkPersonFromCompany(
  personId: string,
  companyId: string
): Promise<RelationshipOperationResult> {
  try {
    // Analyze current relationship state
    const state = await RelationshipStateAnalyzer.analyzeForUnlinking(
      personId,
      companyId
    );

    // Validate operation before proceeding
    const validation = RelationshipValidator.validateForUnlink(
      personId,
      companyId,
      state.isInTeam,
      state.isCompanySet,
      state.currentTeamIds
    );

    // Return early if validation says not to proceed
    if (!validation.shouldProceed) {
      return validation.result!;
    }

    // Handle partial relationships or mismatches
    if (state.needsPartialUnlink) {
      return await RelationshipOperationExecutor.executePartialUnlinkResolution(
        personId,
        companyId,
        state.isInTeam,
        state.isCompanySet,
        state.currentTeamIds,
        state.currentPersonCompanyId
      );
    }

    // Perform full bidirectional unlinking
    return await RelationshipOperationExecutor.executeFullUnlinking(
      personId,
      companyId,
      state.currentTeamIds
    );
  } catch (error: unknown) {
    throw new Error(
      `Failed to unlink person from company: ${getTypedErrorMessage(error)}`
    );
  }
}

/**
 * Helper function to validate company and check bidirectional consistency
 */
async function validateCompanyForPerson(
  personId: string,
  companyId: string
): Promise<CompanyInfo> {
  try {
    const company = await getCompanyDetails(companyId);
    const companyName =
      (company.values?.name as { value: string }[] | undefined)?.[0]?.value ||
      'Unknown Company';

    const currentTeamIds = extractRecordIds(
      (company.values?.team as TeamMember[]) || []
    );
    const isInTeam = currentTeamIds.includes(personId);

    return {
      id: companyId,
      name: isInTeam
        ? companyName
        : `${companyName} ⚠️ (inconsistent - not in team)`,
    };
  } catch {
    return {
      id: companyId,
      name: '⚠️ Unknown Company (company not found)',
    };
  }
}

/**
 * Helper function to process legacy companies field
 */
function processLegacyCompanies(
  legacyCompanies: (TeamMember | string)[],
  existingCompanyIds: string[]
): CompanyInfo[] {
  return legacyCompanies
    .map((company: TeamMember | string) => ({
      id:
        typeof company === 'string'
          ? company
          : company.target_record_id || company.record_id || String(company),
      name:
        typeof company === 'string'
          ? 'Unknown Company (legacy field)'
          : `${company.name || 'Unknown Company'} (legacy field)`,
    }))
    .filter((legacyCompany) => !existingCompanyIds.includes(legacyCompany.id));
}

/**
 * Get all companies a person is associated with, with bidirectional consistency validation
 */
async function getPersonCompanies(personId: string): Promise<CompanyInfo[]> {
  try {
    const person = await getPersonDetails(personId);
    const result: CompanyInfo[] = [];

    // Process primary company field
    const personCompany = person.values?.company;
    const personCompanyId = personCompany
      ? typeof personCompany === 'string'
        ? personCompany
        : String(personCompany)
      : null;

    if (personCompanyId) {
      const companyInfo = await validateCompanyForPerson(
        personId,
        personCompanyId
      );
      result.push(companyInfo);
    }

    // Process legacy companies field for backward compatibility
    const legacyCompanies = person.values?.companies || [];
    if (Array.isArray(legacyCompanies) && legacyCompanies.length > 0) {
      const existingIds = result.map((c) => c.id);
      const legacyCompanyInfos = processLegacyCompanies(
        legacyCompanies,
        existingIds
      );
      result.push(...legacyCompanyInfos);
    }

    return result;
  } catch (error: unknown) {
    throw new Error(
      `Failed to get person's companies: ${(error as Error).message}`
    );
  }
}

/**
 * Get all team members for a company, with bidirectional consistency validation
 */
async function getCompanyTeam(companyId: string): Promise<PersonInfo[]> {
  try {
    const company = await getCompanyDetails(companyId);
    const team = company.values?.team || [];

    if (!Array.isArray(team) || team.length === 0) {
      return [];
    }

    const result: PersonInfo[] = [];

    // Process each team member and validate bidirectional consistency
    for (const member of team) {
      const memberId = extractSingleRecordId(member);

      if (!memberId) continue;

      try {
        // Get person details and extract name using analyzer utility
        const person = await getPersonDetails(memberId);
        const personName = RelationshipStateAnalyzer.extractPersonName(person);

        // Check consistency using analyzer utility
        const personCompanyId =
          RelationshipStateAnalyzer.extractPersonCompanyId(person);
        const isConsistent = personCompanyId === companyId;

        result.push({
          id: memberId,
          name: isConsistent
            ? personName
            : `${personName} ⚠️ (inconsistent - company field: ${personCompanyId || 'none'})`,
        });
      } catch (personError) {
        // Person might not exist or be accessible
        result.push({
          id: memberId,
          name: '⚠️ Unknown Person (person not found)',
        });
      }
    }

    return result;
  } catch (error: unknown) {
    throw new Error(
      `Failed to get company team: ${getTypedErrorMessage(error)}`
    );
  }
}

// Relationship tool configurations
export const relationshipToolConfigs = {
  linkPersonToCompany: {
    name: 'link-person-to-company',
    handler: linkPersonToCompany,
    formatResult: (result: RelationshipOperationResult) => {
      if (result.success) {
        return result.message;
      }
      return `Failed to link person to company: ${result.error}`;
    },
  } as LinkPersonToCompanyToolConfig,

  unlinkPersonFromCompany: {
    name: 'unlink-person-from-company',
    handler: unlinkPersonFromCompany,
    formatResult: (result: RelationshipOperationResult) => {
      if (result.success) {
        return result.message;
      }
      return `Failed to unlink person from company: ${result.error}`;
    },
  } as UnlinkPersonFromCompanyToolConfig,

  getPersonCompanies: {
    name: 'get-person-companies',
    handler: getPersonCompanies,
    formatResult: (companies: CompanyInfo[]) => {
      if (companies.length === 0) {
        return 'This person is not associated with any companies.';
      }
      return `Person is associated with ${companies.length} companies:\n${companies
        .map((c) => `- ${c.name} (ID: ${c.id})`)
        .join('\n')}`;
    },
  } as GetPersonCompaniesToolConfig,

  getCompanyTeam: {
    name: 'get-company-team',
    handler: getCompanyTeam,
    formatResult: (team: PersonInfo[]) => {
      if (team.length === 0) {
        return 'This company has no team members.';
      }
      return `Company has ${team.length} team members:\n${team
        .map((m) => `- ${m.name} (ID: ${m.id})`)
        .join('\n')}`;
    },
  } as GetCompanyTeamToolConfig,
};

// Relationship tool definitions
export const relationshipToolDefinitions = [
  {
    name: 'link-person-to-company',
    description:
      "Bidirectionally link a person to a company. Updates both the company's team field and the person's company field. Handles relationship inconsistencies and prevents conflicts with existing company assignments.",
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'ID of the person to link',
        },
        companyId: {
          type: 'string',
          description: 'ID of the company to link the person to',
        },
      },
      required: ['personId', 'companyId'],
    },
  },
  {
    name: 'unlink-person-from-company',
    description:
      "Bidirectionally unlink a person from a company. Updates both the company's team field and the person's company field. Handles partial relationships and inconsistencies gracefully.",
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'ID of the person to unlink',
        },
        companyId: {
          type: 'string',
          description: 'ID of the company to unlink the person from',
        },
      },
      required: ['personId', 'companyId'],
    },
  },
  {
    name: 'get-person-companies',
    description:
      'Get all companies that a person is associated with, with bidirectional consistency validation. Shows warnings for inconsistent relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'ID of the person',
        },
      },
      required: ['personId'],
    },
  },
  {
    name: 'get-company-team',
    description:
      'Get all team members (people) associated with a company, with bidirectional consistency validation. Shows warnings for inconsistent relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
      },
      required: ['companyId'],
    },
  },
];
