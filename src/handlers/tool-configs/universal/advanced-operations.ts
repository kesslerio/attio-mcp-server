/**
 * Advanced universal operations tool configurations
 * 
 * These 5 tools provide sophisticated search and batch capabilities
 * across all resource types.
 */

import {
  UniversalToolConfig,
  AdvancedSearchParams,
  RelationshipSearchParams,
  ContentSearchParams,
  TimeframeSearchParams,
  BatchOperationsParams,
  UniversalResourceType,
  RelationshipType,
  ContentSearchType,
  TimeframeType,
  BatchOperationType
} from './types.js';

import {
  advancedSearchSchema,
  searchByRelationshipSchema,
  searchByContentSchema,
  searchByTimeframeSchema,
  batchOperationsSchema,
  validateUniversalToolParams
} from './schemas.js';

import {
  handleUniversalSearch,
  handleUniversalGetDetails,
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
  formatResourceType,
  createUniversalError
} from './shared-handlers.js';

// Import specialized handlers
import {
  searchCompaniesByNotes,
  searchCompaniesByPeople,
  advancedSearchCompanies
} from '../../../objects/companies/index.js';

import {
  searchPeopleByCompany,
  searchPeopleByActivity,
  searchPeopleByNotes,
  searchPeopleByCreationDate,
  searchPeopleByModificationDate,
  searchPeopleByLastInteraction,
  advancedSearchPeople
} from '../../../objects/people/index.js';

import { AttioRecord } from '../../../types/attio.js';

/**
 * Universal advanced search tool
 * Consolidates complex filtering across all resource types
 */
export const advancedSearchConfig: UniversalToolConfig = {
  name: 'advanced-search',
  handler: async (params: AdvancedSearchParams): Promise<AttioRecord[]> => {
    try {
      validateUniversalToolParams('advanced-search', params);
      
      const { resource_type, query, filters, sort_by, sort_order, limit, offset } = params;
      
      // Use the universal search handler with advanced filtering
      return await handleUniversalSearch({
        resource_type,
        query,
        filters,
        limit,
        offset
      });
    } catch (error) {
      throw createUniversalError('advanced search', params.resource_type, error);
    }
  },
  formatResult: (results: AttioRecord[], resourceType?: UniversalResourceType) => {
    if (!Array.isArray(results)) {
      return 'No results found';
    }
    
    const resourceTypeName = resourceType ? formatResourceType(resourceType) : 'record';
    const plural = results.length === 1 ? resourceTypeName : `${resourceTypeName}s`;
    
    return `Advanced search found ${results.length} ${plural}:\n${results
      .map((record: any, index: number) => {
        const name = record.values?.name?.[0]?.value || 
                    record.values?.title?.[0]?.value || 
                    'Unnamed';
        const id = record.id?.record_id || 'unknown';
        
        // Include additional context for advanced search results
        const website = record.values?.website?.[0]?.value;
        const email = record.values?.email?.[0]?.value;
        const industry = record.values?.industry?.[0]?.value;
        const location = record.values?.location?.[0]?.value;
        
        let context = '';
        if (industry) context += ` [${industry}]`;
        if (location) context += ` (${location})`;
        if (website) context += ` - ${website}`;
        else if (email) context += ` - ${email}`;
        
        return `${index + 1}. ${name}${context} (ID: ${id})`;
      })
      .join('\n')}`;
  }
};

/**
 * Universal search by relationship tool
 * Handles cross-entity relationship searches
 */
