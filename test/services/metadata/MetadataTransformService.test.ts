import { describe, it, expect } from 'vitest';
import { DefaultMetadataTransformService } from '../../../src/services/metadata/MetadataTransformService.js';

describe('DefaultMetadataTransformService', () => {
  const service = new DefaultMetadataTransformService();

  it('parses array responses directly', () => {
    const attributes = [{ title: 'Name', api_slug: 'name', type: 'text' }];
    expect(service.parseAttributesResponse(attributes)).toEqual(attributes);
  });

  it('parses object responses with nested arrays', () => {
    const payload = {
      data: [{ title: 'Email', api_slug: 'email', type: 'text' }],
    };
    expect(service.parseAttributesResponse(payload)).toEqual(payload.data);
  });

  it('builds title to api_slug mappings', () => {
    const attributes = [
      { title: 'Name', api_slug: 'name', type: 'text' },
      { title: 'Status', api_slug: 'status', type: 'text' },
    ];
    expect(service.buildMappings(attributes)).toEqual({
      Name: 'name',
      Status: 'status',
    });
  });

  it('filters attributes by category across shapes', () => {
    const attributes = [
      { title: 'Name', category: 'contact' },
      { title: 'Status', type: 'business' },
    ];
    expect(service.filterByCategory(attributes, ['contact'])).toEqual([
      { title: 'Name', category: 'contact' },
    ]);

    const container = {
      attributes,
      count: 2,
    };
    expect(service.filterByCategory(container, ['business'])).toEqual({
      attributes: [{ title: 'Status', type: 'business' }],
      count: 1,
    });
  });
});
