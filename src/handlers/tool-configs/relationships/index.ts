/**
 * Relationship helper tool configurations
 *
 * These tools provide intuitive ways to manage relationships between
 * people and companies in Attio, abstracting away the complexity of
 * which direction the relationship needs to be updated.
 */
import { ToolConfig } from '../../tool-types.js';
import { getCompanyDetails } from '../../../objects/companies/index.js';
import {
  getPersonDetails,
  updatePerson,
} from '../../../objects/people/index.js';
import { updateCompany } from '../../../objects/companies/index.js';

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

interface TeamMember {
  target_record_id?: string;
  record_id?: string;
  name?: string;
}

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
    // Get current company and person details
    const [company, person] = await Promise.all([
      getCompanyDetails(companyId),
      getPersonDetails(personId),
    ]);

    // Extract current team members
    const currentTeam = company.values?.team || [];
    const currentTeamIds = Array.isArray(currentTeam)
      ? currentTeam
          .map((member: TeamMember | string) =>
            typeof member === 'string'
              ? member
              : member.target_record_id || member.record_id || String(member)
          )
          .filter(Boolean)
      : [];

    // Extract current person's company
    const currentPersonCompany = person.values?.company;
    const currentPersonCompanyId = currentPersonCompany
      ? typeof currentPersonCompany === 'string'
        ? currentPersonCompany
        : String(currentPersonCompany)
      : null;

    // Check if already linked bidirectionally
    const isInTeam = currentTeamIds.includes(personId);
    const isCompanySet = currentPersonCompanyId === companyId;

    if (isInTeam && isCompanySet) {
      return {
        success: true,
        message: 'Person is already bidirectionally linked to this company',
        companyId,
        personId,
        teamSize: currentTeamIds.length,
      };
    }

    // If partially linked, we'll fix the inconsistency
    if (isInTeam && !isCompanySet) {
      // Person is in company team but company not set on person - update person only
      await updatePerson(personId, { company: companyId });
      return {
        success: true,
        message:
          'Fixed relationship inconsistency: updated person company field',
        companyId,
        personId,
        teamSize: currentTeamIds.length,
      };
    }

    if (!isInTeam && isCompanySet) {
      // Person has company set but not in team - update company team only
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

    // Handle person already having a different company
    if (currentPersonCompanyId && currentPersonCompanyId !== companyId) {
      return {
        success: false,
        message: `Person is already linked to company ${currentPersonCompanyId}. Use unlink-person-from-company first.`,
        companyId,
        personId,
        error: 'Person already has a different company assigned',
      };
    }

    // Perform bidirectional linking - add to team and set company
    const updatedTeamIds = [...currentTeamIds, personId];

    // Use Promise.all for atomic-like operation (though not truly atomic in API)
    await Promise.all([
      updateCompany(companyId, { team: updatedTeamIds }),
      updatePerson(personId, { company: companyId }),
    ]);

    return {
      success: true,
      message: 'Successfully linked person to company bidirectionally',
      companyId,
      personId,
      teamSize: updatedTeamIds.length,
    };
  } catch (error: unknown) {
    throw new Error(
      `Failed to link person to company: ${(error as Error).message}`
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
    // Get current company and person details
    const [company, person] = await Promise.all([
      getCompanyDetails(companyId),
      getPersonDetails(personId),
    ]);

    // Extract current team members
    const currentTeam = company.values?.team || [];
    const currentTeamIds = Array.isArray(currentTeam)
      ? currentTeam
          .map((member: TeamMember | string) =>
            typeof member === 'string'
              ? member
              : member.target_record_id || member.record_id || String(member)
          )
          .filter(Boolean)
      : [];

    // Extract current person's company
    const currentPersonCompany = person.values?.company;
    const currentPersonCompanyId = currentPersonCompany
      ? typeof currentPersonCompany === 'string'
        ? currentPersonCompany
        : String(currentPersonCompany)
      : null;

    // Check current linking state
    const isInTeam = currentTeamIds.includes(personId);
    const isCompanySet = currentPersonCompanyId === companyId;

    // If not linked at all, return success
    if (!isInTeam && !isCompanySet) {
      return {
        success: true,
        message: 'Person is not linked to this company',
        companyId,
        personId,
        teamSize: currentTeamIds.length,
      };
    }

    // If partially linked, fix the inconsistency
    if (isInTeam && !isCompanySet) {
      // Person is in team but company not set - remove from team only
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
      // Person has company set but not in team - clear person company only
      await updatePerson(personId, { company: undefined });
      return {
        success: true,
        message:
          'Fixed relationship inconsistency: cleared person company field',
        companyId,
        personId,
        teamSize: currentTeamIds.length,
      };
    }

    // If person's company doesn't match the target company, warn but proceed
    if (currentPersonCompanyId && currentPersonCompanyId !== companyId) {
      // Still remove from team if they're in it, but warn about company mismatch
      if (isInTeam) {
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
    }

    // Perform bidirectional unlinking - remove from team and clear company
    const updatedTeamIds = currentTeamIds.filter((id) => id !== personId);

    // Use Promise.all for atomic-like operation
    await Promise.all([
      updateCompany(companyId, { team: updatedTeamIds }),
      updatePerson(personId, { company: undefined }),
    ]);

    return {
      success: true,
      message: 'Successfully unlinked person from company bidirectionally',
      companyId,
      personId,
      teamSize: updatedTeamIds.length,
    };
  } catch (error: unknown) {
    throw new Error(
      `Failed to unlink person from company: ${(error as Error).message}`
    );
  }
}

/**
 * Get all companies a person is associated with, with bidirectional consistency validation
 */
async function getPersonCompanies(personId: string): Promise<CompanyInfo[]> {
  try {
    const person = await getPersonDetails(personId);

    // Check person's direct company field first
    const personCompany = person.values?.company;
    const personCompanyId = personCompany
      ? typeof personCompany === 'string'
        ? personCompany
        : String(personCompany)
      : null;

    const result: CompanyInfo[] = [];

    if (personCompanyId) {
      try {
        // Get company details to validate bidirectional consistency
        const company = await getCompanyDetails(personCompanyId);
        const companyName =
          (company.values?.name as { value: string }[] | undefined)?.[0]
            ?.value || 'Unknown Company';

        // Check if person is in company's team
        const currentTeam = company.values?.team || [];
        const currentTeamIds = Array.isArray(currentTeam)
          ? currentTeam
              .map((member: TeamMember | string) =>
                typeof member === 'string'
                  ? member
                  : member.target_record_id ||
                    member.record_id ||
                    String(member)
              )
              .filter(Boolean)
          : [];

        const isInTeam = currentTeamIds.includes(personId);

        result.push({
          id: personCompanyId,
          name: isInTeam
            ? companyName
            : `${companyName} ⚠️ (inconsistent - not in team)`,
        });
      } catch (companyError) {
        // Company might not exist or be accessible
        result.push({
          id: personCompanyId,
          name: '⚠️ Unknown Company (company not found)',
        });
      }
    }

    // Also check legacy companies field if it exists (backward compatibility)
    const legacyCompanies = person.values?.companies || [];
    if (Array.isArray(legacyCompanies) && legacyCompanies.length > 0) {
      const legacyCompanyInfos = legacyCompanies.map(
        (company: TeamMember | string) => ({
          id:
            typeof company === 'string'
              ? company
              : company.target_record_id ||
                company.record_id ||
                String(company),
          name:
            typeof company === 'string'
              ? 'Unknown Company (legacy field)'
              : `${company.name || 'Unknown Company'} (legacy field)`,
        })
      );

      // Add legacy companies that aren't already in the main company field
      legacyCompanyInfos.forEach((legacyCompany) => {
        if (!result.some((existing) => existing.id === legacyCompany.id)) {
          result.push(legacyCompany);
        }
      });
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
      const memberId =
        typeof member === 'string'
          ? member
          : member.target_record_id || member.record_id || String(member);

      if (!memberId) continue;

      try {
        // Get person details to validate bidirectional consistency
        const person = await getPersonDetails(memberId);
        const personName =
          (person.values?.name as { value: string }[] | undefined)?.[0]
            ?.value ||
          (person.values?.full_name as { value: string }[] | undefined)?.[0]
            ?.value ||
          'Unknown Person';

        // Check if person's company field points back to this company
        const personCompany = person.values?.company;
        const personCompanyId = personCompany
          ? typeof personCompany === 'string'
            ? personCompany
            : String(personCompany)
          : null;

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
    throw new Error(`Failed to get company team: ${(error as Error).message}`);
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
