import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { MetadataResult, MetadataTransformService } from './types.js';

const TASK_ATTRIBUTE_DEFINITIONS = [
  {
    id: 'content',
    api_slug: 'content',
    title: 'Content',
    type: 'text',
    category: 'basic',
    description: 'The main text/description of the task',
    required: true,
  },
  {
    id: 'status',
    api_slug: 'status',
    title: 'Status',
    type: 'text',
    category: 'basic',
    description: 'Task completion status (e.g., pending, completed)',
    required: false,
  },
  {
    id: 'assignee',
    api_slug: 'assignee',
    title: 'Assignee',
    type: 'person-reference',
    category: 'business',
    description: 'Person assigned to this task',
    required: false,
  },
  {
    id: 'assignee_id',
    api_slug: 'assignee_id',
    title: 'Assignee ID',
    type: 'text',
    category: 'business',
    description: 'ID of the workspace member assigned to this task',
    required: false,
  },
  {
    id: 'due_date',
    api_slug: 'due_date',
    title: 'Due Date',
    type: 'date',
    category: 'basic',
    description: 'When the task is due (ISO date format)',
    required: false,
  },
  {
    id: 'linked_records',
    api_slug: 'linked_records',
    title: 'Linked Records',
    type: 'record-reference',
    category: 'business',
    description: 'Records this task is associated with',
    required: false,
  },
];

const TASK_MAPPING_SYNONYMS: Record<string, string> = {
  title: 'content',
  name: 'content',
  description: 'content',
  assignee: 'assignee_id',
  due: 'due_date',
  record: 'linked_records',
};

export function buildTaskMetadata(
  transformService: MetadataTransformService,
  categories?: string[]
): MetadataResult {
  const filtered = categories?.length
    ? (transformService.filterByCategory(
        TASK_ATTRIBUTE_DEFINITIONS,
        categories
      ) as unknown[])
    : TASK_ATTRIBUTE_DEFINITIONS;

  const mappings = transformService.buildMappings(filtered);

  for (const [displayName, apiField] of Object.entries(TASK_MAPPING_SYNONYMS)) {
    mappings[displayName] = apiField;
  }

  return {
    attributes: filtered,
    mappings,
    count: Array.isArray(filtered) ? filtered.length : 0,
    resource_type: UniversalResourceType.TASKS,
    api_endpoint: '/tasks',
    supports_objects_api: false,
  };
}

export { TASK_ATTRIBUTE_DEFINITIONS };