export const searchByRelationshipConfig: UniversalToolConfig = {
  name: 'search-by-relationship',
  handler: async (params: RelationshipSearchParams): Promise<AttioRecord[]> => {
    try {
      validateUniversalToolParams('search-by-relationship', params);
      
      const { relationship_type, source_id, target_resource_type, limit, offset } = params;
      
      switch (relationship_type) {
        case RelationshipType.COMPANY_TO_PEOPLE:
          return await searchPeopleByCompany(source_id);
          
        case RelationshipType.PEOPLE_TO_COMPANY:
          return await searchCompaniesByPeople(source_id);
          
        case RelationshipType.PERSON_TO_TASKS:
        case RelationshipType.COMPANY_TO_TASKS:
          // Task relationships would be implemented here
          throw new Error(`Relationship type ${relationship_type} not yet implemented`);
          
        default:
          throw new Error(`Unsupported relationship type: ${relationship_type}`);
      }
    } catch (error) {
      throw createUniversalError('relationship search', params.relationship_type, error);
    }
  },
  formatResult: (results: AttioRecord[], relationshipType?: RelationshipType) => {
    if (!Array.isArray(results)) {
      return 'No related records found';
    }
    
    const relationshipName = relationshipType ? relationshipType.replace(/_/g, ' ') : 'relationship';
    
    return `Found ${results.length} records for ${relationshipName}:\n${results
      .map((record: any, index: number) => {
        const name = record.values?.name?.[0]?.value || 
                    record.values?.title?.[0]?.value || 
                    'Unnamed';
        const id = record.id?.record_id || 'unknown';
        const email = record.values?.email?.[0]?.value;
        const role = record.values?.role?.[0]?.value || record.values?.position?.[0]?.value;
        
        let details = '';
        if (role) details += ` (${role})`;
        if (email) details += ` - ${email}`;
        
        return `${index + 1}. ${name}${details} (ID: ${id})`;
      })
      .join('\n')}`;
  }
};

/**
 * Universal search by content tool
 * Searches within notes, activity, and interactions
 */
export const searchByContentConfig: UniversalToolConfig = {
  name: 'search-by-content',
  handler: async (params: ContentSearchParams): Promise<AttioRecord[]> => {
    try {
      validateUniversalToolParams('search-by-content', params);
      
      const { resource_type, content_type, search_query, limit, offset } = params;
      
      switch (content_type) {
        case ContentSearchType.NOTES:
          if (resource_type === UniversalResourceType.COMPANIES) {
            return await searchCompaniesByNotes(search_query);
          } else if (resource_type === UniversalResourceType.PEOPLE) {
            return await searchPeopleByNotes(search_query);
          }
          break;
          
        case ContentSearchType.ACTIVITY:
          if (resource_type === UniversalResourceType.PEOPLE) {
            // searchPeopleByActivity expects ActivityFilter, create proper filter object
            const activityFilter = { query: search_query || '', type: 'general' };
            return await searchPeopleByActivity(activityFilter as any);
          }
          break;
          
        case ContentSearchType.INTERACTIONS:
          // Interaction searches would be implemented here
          throw new Error(`Content type ${content_type} not yet implemented for ${resource_type}`);
          
        default:
          throw new Error(`Unsupported content type: ${content_type}`);
      }
      
      throw new Error(`Content search not supported for resource type ${resource_type} and content type ${content_type}`);
    } catch (error) {
      throw createUniversalError('content search', `${params.resource_type}:${params.content_type}`, error);
    }
  },
  formatResult: (results: AttioRecord[], contentType?: ContentSearchType, resourceType?: UniversalResourceType) => {
    if (!Array.isArray(results)) {
      return 'No content matches found';
    }
    
    const contentTypeName = contentType ? contentType : 'content';
    const resourceTypeName = resourceType ? formatResourceType(resourceType) : 'record';
    
    return `Found ${results.length} ${resourceTypeName}s with matching ${contentTypeName}:\n${results
      .map((record: any, index: number) => {
        const name = record.values?.name?.[0]?.value || 
                    record.values?.title?.[0]?.value || 
                    'Unnamed';
        const id = record.id?.record_id || 'unknown';
        
        return `${index + 1}. ${name} (ID: ${id})`;
      })
      .join('\n')}`;
  }
};

/**
 * Universal search by timeframe tool
 * Handles temporal filtering across resource types
 */
