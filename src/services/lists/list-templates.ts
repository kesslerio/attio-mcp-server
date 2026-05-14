/**
 * Static list template catalog and expansion logic.
 *
 * Templates provide opinionated defaults for common CRM list types.
 * Template expansion merges caller overrides onto template defaults
 * before validation, so dry-run and error messages reference actual values.
 */
import type { ListTemplate } from './types.js';

/**
 * The static template catalog. Easy to extend by adding entries.
 */
export const LIST_TEMPLATES: Readonly<Record<string, ListTemplate>> = {
  sales_pipeline: {
    name: 'Sales Pipeline',
    parent_object: 'companies',
    description: 'Track deals through pipeline stages',
    attributes: {
      stages: [
        'Prospect',
        'Qualified',
        'Demo',
        'Proposal',
        'Negotiation',
        'Won',
        'Lost',
      ],
    },
  },
  recruiting_tracker: {
    name: 'Recruiting Tracker',
    parent_object: 'people',
    description: 'Track candidates through the hiring process',
    attributes: {
      stages: [
        'Applied',
        'Screening',
        'Interview',
        'Offer',
        'Hired',
        'Rejected',
      ],
    },
  },
  support_queue: {
    name: 'Support Queue',
    parent_object: 'companies',
    description: 'Manage support tickets by priority and status',
    attributes: {
      stages: ['New', 'In Progress', 'Waiting', 'Resolved', 'Closed'],
    },
  },
};

/**
 * Return the list of valid template names.
 */
export function getTemplateNames(): string[] {
  return Object.keys(LIST_TEMPLATES);
}

/**
 * Expand a template by merging caller overrides onto template defaults.
 *
 * Caller values take precedence over template defaults.
 * The `name` and `parent_object` from the template are used as defaults
 * only if the caller does not supply them.
 *
 * @throws Error if the template name is not found in the catalog
 */
export function expandTemplate(
  templateName: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const template = LIST_TEMPLATES[templateName];
  if (!template) {
    const valid = getTemplateNames().join(', ');
    throw new Error(
      `Unknown template "${templateName}". Valid templates: ${valid}`
    );
  }

  // Start with template defaults, then overlay caller overrides
  const expanded: Record<string, unknown> = {
    name: template.name,
    parent_object: template.parent_object,
    ...template.attributes,
    ...overrides,
  };

  // Preserve template description if caller didn't override
  if (!overrides.description && template.description) {
    expanded.description = template.description;
  }

  return expanded;
}
