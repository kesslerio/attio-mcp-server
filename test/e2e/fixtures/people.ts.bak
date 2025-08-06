/**
 * People Test Data Fixtures for E2E Tests
 * 
 * Provides pre-configured person test data scenarios
 */
import { E2EPersonFactory, type E2ETestPerson } from '../utils/test-data.js';

/**
 * Standard person fixtures for E2E testing
 */
export const personFixtures = {
  /**
   * Executive roles
   */
  executives: {
    ceo: (): E2ETestPerson => E2EPersonFactory.createExecutive({
      job_title: 'Chief Executive Officer',
      department: 'Executive',
      seniority: 'C-Level'
    }),

    cto: (): E2ETestPerson => E2EPersonFactory.createExecutive({
      job_title: 'Chief Technology Officer',
      department: 'Technology',
      seniority: 'C-Level'
    }),

    cfo: (): E2ETestPerson => E2EPersonFactory.createExecutive({
      job_title: 'Chief Financial Officer',
      department: 'Finance',
      seniority: 'C-Level'
    }),

    vp: (): E2ETestPerson => E2EPersonFactory.createExecutive({
      job_title: 'Vice President of Sales',
      department: 'Sales',
      seniority: 'VP'
    })
  },

  /**
   * Engineering roles
   */
  engineering: {
    senior: (): E2ETestPerson => E2EPersonFactory.createEngineer({
      job_title: 'Senior Software Engineer',
      seniority: 'Senior'
    }),

    lead: (): E2ETestPerson => E2EPersonFactory.createEngineer({
      job_title: 'Lead Software Engineer',
      seniority: 'Lead'
    }),

    architect: (): E2ETestPerson => E2EPersonFactory.createEngineer({
      job_title: 'Principal Software Architect',
      seniority: 'Principal'
    }),

    manager: (): E2ETestPerson => E2EPersonFactory.createEngineer({
      job_title: 'Engineering Manager',
      seniority: 'Manager'
    }),

    intern: (): E2ETestPerson => E2EPersonFactory.createEngineer({
      job_title: 'Software Engineering Intern',
      seniority: 'Intern'
    })
  },

  /**
   * Sales roles
   */
  sales: {
    rep: (): E2ETestPerson => E2EPersonFactory.createSalesPerson({
      job_title: 'Sales Representative',
      seniority: 'Individual Contributor'
    }),

    manager: (): E2ETestPerson => E2EPersonFactory.createSalesPerson({
      job_title: 'Sales Manager',
      seniority: 'Manager'
    }),

    director: (): E2ETestPerson => E2EPersonFactory.createSalesPerson({
      job_title: 'Director of Sales',
      seniority: 'Director'
    }),

    sdr: (): E2ETestPerson => E2EPersonFactory.createSalesPerson({
      job_title: 'Sales Development Representative',
      seniority: 'Junior'
    })
  },

  /**
   * Marketing roles
   */
  marketing: {
    manager: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Marketing Manager',
      department: 'Marketing',
      seniority: 'Manager'
    }),

    specialist: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Digital Marketing Specialist',
      department: 'Marketing',
      seniority: 'Mid-level'
    }),

    director: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Director of Marketing',
      department: 'Marketing',
      seniority: 'Director'
    })
  },

  /**
   * Product roles
   */
  product: {
    manager: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Product Manager',
      department: 'Product',
      seniority: 'Manager'
    }),

    owner: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Product Owner',
      department: 'Product',
      seniority: 'Senior'
    }),

    designer: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'UX/UI Designer',
      department: 'Design',
      seniority: 'Mid-level'
    })
  },

  /**
   * Operations roles
   */
  operations: {
    manager: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Operations Manager',
      department: 'Operations',
      seniority: 'Manager'
    }),

    analyst: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Business Analyst',
      department: 'Operations',
      seniority: 'Mid-level'
    }),

    coordinator: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Operations Coordinator',
      department: 'Operations',
      seniority: 'Junior'
    })
  },

  /**
   * Support roles
   */
  support: {
    hr: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'HR Manager',
      department: 'Human Resources',
      seniority: 'Manager'
    }),

    finance: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Financial Analyst',
      department: 'Finance',
      seniority: 'Mid-level'
    }),

    legal: (): E2ETestPerson => E2EPersonFactory.create({
      job_title: 'Legal Counsel',
      department: 'Legal',
      seniority: 'Senior'
    })
  }
};

