/**
 * Company Test Data Fixtures for E2E Tests
 * 
 * Provides pre-configured company test data scenarios
 */
import { E2ECompanyFactory, type E2ETestCompany } from '../utils/test-data.js';

/**
 * Standard company fixtures for E2E testing
 */
export const companyFixtures = {
  /**
   * Technology companies
   */
  technology: {
    startup: (): E2ETestCompany => E2ECompanyFactory.createTechnology({
      annual_revenue: 2000000,
      employee_count: 25,
      categories: ['Software', 'SaaS', 'Startup'],
      description: 'E2E test technology startup company'
    }),

    enterprise: (): E2ETestCompany => E2ECompanyFactory.createTechnology({
      annual_revenue: 50000000,
      employee_count: 500,
      categories: ['Software', 'Enterprise', 'B2B'],
      description: 'E2E test enterprise technology company'
    }),

    unicorn: (): E2ETestCompany => E2ECompanyFactory.createTechnology({
      annual_revenue: 1000000000,
      employee_count: 2000,
      categories: ['Software', 'SaaS', 'Unicorn', 'Public'],
      description: 'E2E test unicorn technology company'
    })
  },

  /**
   * Financial services companies
   */
  finance: {
    bank: (): E2ETestCompany => E2ECompanyFactory.createFinance({
      industry: 'Banking',
      categories: ['Banking', 'Financial Services', 'B2C'],
      annual_revenue: 100000000,
      employee_count: 1000,
      description: 'E2E test banking company'
    }),

    fintech: (): E2ETestCompany => E2ECompanyFactory.createFinance({
      industry: 'Financial Technology',
      categories: ['Fintech', 'Software', 'B2B'],
      annual_revenue: 25000000,
      employee_count: 200,
      description: 'E2E test fintech company'
    }),

    investment: (): E2ETestCompany => E2ECompanyFactory.createFinance({
      industry: 'Investment Management',
      categories: ['Investment', 'Financial Services', 'B2B'],
      annual_revenue: 75000000,
      employee_count: 300,
      description: 'E2E test investment management company'
    })
  },

  /**
   * Healthcare companies
   */
  healthcare: {
    hospital: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Healthcare',
      categories: ['Healthcare', 'Hospital', 'B2C'],
      annual_revenue: 150000000,
      employee_count: 2500,
      description: 'E2E test hospital organization'
    }),

    biotech: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Biotechnology',
      categories: ['Biotech', 'Research', 'B2B'],
      annual_revenue: 30000000,
      employee_count: 150,
      description: 'E2E test biotechnology company'
    }),

    medtech: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Medical Technology',
      categories: ['MedTech', 'Healthcare', 'B2B'],
      annual_revenue: 80000000,
      employee_count: 400,
      description: 'E2E test medical technology company'
    })
  },

  /**
   * Retail and consumer companies
   */
  retail: {
    ecommerce: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'E-commerce',
      categories: ['E-commerce', 'Retail', 'B2C'],
      annual_revenue: 45000000,
      employee_count: 300,
      description: 'E2E test e-commerce company'
    }),

    fashion: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Fashion & Apparel',
      categories: ['Fashion', 'Retail', 'B2C'],
      annual_revenue: 20000000,
      employee_count: 150,
      description: 'E2E test fashion company'
    }),

    grocery: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Grocery & Food',
      categories: ['Grocery', 'Retail', 'B2C'],
      annual_revenue: 200000000,
      employee_count: 3000,
      description: 'E2E test grocery chain company'
    })
  },

  /**
   * Manufacturing companies
   */
  manufacturing: {
    automotive: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Automotive Manufacturing',
      categories: ['Manufacturing', 'Automotive', 'B2B'],
      annual_revenue: 500000000,
      employee_count: 5000,
      description: 'E2E test automotive manufacturing company'
    }),

    electronics: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Electronics Manufacturing',
      categories: ['Manufacturing', 'Electronics', 'B2B'],
      annual_revenue: 300000000,
      employee_count: 2000,
      description: 'E2E test electronics manufacturing company'
    }),

    textiles: (): E2ETestCompany => E2ECompanyFactory.create({
      industry: 'Textile Manufacturing',
      categories: ['Manufacturing', 'Textiles', 'B2B'],
      annual_revenue: 50000000,
      employee_count: 800,
      description: 'E2E test textile manufacturing company'
    })
  }
};

/**
 * Company scenarios for complex testing
 */