export const searchByTimeframeConfig: UniversalToolConfig = {
  name: 'search-by-timeframe',
  handler: async (params: TimeframeSearchParams): Promise<AttioRecord[]> => {
    try {
      validateUniversalToolParams('search-by-timeframe', params);
      
      const { resource_type, timeframe_type, start_date, end_date, limit, offset } = params;
      
      if (resource_type === UniversalResourceType.PEOPLE) {
        switch (timeframe_type) {
          case TimeframeType.CREATED:
            return await searchPeopleByCreationDate({ start: start_date, end: end_date });
            
          case TimeframeType.MODIFIED:
            return await searchPeopleByModificationDate({ start: start_date, end: end_date });
            
          case TimeframeType.LAST_INTERACTION:
            // Create a DateRange object
            const dateRange = start_date && end_date ? { start: start_date, end: end_date } : { start: start_date || '', end: end_date || '' };
            return await searchPeopleByLastInteraction(dateRange);
            
          default:
            throw new Error(`Unsupported timeframe type for people: ${timeframe_type}`);
        }
      } else {
        // Other resource types would be implemented here
        throw new Error(`Timeframe search not yet implemented for resource type: ${resource_type}`);
      }
    } catch (error) {
      throw createUniversalError('timeframe search', `${params.resource_type}:${params.timeframe_type}`, error);
    }
  },
  formatResult: (results: AttioRecord[], timeframeType?: TimeframeType, resourceType?: UniversalResourceType) => {
    if (!Array.isArray(results)) {
      return 'No records found in timeframe';
    }
    
    const timeframeName = timeframeType ? timeframeType.replace(/_/g, ' ') : 'timeframe';
    const resourceTypeName = resourceType ? formatResourceType(resourceType) : 'record';
    
    return `Found ${results.length} ${resourceTypeName}s by ${timeframeName}:\n${results
      .map((record: any, index: number) => {
        const name = record.values?.name?.[0]?.value || 
                    record.values?.title?.[0]?.value || 
                    'Unnamed';
        const id = record.id?.record_id || 'unknown';
        
        // Try to show relevant date information
        const created = record.created_at;
        const modified = record.updated_at;
        let dateInfo = '';
        
        if (timeframeType === TimeframeType.CREATED && created) {
          dateInfo = ` (created: ${new Date(created).toLocaleDateString()})`;
        } else if (timeframeType === TimeframeType.MODIFIED && modified) {
          dateInfo = ` (modified: ${new Date(modified).toLocaleDateString()})`;
        }
        
        return `${index + 1}. ${name}${dateInfo} (ID: ${id})`;
      })
      .join('\n')}`;
  }
};

/**
 * Universal batch operations tool
 * Handles bulk operations across resource types
 */