/**
 * Person scenarios for complex testing
 */
export const personScenarios = {
  /**
   * Create a complete executive team
   */
  executiveTeam: () => ({
    ceo: personFixtures.executives.ceo(),
    cto: personFixtures.executives.cto(),
    cfo: personFixtures.executives.cfo(),
    vpSales: personFixtures.executives.vp(),
    vpMarketing: E2EPersonFactory.createExecutive({
      job_title: 'Vice President of Marketing',
      department: 'Marketing',
      seniority: 'VP'
    })
  }),

  /**
   * Create a development team
   */
  developmentTeam: () => ({
    manager: personFixtures.engineering.manager(),
    architect: personFixtures.engineering.architect(),
    lead: personFixtures.engineering.lead(),
    seniors: [
      personFixtures.engineering.senior(),
      personFixtures.engineering.senior()
    ],
    engineers: E2EPersonFactory.createMany(4, {
      job_title: 'Software Engineer',
      department: 'Engineering',
      seniority: 'Mid-level'
    }),
    intern: personFixtures.engineering.intern()
  }),

  /**
   * Create a sales organization
   */
  salesOrganization: () => ({
    director: personFixtures.sales.director(),
    managers: [
      personFixtures.sales.manager(),
      personFixtures.sales.manager()
    ],
    reps: E2EPersonFactory.createMany(6, {
      job_title: 'Account Executive',
      department: 'Sales',
      seniority: 'Mid-level'
    }),
    sdrs: E2EPersonFactory.createMany(4, {
      job_title: 'Sales Development Representative',
      department: 'Sales',
      seniority: 'Junior'
    })
  }),

  /**
   * Create cross-functional project team
   */
  projectTeam: () => ({
    projectManager: E2EPersonFactory.create({
      job_title: 'Senior Project Manager',
      department: 'Product',
      seniority: 'Senior'
    }),
    productManager: personFixtures.product.manager(),
    techLead: personFixtures.engineering.lead(),
    designer: personFixtures.product.designer(),
    engineers: E2EPersonFactory.createMany(3, {
      job_title: 'Software Engineer',
      department: 'Engineering',
      seniority: 'Mid-level'
    }),
    qa: E2EPersonFactory.create({
      job_title: 'QA Engineer',
      department: 'Quality Assurance',
      seniority: 'Mid-level'
    })
  }),

  /**
   * Create people for relationship testing
   */
  relationshipTesting: () => ({
    manager: personFixtures.engineering.manager(),
    directReports: E2EPersonFactory.createMany(5, {
      department: 'Engineering',
      seniority: 'Mid-level'
    }),
    peers: E2EPersonFactory.createMany(3, {
      seniority: 'Manager'
    }),
    stakeholders: [
      personFixtures.product.manager(),
      personFixtures.sales.director(),
      personFixtures.executives.cto()
    ]
  }),

  /**
   * Create people for search testing with varied attributes
   */
  searchTesting: () => [
    // Technology roles
    E2EPersonFactory.createEngineer({
      name: 'E2E Alice Anderson',
      job_title: 'Senior Full Stack Developer',
      department: 'Engineering'
    }),
    E2EPersonFactory.createEngineer({
      name: 'E2E Bob Bennett',
      job_title: 'DevOps Engineer',
      department: 'Infrastructure'
    }),
    E2EPersonFactory.createEngineer({
      name: 'E2E Carol Chen',
      job_title: 'Machine Learning Engineer',
      department: 'AI Research'
    }),

    // Sales roles
    E2EPersonFactory.createSalesPerson({
      name: 'E2E David Davis',
      job_title: 'Enterprise Account Executive',
      department: 'Sales'
    }),
    E2EPersonFactory.createSalesPerson({
      name: 'E2E Emma Evans',
      job_title: 'Inside Sales Representative',
      department: 'Sales'
    }),

    // Marketing roles
    personFixtures.marketing.manager(),
    personFixtures.marketing.specialist(),

    // Executive roles
    personFixtures.executives.ceo(),
    personFixtures.executives.cto()
  ]
};

