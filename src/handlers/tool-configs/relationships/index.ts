/**
 * Relationship helper tool configurations
 *
 * These tools provide intuitive ways to manage relationships between
 * people and companies in Attio, abstracting away the complexity of
 * which direction the relationship needs to be updated.
 */

import {
  getCompanyDetails,
  updateCompany,
} from '../../../objects/companies/index.js';
import { getPersonDetails } from '../../../objects/people/index.js';
import { ToolConfig } from '../../tool-types.js';

export interface LinkPersonToCompanyToolConfig extends ToolConfig {
  handler: (personId: string, companyId: string) => Promise<any>;
}

export interface UnlinkPersonFromCompanyToolConfig extends ToolConfig {
  handler: (personId: string, companyId: string) => Promise<any>;
}

export interface GetPersonCompaniesToolConfig extends ToolConfig {
  handler: (personId: string) => Promise<any[]>;
}

export interface GetCompanyTeamToolConfig extends ToolConfig {
  handler: (companyId: string) => Promise<any[]>;
}

/**
 * Helper function to link a person to a company by updating the company's team field
 */
async function linkPersonToCompany(
  personId: string,
  companyId: string
): Promise<any> {
  try {
    // Get current company details to preserve existing team members
    const company = await getCompanyDetails(companyId);

    // Extract current team members
    const currentTeam = company.values?.team || [];
    const currentTeamIds = Array.isArray(currentTeam)
      ? currentTeam
          .map(
            (member: any) =>
              member.target_record_id || member.record_id || member
          )
          .filter(Boolean)
      : [];

    // Check if person is already in the team
    if (currentTeamIds.includes(personId)) {
      return {
        success: true,
        message: 'Person is already linked to this company',
        companyId,
        personId,
      };
    }

    // Add new person to team
    const updatedTeamIds = [...currentTeamIds, personId];

    // Update company with new team
    const _updatedCompany = await updateCompany(companyId, {
      team: updatedTeamIds.map((id) => ({ target_record_id: id })),
    });

    return {
      success: true,
      message: 'Successfully linked person to company',
      companyId,
      personId,
      teamSize: updatedTeamIds.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to link person to company: ${(error as Error).message}`
    );
  }
}

/**
 * Helper function to unlink a person from a company
 */
async function unlinkPersonFromCompany(
  personId: string,
  companyId: string
): Promise<any> {
  try {
    // Get current company details
    const company = await getCompanyDetails(companyId);

    // Extract current team members
    const currentTeam = company.values?.team || [];
    const currentTeamIds = Array.isArray(currentTeam)
      ? currentTeam
          .map(
            (member: any) =>
              member.target_record_id || member.record_id || member
          )
          .filter(Boolean)
      : [];

    // Check if person is in the team
    if (!currentTeamIds.includes(personId)) {
      return {
        success: true,
        message: 'Person is not linked to this company',
        companyId,
        personId,
      };
    }

    // Remove person from team
    const updatedTeamIds = currentTeamIds.filter((id) => id !== personId);

    // Update company with new team
    const _updatedCompany = await updateCompany(companyId, {
      team: updatedTeamIds.map((id) => ({ target_record_id: id })),
    });

    return {
      success: true,
      message: 'Successfully unlinked person from company',
      companyId,
      personId,
      teamSize: updatedTeamIds.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to unlink person from company: ${(error as Error).message}`
    );
  }
}

/**
 * Get all companies a person is associated with
 */
async function getPersonCompanies(personId: string): Promise<any[]> {
  try {
    const person = await getPersonDetails(personId);
    const companies = person.values?.companies || [];

    return Array.isArray(companies)
      ? companies.map((company: any) => ({
          id: company.target_record_id || company.record_id || company,
          name: company.name || 'Unknown Company',
        }))
      : [];
  } catch (error) {
    throw new Error(
      `Failed to get person's companies: ${(error as Error).message}`
    );
  }
}

/**
 * Get all team members for a company
 */
async function getCompanyTeam(companyId: string): Promise<any[]> {
  try {
    const company = await getCompanyDetails(companyId);
    const team = company.values?.team || [];

    return Array.isArray(team)
      ? team.map((member: any) => ({
          id: member.target_record_id || member.record_id || member,
          name: member.name || 'Unknown Person',
        }))
      : [];
  } catch (error) {
    throw new Error(`Failed to get company team: ${(error as Error).message}`);
  }
}

// Relationship tool configurations
export const relationshipToolConfigs = {
  linkPersonToCompany: {
    name: 'link-person-to-company',
    handler: linkPersonToCompany,
    formatResult: (result: any) => {
      if (result.success) {
        return result.message;
      }
      return `Failed to link person to company: ${result.error}`;
    },
  } as LinkPersonToCompanyToolConfig,

  unlinkPersonFromCompany: {
    name: 'unlink-person-from-company',
    handler: unlinkPersonFromCompany,
    formatResult: (result: any) => {
      if (result.success) {
        return result.message;
      }
      return `Failed to unlink person from company: ${result.error}`;
    },
  } as UnlinkPersonFromCompanyToolConfig,

  getPersonCompanies: {
    name: 'get-person-companies',
    handler: getPersonCompanies,
    formatResult: (companies: any[]) => {
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
    formatResult: (team: any[]) => {
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
      "Link a person to a company as a team member. This updates the company's team field to include the person.",
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
      "Remove a person from a company's team. This updates the company's team field to exclude the person.",
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
    description: 'Get all companies that a person is associated with',
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
    description: 'Get all team members (people) associated with a company',
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