export const batchOperationsConfig: UniversalToolConfig = {
  name: 'batch-operations',
  handler: async (params: BatchOperationsParams): Promise<any> => {
    try {
      validateUniversalToolParams('batch-operations', params);
      
      const { resource_type, operation_type, records, record_ids, limit, offset } = params;
      
      switch (operation_type) {
        case BatchOperationType.CREATE:
          if (!records || records.length === 0) {
            throw new Error('Records array is required for batch create operation');
          }
          
          const createResults = [];
          for (const recordData of records) {
            try {
              const result = await handleUniversalCreate({
                resource_type,
                record_data: recordData,
                return_details: true
              });
              createResults.push({ success: true, result });
            } catch (error) {
              createResults.push({ success: false, error: error instanceof Error ? error.message : String(error), data: recordData });
            }
          }
          return createResults;
          
        case BatchOperationType.UPDATE:
          if (!records || records.length === 0) {
            throw new Error('Records array is required for batch update operation');
          }
          
          const updateResults = [];
          for (const recordData of records) {
            try {
              if (!recordData.id) {
                throw new Error('Record ID is required for update operation');
              }
              
              const result = await handleUniversalUpdate({
                resource_type,
                record_id: recordData.id,
                record_data: recordData,
                return_details: true
              });
              updateResults.push({ success: true, result });
            } catch (error) {
              updateResults.push({ success: false, error: error instanceof Error ? error.message : String(error), data: recordData });
            }
          }
          return updateResults;
          
        case BatchOperationType.DELETE:
          if (!record_ids || record_ids.length === 0) {
            throw new Error('Record IDs array is required for batch delete operation');
          }
          
          const deleteResults = [];
          for (const recordId of record_ids) {
            try {
              const result = await handleUniversalDelete({
                resource_type,
                record_id: recordId
              });
              deleteResults.push({ success: true, result });
            } catch (error) {
              deleteResults.push({ success: false, error: error instanceof Error ? error.message : String(error), record_id: recordId });
            }
          }
          return deleteResults;
          
        case BatchOperationType.GET:
          if (!record_ids || record_ids.length === 0) {
            throw new Error('Record IDs array is required for batch get operation');
          }
          
          const getResults = [];
          for (const recordId of record_ids) {
            try {
              const result = await handleUniversalGetDetails({
                resource_type,
                record_id: recordId
              });
              getResults.push({ success: true, result });
            } catch (error) {
              getResults.push({ success: false, error: error instanceof Error ? error.message : String(error), record_id: recordId });
            }
          }
          return getResults;
          
        case BatchOperationType.SEARCH:
          // Batch search is essentially the same as regular search with pagination
          return await handleUniversalSearch({
            resource_type,
            limit,
            offset
          });
          
        default:
          throw new Error(`Unsupported batch operation type: ${operation_type}`);
      }
    } catch (error) {
      throw createUniversalError('batch operations', `${params.resource_type}:${params.operation_type}`, error);
    }
  },
  formatResult: (results: any, operationType?: BatchOperationType, resourceType?: UniversalResourceType) => {
    if (!results) {
      return 'Batch operation failed';
    }
    
    const operationName = operationType ? operationType : 'operation';
    const resourceTypeName = resourceType ? formatResourceType(resourceType) : 'record';
    
    if (Array.isArray(results)) {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      let summary = `Batch ${operationName} completed: ${successCount} successful, ${failureCount} failed\n\n`;
      
      if (operationType === BatchOperationType.SEARCH) {
        // Format as search results
        return `Batch search found ${results.length} ${resourceTypeName}s:\n${results
          .map((record: any, index: number) => {
            const name = record.values?.name?.[0]?.value || 
                        record.values?.title?.[0]?.value || 
                        'Unnamed';
            const id = record.id?.record_id || 'unknown';
            return `${index + 1}. ${name} (ID: ${id})`;
          })
          .join('\n')}`;
      }
      
      // Show details for successful operations
      const successful = results.filter(r => r.success);
      if (successful.length > 0) {
        summary += `Successful operations:\n${successful
          .map((op: any, index: number) => {
            const name = op.result?.values?.name?.[0]?.value || 
                        op.result?.values?.title?.[0]?.value ||
                        op.result?.record_id ||
                        'Unknown';
            return `${index + 1}. ${name}`;
          })
          .join('\n')}`;
      }
      
      // Show errors for failed operations
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        summary += `\n\nFailed operations:\n${failed
          .map((op: any, index: number) => {
            const identifier = op.record_id || op.data?.name || 'Unknown';
            return `${index + 1}. ${identifier}: ${op.error}`;
          })
          .join('\n')}`;
      }
      
      return summary;
    }
    
    return `Batch ${operationName} result: ${JSON.stringify(results)}`;
  }
};

/**
 * Advanced operations tool definitions for MCP protocol
 */
export const advancedOperationsToolDefinitions = {
  'advanced-search': {
    name: 'advanced-search',
    description: 'Advanced search with complex filtering across all resource types',
    inputSchema: advancedSearchSchema
  },
  'search-by-relationship': {
    name: 'search-by-relationship',
    description: 'Search records by their relationships to other entities',
    inputSchema: searchByRelationshipSchema
  },
  'search-by-content': {
    name: 'search-by-content',
    description: 'Search within notes, activity, and interaction content',
    inputSchema: searchByContentSchema
  },
  'search-by-timeframe': {
    name: 'search-by-timeframe',
    description: 'Search records by temporal criteria (creation, modification, interaction dates)',
    inputSchema: searchByTimeframeSchema
  },
  'batch-operations': {
    name: 'batch-operations',
    description: 'Perform bulk operations (create, update, delete, get, search)',
    inputSchema: batchOperationsSchema
  }
};

/**
 * Advanced operations tool configurations
 */
export const advancedOperationsToolConfigs = {
  'advanced-search': advancedSearchConfig,
  'search-by-relationship': searchByRelationshipConfig,
  'search-by-content': searchByContentConfig,
  'search-by-timeframe': searchByTimeframeConfig,
  'batch-operations': batchOperationsConfig
};