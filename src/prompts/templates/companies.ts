/**
 * Companies-related prompt templates
 */
import type { PromptTemplate } from '../types.js';

/**
 * Prompt templates for company operations
 */
export const companiesPrompts: PromptTemplate[] = [
  {
    id: 'create-company',
    title: 'Create a new company',
    description:
      'Create a new company record in Attio with the provided details',
    category: 'companies',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the company',
        required: true,
      },
      {
        name: 'website',
        type: 'string',
        description: 'Website URL of the company',
        required: false,
      },
      {
        name: 'industry',
        type: 'string',
        description: 'Industry the company operates in',
        required: false,
      },
      {
        name: 'size',
        type: 'string',
        description:
          'Size of the company (e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1001+")',
        required: false,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001+'],
      },
      {
        name: 'description',
        type: 'string',
        description: 'Brief description of the company',
        required: false,
      },
    ],
    template:
      'Create a new company named {{name}}{{#if website}} with website {{website}}{{/if}}{{#if industry}} in the {{industry}} industry{{/if}}{{#if size}} with {{size}} employees{{/if}}{{#if description}}. Description: {{description}}{{/if}}.',
  },
  {
    id: 'find-company-by-name',
    title: 'Find a company by name',
    description: 'Search for a company in Attio using its name',
    category: 'companies',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Company name to search for',
        required: true,
      },
    ],
    template: 'Find a company with the name {{name}}.',
  },
  {
    id: 'update-company',
    title: 'Update company details',
    description: 'Update an existing company record in Attio',
    category: 'companies',
    parameters: [
      {
        name: 'companyId',
        type: 'string',
        description: 'ID of the company to update',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        description: 'New name for the company',
        required: false,
      },
      {
        name: 'website',
        type: 'string',
        description: 'New website URL for the company',
        required: false,
      },
      {
        name: 'industry',
        type: 'string',
        description: 'New industry for the company',
        required: false,
      },
      {
        name: 'description',
        type: 'string',
        description: 'New description for the company',
        required: false,
      },
    ],
    template:
      'Update the company with ID {{companyId}}{{#if name}} to change its name to {{name}}{{/if}}{{#if website}}, update its website to {{website}}{{/if}}{{#if industry}}, update its industry to {{industry}}{{/if}}{{#if description}}, and update its description to "{{description}}"{{/if}}.',
  },
  {
    id: 'add-note-to-company',
    title: 'Add a note to a company',
    description: 'Add a note to an existing company record in Attio',
    category: 'companies',
    parameters: [
      {
        name: 'companyId',
        type: 'string',
        description: 'ID of the company to add a note to',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Title of the note',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'Content of the note',
        required: true,
      },
    ],
    template:
      'Add a note titled "{{title}}" with content "{{content}}" to the company with ID {{companyId}}.',
  },
];

export default companiesPrompts;
