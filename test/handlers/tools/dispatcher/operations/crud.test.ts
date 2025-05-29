/**
 * Unit tests for CRUD operation handlers
 * Tests all CRUD operations: create, update, updateAttribute, delete
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../../../src/types/attio.js';
import { ToolConfig } from '../../../../../src/handlers/tool-types.js';
import {
  handleCreateOperation,
  handleUpdateOperation,
  handleUpdateAttributeOperation,
  handleDeleteOperation,
} from '../../../../../src/handlers/tools/dispatcher/operations/crud.js';

// Mock dependencies
vi.mock('../../../../../src/utils/error-handler.js');
vi.mock('../../../../../src/handlers/tools/formatters.js');
vi.mock('../../../../../src/handlers/tools/error-types.js');

import { createErrorResult } from '../../../../../src/utils/error-handler.js';
import { formatResponse } from '../../../../../src/handlers/tools/formatters.js';
import { hasResponseData } from '../../../../../src/handlers/tools/error-types.js';

const mockCreateErrorResult = vi.mocked(createErrorResult);
const mockFormatResponse = vi.mocked(formatResponse);
const mockHasResponseData = vi.mocked(hasResponseData);

describe('CRUD Operation Handlers', () => {
  // Mock tool config and request helpers
  const createMockToolConfig = (
    handlerResult: any = { id: 'test-result' },
    formatResult?: (result: any) => string
  ): ToolConfig => ({
    handler: vi.fn().mockResolvedValue(handlerResult),
    formatResult,
  });

  const createMockRequest = (
    toolName: string,
    args: Record<string, any>
  ): CallToolRequest => ({
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockFormatResponse.mockImplementation((text: string) => ({
      content: [{ type: 'text', text }],
      isError: false,
    }));

    mockCreateErrorResult.mockImplementation((error, url, method, data) => ({
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
      error: { code: 400, message: error.message, type: 'validation_error' },
    }));

    mockHasResponseData.mockReturnValue(false);
  });

  describe('handleCreateOperation', () => {
    const testCases = [
      { resourceType: ResourceType.COMPANIES, description: 'companies' },
      { resourceType: ResourceType.PEOPLE, description: 'people' },
    ];

    testCases.forEach(({ resourceType, description }) => {
      describe(`for ${description}`, () => {
        it('should successfully create a record with valid attributes', async () => {
          const mockResult = { id: 'created-id-123', name: 'Test Company' };
          const toolConfig = createMockToolConfig(mockResult);
          const request = createMockRequest('create-company', {
            attributes: { name: 'Test Company', website: 'https://test.com' },
          });

          const result = await handleCreateOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).toHaveBeenCalledWith({
            name: 'Test Company',
            website: 'https://test.com',
          });
          expect(mockFormatResponse).toHaveBeenCalledWith(
            `${resourceType.slice(0, -1)} created successfully`
          );
          expect(result).toEqual({
            content: [
              {
                type: 'text',
                text: `${resourceType.slice(0, -1)} created successfully`,
              },
            ],
            isError: false,
          });
        });

        it('should use custom formatResult when provided', async () => {
          const mockResult = { id: 'created-id-123', name: 'Test Company' };
          const customFormatter = vi
            .fn()
            .mockReturnValue('Custom formatted result');
          const toolConfig = createMockToolConfig(mockResult, customFormatter);
          const request = createMockRequest('create-company', {
            attributes: { name: 'Test Company' },
          });

          await handleCreateOperation(request, toolConfig, resourceType);

          expect(customFormatter).toHaveBeenCalledWith(mockResult);
          expect(mockFormatResponse).toHaveBeenCalledWith(
            'Custom formatted result'
          );
        });

        it('should return error when attributes parameter is missing', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('create-company', {});

          const result = await handleCreateOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Attributes parameter is required for create operation',
            }),
            `/${resourceType}`,
            'POST',
            { status: 400, message: 'Missing required parameter: attributes' }
          );
        });

        it('should handle handler function failures', async () => {
          const handlerError = new Error('Handler execution failed');
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(handlerError),
          };
          const request = createMockRequest('create-company', {
            attributes: { name: 'Test Company' },
          });

          await handleCreateOperation(request, toolConfig, resourceType);

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            handlerError,
            `/${resourceType}`,
            'POST',
            {}
          );
        });

        it('should handle non-Error exceptions', async () => {
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue('String error'),
          };
          const request = createMockRequest('create-company', {
            attributes: { name: 'Test Company' },
          });

          await handleCreateOperation(request, toolConfig, resourceType);

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Unknown error' }),
            `/${resourceType}`,
            'POST',
            {}
          );
        });

        it('should handle errors with response data', async () => {
          const errorWithResponse = {
            response: { data: { details: 'API error details' } },
          };
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(errorWithResponse),
          };
          const request = createMockRequest('create-company', {
            attributes: { name: 'Test Company' },
          });

          mockHasResponseData.mockReturnValue(true);

          await handleCreateOperation(request, toolConfig, resourceType);

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.any(Error),
            `/${resourceType}`,
            'POST',
            { details: 'API error details' }
          );
        });
      });
    });
  });

  describe('handleUpdateOperation', () => {
    const testCases = [
      {
        resourceType: ResourceType.COMPANIES,
        description: 'companies',
        idParam: 'companyId',
        idValue: 'company-123',
      },
      {
        resourceType: ResourceType.PEOPLE,
        description: 'people',
        idParam: 'personId',
        idValue: 'person-456',
      },
    ];

    testCases.forEach(({ resourceType, description, idParam, idValue }) => {
      describe(`for ${description}`, () => {
        it('should successfully update a record with valid id and attributes', async () => {
          const mockResult = { id: idValue, name: 'Updated Name' };
          const toolConfig = createMockToolConfig(mockResult);
          const request = createMockRequest('update-company', {
            [idParam]: idValue,
            attributes: {
              name: 'Updated Name',
              website: 'https://updated.com',
            },
          });

          const result = await handleUpdateOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).toHaveBeenCalledWith(idValue, {
            name: 'Updated Name',
            website: 'https://updated.com',
          });
          expect(mockFormatResponse).toHaveBeenCalledWith(
            `${resourceType.slice(0, -1)} updated successfully`
          );
        });

        it('should return error when id parameter is missing', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('update-company', {
            attributes: { name: 'Updated Name' },
          });

          await handleUpdateOperation(request, toolConfig, resourceType);

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message: `${idParam} parameter is required for update operation`,
            }),
            `/${resourceType}`,
            'PUT',
            { status: 400, message: `Missing required parameter: ${idParam}` }
          );
        });

        it('should return error when attributes parameter is missing', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('update-company', {
            [idParam]: idValue,
          });

          await handleUpdateOperation(request, toolConfig, resourceType);

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Attributes parameter is required for update operation',
            }),
            `/${resourceType}/${idValue}`,
            'PUT',
            { status: 400, message: 'Missing required parameter: attributes' }
          );
        });

        it('should handle handler function failures', async () => {
          const handlerError = new Error('Update failed');
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(handlerError),
          };
          const request = createMockRequest('update-company', {
            [idParam]: idValue,
            attributes: { name: 'Updated Name' },
          });

          await handleUpdateOperation(request, toolConfig, resourceType);

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            handlerError,
            `/${resourceType}`,
            'PUT',
            {}
          );
        });
      });
    });
  });

  describe('handleUpdateAttributeOperation', () => {
    const testCases = [
      {
        resourceType: ResourceType.COMPANIES,
        description: 'companies',
        idParam: 'companyId',
        idValue: 'company-123',
      },
      {
        resourceType: ResourceType.PEOPLE,
        description: 'people',
        idParam: 'personId',
        idValue: 'person-456',
      },
    ];

    testCases.forEach(({ resourceType, description, idParam, idValue }) => {
      describe(`for ${description}`, () => {
        const valueTestCases = [
          {
            type: 'string',
            value: 'string value',
            description: 'string value',
          },
          { type: 'number', value: 42, description: 'number value' },
          { type: 'boolean', value: true, description: 'boolean value' },
          { type: 'null', value: null, description: 'null value' },
          {
            type: 'array',
            value: ['item1', 'item2'],
            description: 'array value',
          },
          {
            type: 'object',
            value: { nested: 'object' },
            description: 'object value',
          },
        ];

        valueTestCases.forEach(({ type, value, description: valueDesc }) => {
          it(`should successfully update attribute with ${valueDesc}`, async () => {
            const mockResult = { id: idValue, attributeUpdated: true };
            const toolConfig = createMockToolConfig(mockResult);
            const request = createMockRequest('update-company-attribute', {
              [idParam]: idValue,
              attributeName: 'test_attribute',
              value: value,
            });

            await handleUpdateAttributeOperation(
              request,
              toolConfig,
              resourceType
            );

            expect(toolConfig.handler).toHaveBeenCalledWith(
              idValue,
              'test_attribute',
              value
            );
            expect(mockFormatResponse).toHaveBeenCalledWith(
              `${resourceType.slice(0, -1)} attribute updated successfully`
            );
          });
        });

        it('should return error when id parameter is missing', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('update-company-attribute', {
            attributeName: 'test_attribute',
            value: 'test value',
          });

          await handleUpdateAttributeOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message: `${idParam} parameter is required for updateAttribute operation`,
            }),
            `/${resourceType}`,
            'PATCH',
            { status: 400, message: `Missing required parameter: ${idParam}` }
          );
        });

        it('should return error when attributeName parameter is missing', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('update-company-attribute', {
            [idParam]: idValue,
            value: 'test value',
          });

          await handleUpdateAttributeOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message:
                'attributeName parameter is required for updateAttribute operation',
            }),
            `/${resourceType}/${idValue}`,
            'PATCH',
            {
              status: 400,
              message: 'Missing required parameter: attributeName',
            }
          );
        });

        it('should return error when value parameter is undefined', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('update-company-attribute', {
            [idParam]: idValue,
            attributeName: 'test_attribute',
          });

          await handleUpdateAttributeOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message:
                'value parameter is required for updateAttribute operation',
            }),
            `/${resourceType}/${idValue}`,
            'PATCH',
            { status: 400, message: 'Missing required parameter: value' }
          );
        });

        it('should allow null as a valid value', async () => {
          const mockResult = { id: idValue, attributeCleared: true };
          const toolConfig = createMockToolConfig(mockResult);
          const request = createMockRequest('update-company-attribute', {
            [idParam]: idValue,
            attributeName: 'test_attribute',
            value: null,
          });

          await handleUpdateAttributeOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).toHaveBeenCalledWith(
            idValue,
            'test_attribute',
            null
          );
        });

        it('should handle handler function failures', async () => {
          const handlerError = new Error('Attribute update failed');
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(handlerError),
          };
          const request = createMockRequest('update-company-attribute', {
            [idParam]: idValue,
            attributeName: 'test_attribute',
            value: 'test value',
          });

          await handleUpdateAttributeOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            handlerError,
            `/${resourceType}`,
            'PATCH',
            {}
          );
        });
      });
    });
  });

  describe('handleDeleteOperation', () => {
    const testCases = [
      {
        resourceType: ResourceType.COMPANIES,
        description: 'companies',
        idParam: 'companyId',
        idValue: 'company-123',
      },
      {
        resourceType: ResourceType.PEOPLE,
        description: 'people',
        idParam: 'personId',
        idValue: 'person-456',
      },
    ];

    testCases.forEach(({ resourceType, description, idParam, idValue }) => {
      describe(`for ${description}`, () => {
        it('should successfully delete a record with valid id', async () => {
          const mockResult = { deleted: true, id: idValue };
          const toolConfig = createMockToolConfig(mockResult);
          const request = createMockRequest('delete-company', {
            [idParam]: idValue,
          });

          const result = await handleDeleteOperation(
            request,
            toolConfig,
            resourceType
          );

          expect(toolConfig.handler).toHaveBeenCalledWith(idValue);
          expect(mockFormatResponse).toHaveBeenCalledWith(
            `${resourceType.slice(0, -1)} deleted successfully`
          );
        });

        it('should use custom formatResult when provided', async () => {
          const mockResult = { deleted: true, id: idValue };
          const customFormatter = vi
            .fn()
            .mockReturnValue('Custom delete result');
          const toolConfig = createMockToolConfig(mockResult, customFormatter);
          const request = createMockRequest('delete-company', {
            [idParam]: idValue,
          });

          await handleDeleteOperation(request, toolConfig, resourceType);

          expect(customFormatter).toHaveBeenCalledWith(mockResult);
          expect(mockFormatResponse).toHaveBeenCalledWith(
            'Custom delete result'
          );
        });

        it('should return error when id parameter is missing', async () => {
          const toolConfig = createMockToolConfig();
          const request = createMockRequest('delete-company', {});

          await handleDeleteOperation(request, toolConfig, resourceType);

          expect(toolConfig.handler).not.toHaveBeenCalled();
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            expect.objectContaining({
              message: `${idParam} parameter is required for delete operation`,
            }),
            `/${resourceType}`,
            'DELETE',
            { status: 400, message: `Missing required parameter: ${idParam}` }
          );
        });

        it('should handle handler function failures', async () => {
          const handlerError = new Error('Delete failed');
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(handlerError),
          };
          const request = createMockRequest('delete-company', {
            [idParam]: idValue,
          });

          await handleDeleteOperation(request, toolConfig, resourceType);

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            handlerError,
            `/${resourceType}/${idValue}`,
            'DELETE',
            {}
          );
        });

        it('should include id in error URL when available', async () => {
          const handlerError = new Error('Delete failed');
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(handlerError),
          };
          const request = createMockRequest('delete-company', {
            [idParam]: idValue,
          });

          await handleDeleteOperation(request, toolConfig, resourceType);

          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            handlerError,
            `/${resourceType}/${idValue}`,
            'DELETE',
            {}
          );
        });

        it('should use unknown id in error URL when id becomes unavailable in catch block', async () => {
          // Test the edge case where the validation passes but in the catch block,
          // the id extraction returns falsy (simulating a corrupted request state)
          const handlerError = new Error('Delete failed');
          const toolConfig: ToolConfig = {
            handler: vi.fn().mockRejectedValue(handlerError),
          };

          // Create a request that will pass validation but become corrupted
          const request = createMockRequest('delete-company', {
            [idParam]: idValue,
          });

          // Mock the request to return null/undefined when accessed in catch block
          // by modifying the request object after creation
          Object.defineProperty(request.params.arguments, idParam, {
            get: vi
              .fn()
              .mockReturnValueOnce(idValue) // First call (validation) returns valid id
              .mockReturnValueOnce(null), // Second call (catch block) returns null
            configurable: true,
          });

          await handleDeleteOperation(request, toolConfig, resourceType);

          // Handler should be called since validation passed
          expect(toolConfig.handler).toHaveBeenCalledWith(idValue);

          // In catch block, id is null so should use 'unknown'
          expect(mockCreateErrorResult).toHaveBeenCalledWith(
            handlerError,
            `/${resourceType}/unknown`,
            'DELETE',
            {}
          );
        });
      });
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed request objects', async () => {
      const toolConfig = createMockToolConfig();
      const malformedRequest = {
        method: 'tools/call',
        params: {
          name: 'create-company',
          // Missing arguments property
        },
      } as CallToolRequest;

      await handleCreateOperation(
        malformedRequest,
        toolConfig,
        ResourceType.COMPANIES
      );

      expect(mockCreateErrorResult).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attributes parameter is required for create operation',
        }),
        '/companies',
        'POST',
        { status: 400, message: 'Missing required parameter: attributes' }
      );
    });

    it('should handle empty arguments object', async () => {
      const toolConfig = createMockToolConfig();
      const request = createMockRequest('update-company', {});

      await handleUpdateOperation(request, toolConfig, ResourceType.COMPANIES);

      expect(mockCreateErrorResult).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'companyId parameter is required for update operation',
        }),
        '/companies',
        'PUT',
        { status: 400, message: 'Missing required parameter: companyId' }
      );
    });

    it('should handle null arguments object', async () => {
      const toolConfig = createMockToolConfig();
      const requestWithNullArgs: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'create-company',
          arguments: null as any,
        },
      };

      await handleCreateOperation(
        requestWithNullArgs,
        toolConfig,
        ResourceType.COMPANIES
      );

      expect(mockCreateErrorResult).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Attributes parameter is required for create operation',
        }),
        '/companies',
        'POST',
        { status: 400, message: 'Missing required parameter: attributes' }
      );
    });
  });
});
