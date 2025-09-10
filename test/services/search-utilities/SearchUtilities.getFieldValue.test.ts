/**
 * Focused unit tests for SearchUtilities.getFieldValue helper cases
 */

import { describe, it, expect } from 'vitest';
import { SearchUtilities } from '../../../src/services/search-utilities/SearchUtilities.js';
import { AttioRecord } from '../../../src/types/attio.js';

describe('SearchUtilities.getFieldValue', () => {
  it('returns string value directly', () => {
    const rec = { values: { name: 'Acme' } } as unknown as AttioRecord;
    expect(SearchUtilities.getFieldValue(rec, 'name')).toBe('Acme');
  });

  it('returns first item for array of strings', () => {
    const rec = {
      values: { tags: ['alpha', 'beta'] },
    } as unknown as AttioRecord;
    expect(SearchUtilities.getFieldValue(rec, 'tags')).toBe('alpha');
  });

  it('returns first .value for array of objects', () => {
    const rec = {
      values: { email_addresses: [{ value: 'a@example.com' }] },
    } as unknown as AttioRecord;
    expect(SearchUtilities.getFieldValue(rec, 'email_addresses')).toBe(
      'a@example.com'
    );
  });

  it('returns .value for object with value', () => {
    const rec = {
      values: { description: { value: 'About us' } },
    } as unknown as AttioRecord;
    expect(SearchUtilities.getFieldValue(rec, 'description')).toBe('About us');
  });

  it('handles null/undefined to empty string', () => {
    const rec1 = { values: { foo: null } } as unknown as AttioRecord;
    const rec2 = { values: { bar: undefined } } as unknown as AttioRecord;
    const rec3 = { values: {} } as unknown as AttioRecord;
    expect(SearchUtilities.getFieldValue(rec1, 'foo')).toBe('');
    expect(SearchUtilities.getFieldValue(rec2, 'bar')).toBe('');
    expect(SearchUtilities.getFieldValue(rec3, 'baz')).toBe('');
  });

  it('handles empty arrays safely', () => {
    const rec = { values: { tags: [] } } as unknown as AttioRecord;
    expect(SearchUtilities.getFieldValue(rec, 'tags')).toBe('');
  });
});
