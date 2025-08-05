import { createPathBasedFilter } from '../../src/utils/record-utils';

describe('createPathBasedFilter', () => {
  const listId = 'my_list';
  const companiesObjectType = 'companies';
  const peopleObjectType = 'people';

  describe('basic filter creation', () => {
    it('should create a correct path-based filter structure', () => {
      // Arrange
      const parentAttributeSlug = 'industry';
      const condition = 'contains';
      const value = 'Tech';

      // Act
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        parentAttributeSlug,
        condition,
        value
      );

      // Assert
      expect(filter).toEqual({
        path: [
          [listId, 'parent_record'],
          [companiesObjectType, parentAttributeSlug],
        ],
        constraints: { contains: 'Tech' },
      });
    });
  });

  describe('condition mapping', () => {
    it('should correctly map equals condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'industry',
        'equals',
        'Technology'
      );

      expect(filter.constraints).toEqual({ value: 'Technology' });
    });

    it('should correctly map contains condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'description',
        'contains',
        'software'
      );

      expect(filter.constraints).toEqual({ contains: 'software' });
    });

    it('should correctly map starts_with condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'description', // Using description instead of name to avoid special handling
        'starts_with',
        'Acme'
      );

      expect(filter.constraints).toEqual({ starts_with: 'Acme' });
    });

    it('should correctly map ends_with condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'domain',
        'ends_with',
        '.com'
      );

      expect(filter.constraints).toEqual({ ends_with: '.com' });
    });

    it('should correctly map greater_than condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'employee_count',
        'greater_than',
        100
      );

      expect(filter.constraints).toEqual({ gt: 100 });
    });

    it('should correctly map less_than condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'revenue',
        'less_than',
        1_000_000
      );

      expect(filter.constraints).toEqual({ lt: 1_000_000 });
    });

    it('should correctly map is_empty condition', () => {
      const filter = createPathBasedFilter(
        listId,
        peopleObjectType,
        'phone_numbers',
        'is_empty',
        null
      );

      expect(filter.constraints).toEqual({ is_empty: true });
    });

    it('should correctly map is_not_empty condition', () => {
      const filter = createPathBasedFilter(
        listId,
        peopleObjectType,
        'email_addresses',
        'is_not_empty',
        null
      );

      expect(filter.constraints).toEqual({ is_not_empty: true });
    });

    it('should correctly map in condition with array value', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'industry',
        'in',
        ['Technology', 'Software', 'SaaS']
      );

      expect(filter.constraints).toEqual({
        in: ['Technology', 'Software', 'SaaS'],
      });
    });

    it('should correctly map in condition with single value (converted to array)', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'industry',
        'in',
        'Technology'
      );

      expect(filter.constraints).toEqual({ in: ['Technology'] });
    });
  });

  describe('special attribute handling', () => {
    it('should create special filter for record_id', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'record_id',
        'equals',
        'company_123'
      );

      // Should have simplified path and direct record_id constraint
      expect(filter).toEqual({
        path: [[listId, 'parent_record']],
        constraints: { record_id: 'company_123' },
      });
    });

    it('should create special filter for id attribute', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'id',
        'equals',
        'company_123'
      );

      // Should have simplified path and direct record_id constraint
      expect(filter).toEqual({
        path: [[listId, 'parent_record']],
        constraints: { record_id: 'company_123' },
      });
    });

    it('should handle name attribute with equals condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'name',
        'equals',
        'Acme Corp'
      );

      expect(filter.constraints).toEqual({ full_name: 'Acme Corp' });
    });

    it('should handle name attribute with contains condition', () => {
      const filter = createPathBasedFilter(
        listId,
        companiesObjectType,
        'name',
        'contains',
        'Acme'
      );

      expect(filter.constraints).toEqual({ full_name: { contains: 'Acme' } });
    });

    it('should handle email_addresses attribute with contains condition', () => {
      const filter = createPathBasedFilter(
        listId,
        peopleObjectType,
        'email_addresses',
        'contains',
        '@example.com'
      );

      expect(filter.constraints).toEqual({
        email_address: { contains: '@example.com' },
      });
    });
  });
});
