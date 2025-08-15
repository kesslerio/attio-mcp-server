/**
 * E2E Test Fixtures - Main Export File
 *
 * Consolidates all test data factories for easy import in test files.
 */

export * from './companies.js';
export * from './people.js';
export * from './lists.js';
export * from './tasks.js';
export * from './notes.js';

// Re-export the factories from test-data for convenience
export {
  CompanyFactory,
  PersonFactory,
  ListFactory,
  TaskFactory,
  NoteFactory,
  TestScenarios,
  TestDataValidator,
} from '../utils/test-data.js';

// Import for internal use
import {
  CompanyFactory,
  PersonFactory,
  ListFactory,
  TaskFactory,
  NoteFactory,
} from '../utils/test-data.js';

// Create the testDataGenerator object for backward compatibility
// Wrapping factory methods to match expected API
export const testDataGenerator = {
  companies: {
    basicCompany: () => CompanyFactory.create(),
    create: CompanyFactory.create.bind(CompanyFactory),
    createMany: CompanyFactory.createMany.bind(CompanyFactory),
    advanced: () =>
      CompanyFactory.create({
        annual_revenue: '50000000', // Convert to string to match API
        employee_count: '500',
        categories: ['Enterprise', 'Software', 'B2B'],
      }),
  },
  people: {
    basicPerson: () => PersonFactory.create(),
    create: PersonFactory.create.bind(PersonFactory),
    createMany: PersonFactory.createMany.bind(PersonFactory),
    withCompany: (companyId: string) =>
      PersonFactory.create({ company: companyId }),
  },
  lists: {
    basicList: () => ListFactory.create(),
    create: ListFactory.create.bind(ListFactory),
    createMany: ListFactory.createMany.bind(ListFactory),
  },
  tasks: {
    basicTask: () => TaskFactory.create(),
    create: TaskFactory.create.bind(TaskFactory),
    createMany: TaskFactory.createMany.bind(TaskFactory),
    highPriority: () =>
      TaskFactory.create({ priority: 'high', status: 'pending' }),
  },
  notes: {
    basicNote: (parentType: string, parentId: string) =>
      NoteFactory.create(parentType, parentId),
    create: NoteFactory.create.bind(NoteFactory),
    createMany: NoteFactory.createMany.bind(NoteFactory),
    markdown: (parentType: string, parentId: string) =>
      NoteFactory.create(parentType, parentId, { format: 'markdown' }),
  },
};
