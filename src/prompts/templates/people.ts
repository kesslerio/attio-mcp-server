/**
 * People-related prompt templates
 */
import type { PromptTemplate } from '../types.js';

/**
 * Prompt templates for people operations
 */
export const peoplePrompts: PromptTemplate[] = [
  {
    id: 'create-person',
    title: 'Create a new person',
    description:
      'Create a new person record in Attio with the provided details',
    category: 'people',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Full name of the person',
        required: true,
      },
      {
        name: 'email',
        type: 'string',
        description: 'Email address of the person',
        required: false,
      },
      {
        name: 'phone',
        type: 'string',
        description: 'Phone number of the person',
        required: false,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Job title of the person',
        required: false,
      },
      {
        name: 'company',
        type: 'string',
        description: 'Company name the person works for',
        required: false,
      },
    ],
    template:
      'Create a new person named {{name}}{{#if email}} with email {{email}}{{/if}}{{#if phone}} and phone number {{phone}}{{/if}}{{#if title}} who works as {{title}}{{/if}}{{#if company}} at {{company}}{{/if}}.',
  },
  {
    id: 'find-person-by-email',
    title: 'Find a person by email',
    description: 'Search for a person in Attio using their email address',
    category: 'people',
    parameters: [
      {
        name: 'email',
        type: 'string',
        description: 'Email address to search for',
        required: true,
      },
    ],
    template: 'Find a person with the email address {{email}}.',
  },
  {
    id: 'update-person',
    title: 'Update person details',
    description: 'Update an existing person record in Attio',
    category: 'people',
    parameters: [
      {
        name: 'personId',
        type: 'string',
        description: 'ID of the person to update',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        description: 'New name for the person',
        required: false,
      },
      {
        name: 'email',
        type: 'string',
        description: 'New email address for the person',
        required: false,
      },
      {
        name: 'phone',
        type: 'string',
        description: 'New phone number for the person',
        required: false,
      },
      {
        name: 'title',
        type: 'string',
        description: 'New job title for the person',
        required: false,
      },
    ],
    template:
      'Update the person with ID {{personId}}{{#if name}} to change their name to {{name}}{{/if}}{{#if email}}, update their email to {{email}}{{/if}}{{#if phone}}, update their phone number to {{phone}}{{/if}}{{#if title}}, and update their job title to {{title}}{{/if}}.',
  },
  {
    id: 'add-note-to-person',
    title: 'Add a note to a person',
    description: 'Add a note to an existing person record in Attio',
    category: 'people',
    parameters: [
      {
        name: 'personId',
        type: 'string',
        description: 'ID of the person to add a note to',
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
      'Add a note titled "{{title}}" with content "{{content}}" to the person with ID {{personId}}.',
  },
];

export default peoplePrompts;
