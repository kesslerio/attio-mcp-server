/**
 * Notes operation handlers for tool execution
 *
 * Handles notes operations including retrieving and creating notes for records
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../../types/attio.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { parseResourceUri } from '../../../../utils/uri-parser.js';
import type {
  CreateNoteToolConfig,
  NotesToolConfig,
} from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Handle notes operations
 */
export async function handleNotesOperation(
  request: CallToolRequest,
  toolConfig: NotesToolConfig,
  resourceType: ResourceType
) {
  const directId =
    resourceType === ResourceType.COMPANIES
      ? (request.params.arguments?.companyId as string)
      : (request.params.arguments?.personId as string);
  const uri = request.params.arguments?.uri as string;

  if (!(directId || uri)) {
    const idParamName =
      resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
    return createErrorResult(
      new Error(`Either ${idParamName} or uri parameter is required`),
      `/${resourceType}/notes`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  let notesTargetId = directId;
  let _notesResourceType = resourceType;

  try {
    if (uri) {
      try {
        const [uriType, uriId] = parseResourceUri(uri);
        _notesResourceType = uriType as ResourceType;
        notesTargetId = uriId;
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error('Invalid URI format'),
          uri,
          'GET',
          { status: 400, message: 'Invalid URI format' }
        );
      }
    }

    const limit = request.params.arguments?.limit as number;
    const offset = request.params.arguments?.offset as number;

    const notes = await toolConfig.handler(notesTargetId, limit, offset);
    const formattedResult = toolConfig.formatResult!(notes);

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      uri || `/${resourceType}/${notesTargetId}/notes`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle createNote operations
 */
export async function handleCreateNoteOperation(
  request: CallToolRequest,
  toolConfig: CreateNoteToolConfig,
  resourceType: ResourceType
) {
  const directId =
    resourceType === ResourceType.COMPANIES
      ? (request.params.arguments?.companyId as string)
      : (request.params.arguments?.personId as string);
  const uri = request.params.arguments?.uri as string;

  /**
   * Parameter Mapping Strategy for Note Creation
   *
   * This function supports multiple parameter names for backward compatibility
   * and to accommodate different API clients:
   *
   * - title: Primary parameter name (preferred)
   * - noteTitle: Legacy/alternative parameter name for title
   * - content: Primary parameter name (preferred)
   * - noteText: Legacy/alternative parameter name for content
   *
   * The fallback pattern (primary || legacy) ensures compatibility while
   * encouraging use of the standardized parameter names.
   */
  const title = (request.params.arguments?.title ||
    request.params.arguments?.noteTitle) as string;
  const content = (request.params.arguments?.content ||
    request.params.arguments?.noteText) as string;

  if (!(title && content)) {
    return createErrorResult(
      new Error('Both title and content are required'),
      `/${resourceType}/notes`,
      'POST',
      { status: 400, message: 'Missing required parameters' }
    );
  }

  if (!(directId || uri)) {
    const idParamName =
      resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
    return createErrorResult(
      new Error(`Either ${idParamName} or uri parameter is required`),
      `/${resourceType}/notes`,
      'POST',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  let noteTargetId = directId;
  let _noteResourceType = resourceType;

  try {
    if (uri) {
      try {
        const [uriType, uriId] = parseResourceUri(uri);
        _noteResourceType = uriType as ResourceType;
        noteTargetId = uriId;
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error('Invalid URI format'),
          uri,
          'POST',
          { status: 400, message: 'Invalid URI format' }
        );
      }
    }

    const note = await toolConfig.handler(noteTargetId, title, content);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(note)
      : `Note added to ${resourceType.slice(0, -1)} ${noteTargetId}: ${
          note.title || 'Untitled'
        }`;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      uri || `/${resourceType}/${noteTargetId}/notes`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
