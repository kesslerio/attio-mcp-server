/**
 * List Test Data Fixtures for E2E Tests
 * 
 * Provides pre-configured list test data scenarios
 */
import { E2EListFactory, type E2ETestList } from '../utils/test-data.js';

/**
 * Standard list fixtures for E2E testing
 */
export const listFixtures = {
  /**
   * Company lists
   */
  companies: {
    prospects: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Prospect Companies',
      description: 'Companies identified as potential prospects for E2E testing'
    }),

    customers: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Customer Companies',
      description: 'Current customer companies for E2E testing'
    }),

    competitors: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Competitor Analysis',
      description: 'Companies identified as competitors for E2E testing'
    }),

    partners: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Strategic Partners',
      description: 'Partner companies for E2E testing'
    })
  },

  /**
   * People lists
   */
  people: {
    leads: (): E2ETestList => E2EListFactory.createPersonList({
      name: 'E2E Sales Leads',
      description: 'People identified as sales leads for E2E testing'
    }),

    contacts: (): E2ETestList => E2EListFactory.createPersonList({
      name: 'E2E Key Contacts',
      description: 'Important contacts for E2E testing'
    }),

    champions: (): E2ETestList => E2EListFactory.createPersonList({
      name: 'E2E Customer Champions',
      description: 'Champions within customer organizations for E2E testing'
    }),

    decisionMakers: (): E2ETestList => E2EListFactory.createPersonList({
      name: 'E2E Decision Makers',
      description: 'Decision makers for E2E testing'
    })
  },

  /**
   * Industry-specific lists
   */
  industry: {
    technology: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Technology Companies',
      description: 'Technology sector companies for E2E testing'
    }),

    finance: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Financial Services',
      description: 'Financial services companies for E2E testing'
    }),

    healthcare: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Healthcare Organizations',
      description: 'Healthcare organizations for E2E testing'
    })
  },

  /**
   * Geographic lists
   */
  geography: {
    northAmerica: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E North America',
      description: 'North American companies for E2E testing'
    }),

    europe: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Europe',
      description: 'European companies for E2E testing'
    }),

    asiaPacific: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Asia Pacific',
      description: 'Asia Pacific companies for E2E testing'
    })
  },

  /**
   * Size-based lists
   */
  size: {
    enterprise: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Enterprise Accounts',
      description: 'Large enterprise companies for E2E testing'
    }),

    midMarket: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Mid-Market Companies',
      description: 'Mid-market companies for E2E testing'
    }),

    startups: (): E2ETestList => E2EListFactory.createCompanyList({
      name: 'E2E Startup Companies',
      description: 'Startup companies for E2E testing'
    })
  }
};

/**
 * List scenarios for complex testing
 */
export const listScenarios = {
  /**
   * Create a complete sales pipeline with lists
   */
  salesPipeline: () => ({
    prospects: listFixtures.companies.prospects(),
    qualifiedLeads: E2EListFactory.createCompanyList({
      name: 'E2E Qualified Leads',
      description: 'Qualified prospect companies'
    }),
    opportunities: E2EListFactory.createCompanyList({
      name: 'E2E Active Opportunities',
      description: 'Companies with active sales opportunities'
    }),
    customers: listFixtures.companies.customers(),
    churned: E2EListFactory.createCompanyList({
      name: 'E2E Churned Customers',
      description: 'Previously active customers who have churned'
    })
  }),

  /**
   * Create market segmentation lists
   */
  marketSegmentation: () => ({
    // By industry
    technology: listFixtures.industry.technology(),
    finance: listFixtures.industry.finance(),
    healthcare: listFixtures.industry.healthcare(),
    
    // By size
    enterprise: listFixtures.size.enterprise(),
    midMarket: listFixtures.size.midMarket(),
    startups: listFixtures.size.startups(),
    
    // By geography
    northAmerica: listFixtures.geography.northAmerica(),
    europe: listFixtures.geography.europe(),
    asiaPacific: listFixtures.geography.asiaPacific()
  }),

  /**
   * Create relationship-based lists
   */
  relationships: () => ({
    customers: listFixtures.companies.customers(),
    partners: listFixtures.companies.partners(),
    competitors: listFixtures.companies.competitors(),
    suppliers: E2EListFactory.createCompanyList({
      name: 'E2E Suppliers',
      description: 'Supplier companies for E2E testing'
    }),
    vendors: E2EListFactory.createCompanyList({
      name: 'E2E Vendors',
      description: 'Vendor companies for E2E testing'
    })
  }),

  /**
   * Create people-focused lists
   */
  peopleSegmentation: () => ({
    leads: listFixtures.people.leads(),
    contacts: listFixtures.people.contacts(),
    champions: listFixtures.people.champions(),
    decisionMakers: listFixtures.people.decisionMakers(),
    influencers: E2EListFactory.createPersonList({
      name: 'E2E Influencers',
      description: 'Influential people for E2E testing'
    }),
    newsletter: E2EListFactory.createPersonList({
      name: 'E2E Newsletter Subscribers',
      description: 'Newsletter subscribers for E2E testing'
    })
  }),

  /**
   * Create lists for testing different operations
   */
  operationTesting: () => ({
    // For CRUD operations
    crud: E2EListFactory.createCompanyList({
      name: 'E2E CRUD Test List',
      description: 'List for testing CRUD operations'
    }),
    
    // For batch operations
    batch: E2EListFactory.createCompanyList({
      name: 'E2E Batch Operations List',
      description: 'List for testing batch operations'
    }),
    
    // For search operations
    search: E2EListFactory.createCompanyList({
      name: 'E2E Search Test List',
      description: 'List for testing search functionality'
    }),
    
    // For relationship operations
    relationships: E2EListFactory.createPersonList({
      name: 'E2E Relationship Test List',
      description: 'List for testing relationship operations'
    })
  })
};