export const companyScenarios = {
  /**
   * Create a competitive landscape scenario
   */
  competitiveLandscape: () => ({
    leader: companyFixtures.technology.unicorn(),
    challenger: companyFixtures.technology.enterprise(),
    disruptor: companyFixtures.technology.startup(),
    traditional: companyFixtures.finance.bank()
  }),

  /**
   * Create a supply chain scenario
   */
  supplyChain: () => ({
    manufacturer: companyFixtures.manufacturing.automotive(),
    supplier1: companyFixtures.manufacturing.electronics(),
    supplier2: companyFixtures.manufacturing.textiles(),
    distributor: companyFixtures.retail.ecommerce(),
    retailer: companyFixtures.retail.grocery()
  }),

  /**
   * Create an investment portfolio scenario
   */
  investmentPortfolio: () => ({
    growth: companyFixtures.technology.startup(),
    stable: companyFixtures.finance.bank(),
    value: companyFixtures.manufacturing.automotive(),
    speculative: companyFixtures.healthcare.biotech()
  }),

  /**
   * Create companies for relationship testing
   */
  relationshipTesting: () => ({
    parent: companyFixtures.technology.enterprise(),
    subsidiary1: companyFixtures.technology.startup(),
    subsidiary2: companyFixtures.finance.fintech(),
    partner: companyFixtures.healthcare.medtech(),
    competitor: companyFixtures.technology.unicorn()
  }),

  /**
   * Create companies for search testing with varied attributes
   */
  searchTesting: () => [
    // Technology companies with different sizes
    E2ECompanyFactory.createTechnology({
      name: 'E2E Alpha Tech Solutions',
      employee_count: 50,
      annual_revenue: 5000000,
      categories: ['Software', 'AI', 'Machine Learning']
    }),
    E2ECompanyFactory.createTechnology({
      name: 'E2E Beta Software Corp',
      employee_count: 200,
      annual_revenue: 25000000,
      categories: ['Software', 'SaaS', 'Cloud']
    }),
    E2ECompanyFactory.createTechnology({
      name: 'E2E Gamma Systems Inc',
      employee_count: 1000,
      annual_revenue: 100000000,
      categories: ['Software', 'Enterprise', 'Security']
    }),
    
    // Finance companies
    E2ECompanyFactory.createFinance({
      name: 'E2E Delta Financial Group',
      employee_count: 500,
      annual_revenue: 75000000,
      categories: ['Banking', 'Investment', 'Wealth Management']
    }),
    E2ECompanyFactory.createFinance({
      name: 'E2E Epsilon Credit Union',
      employee_count: 100,
      annual_revenue: 15000000,
      categories: ['Banking', 'Credit Union', 'Community']
    }),

    // Healthcare companies
    companyFixtures.healthcare.hospital(),
    companyFixtures.healthcare.biotech(),

    // Retail companies
    companyFixtures.retail.ecommerce(),
    companyFixtures.retail.fashion()
  ]
};

/**
 * Edge case companies for testing boundaries
 */
export const edgeCaseCompanies = {
  /**
   * Minimal valid company
   */
  minimal: (): E2ETestCompany => ({
    name: 'E2E Minimal Company',
    // Only required fields
  }),

  /**
   * Company with special characters
   */
  specialCharacters: (): E2ETestCompany => E2ECompanyFactory.create({
    name: 'E2E Special™ & Co. (Test) "Company" #1',
    description: 'Company with special characters: áéíóú ñ çß àèìòù âêîôû',
    industry: 'Technology & Innovation'
  }),

  /**
   * Company with very long fields
   */
  longFields: (): E2ETestCompany => E2ECompanyFactory.create({
    name: 'E2E Very Long Company Name That Exceeds Normal Length Expectations For Testing Purposes',
    description: 'This is a very long description that contains multiple sentences and goes on for quite some time to test how the system handles lengthy text fields. It includes various details about the company, its mission, vision, values, and extensive background information that might be provided in real-world scenarios. The purpose is to ensure that the system can handle and properly store, retrieve, and display longer text content without issues.',
    industry: 'Advanced Technology Solutions & Digital Transformation Services'
  }),

  /**
   * Company with Unicode and emoji
   */
  unicode: (): E2ETestCompany => E2ECompanyFactory.create({
    name: 'E2E 🚀 Unicode Company 测试 公司 🏢',
    description: 'Company with Unicode characters: 中文 العربية русский 日本語 한국어 🌍',
    industry: 'Global Technology 🌐'
  }),

  /**
   * Company with null/undefined prone fields
   */
  nullishFields: (): E2ETestCompany => ({
    name: 'E2E Nullish Company',
    domain: undefined,
    website: null as any,
    description: '',
    annual_revenue: 0,
    employee_count: 1
  })
};

/**
 * Performance testing companies
 */
export const performanceCompanies = {
  /**
   * Generate many companies for batch testing
   */
  generateBatch: (count: number = 100): E2ETestCompany[] => {
    return E2ECompanyFactory.createMany(count, {
      industry: 'Batch Testing Industry',
      categories: ['Batch', 'Performance', 'Testing']
    });
  },

  /**
   * Generate companies with similar names for search testing
   */
  generateSimilarNames: (baseNumber: number = 10): E2ETestCompany[] => {
    return Array.from({ length: baseNumber }, (_, i) => 
      E2ECompanyFactory.create({
        name: `E2E Similar Company ${String(i + 1).padStart(3, '0')}`,
        industry: 'Search Testing Industry'
      })
    );
  }
};

/**
 * Export all fixtures
 */
export default {
  fixtures: companyFixtures,
  scenarios: companyScenarios,
  edgeCases: edgeCaseCompanies,
  performance: performanceCompanies
};