/**
 * Edge case people for testing boundaries
 */
export const edgeCasePeople = {
  /**
   * Minimal valid person
   */
  minimal: (): E2ETestPerson => ({
    name: 'E2E Minimal Person',
    email_addresses: ['minimal@e2e-test.example.com']
  }),

  /**
   * Person with special characters
   */
  specialCharacters: (): E2ETestPerson => E2EPersonFactory.create({
    name: 'E2E José María O\'Connor-Smith Jr.',
    job_title: 'VP of R&D (Research & Development)',
    department: 'R&D',
    phone_numbers: ['+1-555-123-4567 ext. 890']
  }),

  /**
   * Person with very long fields
   */
  longFields: (): E2ETestPerson => E2EPersonFactory.create({
    name: 'E2E Very Long Person Name That Exceeds Normal Length Expectations',
    job_title: 'Senior Vice President of Global Strategic Business Development and Partnership Operations',
    department: 'Strategic Business Development and Partnership Operations'
  }),

  /**
   * Person with Unicode and emoji
   */
  unicode: (): E2ETestPerson => E2EPersonFactory.create({
    name: 'E2E 张小明 (Zhang Xiaoming) 👨‍💻',
    job_title: 'Software Engineer 🚀',
    department: 'Engineering 💻'
  }),

  /**
   * Person with multiple contact methods
   */
  multipleContacts: (): E2ETestPerson => E2EPersonFactory.create({
    email_addresses: [
      'primary@e2e-test.example.com',
      'work@e2e-test.example.com',
      'personal@e2e-test.example.com'
    ],
    phone_numbers: [
      '+1-555-123-4567', // Work
      '+1-555-987-6543', // Mobile
      '+1-555-456-7890'  // Home
    ]
  }),

  /**
   * Person with null/undefined prone fields
   */
  nullishFields: (): E2ETestPerson => ({
    name: 'E2E Nullish Person',
    email_addresses: ['nullish@e2e-test.example.com'],
    phone_numbers: undefined,
    job_title: null as any,
    department: '',
    seniority: undefined
  })
};

/**
 * Performance testing people
 */
export const performancePeople = {
  /**
   * Generate many people for batch testing
   */
  generateBatch: (count: number = 100): E2ETestPerson[] => {
    return E2EPersonFactory.createMany(count, {
      department: 'Batch Testing Department',
      seniority: 'Batch Test Role'
    });
  },

  /**
   * Generate people with similar names for search testing
   */
  generateSimilarNames: (baseNumber: number = 10): E2ETestPerson[] => {
    return Array.from({ length: baseNumber }, (_, i) => 
      E2EPersonFactory.create({
        name: `E2E Similar Person ${String(i + 1).padStart(3, '0')}`,
        job_title: 'Search Test Role'
      })
    );
  },

  /**
   * Generate people for different departments
   */
  generateByDepartment: (department: string, count: number = 10): E2ETestPerson[] => {
    return E2EPersonFactory.createMany(count, {
      department,
      seniority: 'Mid-level'
    });
  }
};

/**
 * Contact information variations
 */
export const contactVariations = {
  /**
   * Different email formats
   */
  emailFormats: [
    'firstname.lastname@e2e-test.example.com',
    'firstname@e2e-test.example.com',
    'f.lastname@e2e-test.example.com',
    'firstname123@e2e-test.example.com',
    'firstname+test@e2e-test.example.com'
  ],

  /**
   * Different phone formats
   */
  phoneFormats: [
    '+1-555-123-4567',
    '(555) 123-4567',
    '555.123.4567',
    '5551234567',
    '+1 555 123 4567'
  ]
};

/**
 * Export all fixtures
 */
export default {
  fixtures: personFixtures,
  scenarios: personScenarios,
  edgeCases: edgeCasePeople,
  performance: performancePeople,
  contacts: contactVariations
};