/**
 * Edge case lists for testing boundaries
 */
export const edgeCaseLists = {
  /**
   * Minimal valid list
   */
  minimal: (): E2ETestList => ({
    name: 'E2E Minimal List',
    parent_object: 'companies'
  }),

  /**
   * List with special characters
   */
  specialCharacters: (): E2ETestList => E2EListFactory.create({
    name: 'E2E Special™ & Co. "List" #1',
    description: 'List with special characters: áéíóú ñ çß àèìòù âêîôû'
  }),

  /**
   * List with very long fields
   */
  longFields: (): E2ETestList => E2EListFactory.create({
    name: 'E2E Very Long List Name That Exceeds Normal Length Expectations For Testing Purposes',
    description: 'This is a very long description that contains multiple sentences and goes on for quite some time to test how the system handles lengthy text fields. It includes various details about the list purpose, criteria, and extensive background information that might be provided in real-world scenarios.'
  }),

  /**
   * List with Unicode and emoji
   */
  unicode: (): E2ETestList => E2EListFactory.create({
    name: 'E2E 📋 Unicode List 测试 列表 📝',
    description: 'List with Unicode characters: 中文 العربية русский 日本語 한국어 🌍'
  }),

  /**
   * List with null/undefined prone fields
   */
  nullishFields: (): E2ETestList => ({
    name: 'E2E Nullish List',
    parent_object: 'companies',
    description: undefined
  })
};

/**
 * Performance testing lists
 */
export const performanceLists = {
  /**
   * Generate many lists for batch testing
   */
  generateBatch: (count: number = 50): E2ETestList[] => {
    return E2EListFactory.createMany(count, {
      description: 'Batch testing list for performance evaluation'
    });
  },

  /**
   * Generate lists with similar names for search testing
   */
  generateSimilarNames: (baseNumber: number = 10): E2ETestList[] => {
    return Array.from({ length: baseNumber }, (_, i) => 
      E2EListFactory.create({
        name: `E2E Similar List ${String(i + 1).padStart(3, '0')}`,
        description: `Search testing list number ${i + 1}`
      })
    );
  },

  /**
   * Generate lists for different parent objects
   */
  generateByParentObject: (parentObject: string, count: number = 5): E2ETestList[] => {
    return E2EListFactory.createMany(count, {
      parent_object: parentObject,
      description: `Testing list for ${parentObject} parent object`
    });
  }
};

/**
 * List categories for organization
 */
export const listCategories = {
  sales: [
    'prospects',
    'leads',
    'opportunities',
    'customers',
    'champions'
  ],
  
  marketing: [
    'subscribers',
    'attendees',
    'webinar_participants',
    'content_downloaders',
    'newsletter_subscribers'
  ],
  
  operations: [
    'suppliers',
    'vendors',
    'partners',
    'contractors',
    'consultants'
  ],
  
  analysis: [
    'competitors',
    'market_research',
    'industry_trends',
    'benchmarking',
    'case_studies'
  ]
};

/**
 * Export all fixtures
 */
export default {
  fixtures: listFixtures,
  scenarios: listScenarios,
  edgeCases: edgeCaseLists,
  performance: performanceLists,
  categories: listCategories
};