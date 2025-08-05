/**
 * Task Test Data Fixtures for E2E Tests
 * 
 * Provides pre-configured task test data scenarios
 */
import { E2ETaskFactory, type E2ETestTask } from '../utils/test-data.js';

/**
 * Standard task fixtures for E2E testing
 */
export const taskFixtures = {
  /**
   * Sales tasks
   */
  sales: {
    followUp: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Follow up with prospect',
      content: 'Follow up on the initial sales conversation and answer any questions',
      priority: 'high',
      status: 'open'
    }),

    demo: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Schedule product demo',
      content: 'Schedule and conduct a product demonstration for the prospect',
      priority: 'high',
      status: 'open'
    }),

    proposal: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Prepare sales proposal',
      content: 'Create customized sales proposal based on discovery call findings',
      priority: 'medium',
      status: 'in_progress'
    }),

    contract: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Send contract for signature',
      content: 'Send final contract to client for review and signature',
      priority: 'high',
      status: 'open'
    })
  },

  /**
   * Marketing tasks
   */
  marketing: {
    campaign: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Launch email campaign',
      content: 'Launch the Q4 email marketing campaign to nurture leads',
      priority: 'medium',
      status: 'scheduled'
    }),

    content: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Create blog post',
      content: 'Write and publish blog post about industry trends',
      priority: 'low',
      status: 'open'
    }),

    social: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Update social media',
      content: 'Post weekly updates across all social media channels',
      priority: 'low',
      status: 'recurring'
    })
  },

  /**
   * Customer success tasks
   */
  customerSuccess: {
    onboarding: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Complete customer onboarding',
      content: 'Guide new customer through onboarding process and initial setup',
      priority: 'high',
      status: 'in_progress'
    }),

    checkIn: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Quarterly business review',
      content: 'Conduct quarterly review meeting with key customer stakeholders',
      priority: 'medium',
      status: 'scheduled'
    }),

    renewal: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Contract renewal discussion',
      content: 'Initiate contract renewal discussion 90 days before expiration',
      priority: 'high',
      status: 'open'
    })
  },

  /**
   * Administrative tasks
   */
  admin: {
    dataEntry: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Update CRM records',
      content: 'Update customer information and activity logs in CRM system',
      priority: 'low',
      status: 'open'
    }),

    reporting: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Generate monthly report',
      content: 'Compile and distribute monthly sales and marketing metrics report',
      priority: 'medium',
      status: 'recurring'
    }),

    cleanup: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Database cleanup',
      content: 'Remove duplicate records and update outdated contact information',
      priority: 'low',
      status: 'scheduled'
    })
  },

  /**
   * Development tasks
   */
  development: {
    bugfix: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Fix critical bug',
      content: 'Investigate and fix critical bug reported by customer',
      priority: 'high',
      status: 'in_progress'
    }),

    feature: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Implement new feature',
      content: 'Develop new feature based on customer feedback and requirements',
      priority: 'medium',
      status: 'open'
    }),

    testing: (): E2ETestTask => E2ETaskFactory.create({
      title: 'E2E Write unit tests',
      content: 'Write comprehensive unit tests for new functionality',
      priority: 'medium',
      status: 'open'
    })
  }
};

/**
 * Task scenarios for complex testing
 */
export const taskScenarios = {
  /**
   * Create a complete sales process workflow
   */
  salesWorkflow: () => ({
    prospecting: E2ETaskFactory.create({
      title: 'E2E Research prospect company',
      content: 'Research company background, key personnel, and recent news',
      priority: 'medium',
      status: 'completed'
    }),
    outreach: E2ETaskFactory.create({
      title: 'E2E Initial outreach call',
      content: 'Make initial contact call to introduce our solution',
      priority: 'high',
      status: 'completed'
    }),
    followUp: taskFixtures.sales.followUp(),
    demo: taskFixtures.sales.demo(),
    proposal: taskFixtures.sales.proposal(),
    negotiation: E2ETaskFactory.create({
      title: 'E2E Contract negotiation',
      content: 'Negotiate contract terms and pricing with prospect',
      priority: 'high',
      status: 'scheduled'
    }),
    closing: taskFixtures.sales.contract()
  }),

  /**
   * Create a project management scenario
   */
  projectManagement: () => ({
    planning: E2ETaskFactory.create({
      title: 'E2E Project planning meeting',
      content: 'Define project scope, timeline, and resource requirements',
      priority: 'high',
      status: 'completed'
    }),
    kickoff: E2ETaskFactory.create({
      title: 'E2E Project kickoff',
      content: 'Conduct project kickoff meeting with all stakeholders',
      priority: 'high',
      status: 'in_progress'
    }),
    development: [
      taskFixtures.development.feature(),
      taskFixtures.development.testing(),
      E2ETaskFactory.create({
        title: 'E2E Code review',
        content: 'Review code changes and ensure quality standards',
        priority: 'medium',
        status: 'open'
      })
    ],
    deployment: E2ETaskFactory.create({
      title: 'E2E Production deployment',
      content: 'Deploy completed features to production environment',
      priority: 'high',
      status: 'scheduled'
    }),
    closure: E2ETaskFactory.create({
      title: 'E2E Project retrospective',
      content: 'Conduct project retrospective and document lessons learned',
      priority: 'low',
      status: 'open'
    })
  }),

  /**
   * Create customer lifecycle tasks
   */
  customerLifecycle: () => ({
    acquisition: [
      taskFixtures.sales.followUp(),
      taskFixtures.sales.demo(),
      taskFixtures.sales.proposal()
    ],
    onboarding: [
      taskFixtures.customerSuccess.onboarding(),
      E2ETaskFactory.create({
        title: 'E2E Training session',
        content: 'Conduct comprehensive training for new customer team',
        priority: 'high',
        status: 'scheduled'
      }),
      E2ETaskFactory.create({
        title: 'E2E Setup validation',
        content: 'Validate that customer setup is complete and functional',
        priority: 'medium',
        status: 'open'
      })
    ],
    ongoing: [
      taskFixtures.customerSuccess.checkIn(),
      E2ETaskFactory.create({
        title: 'E2E Success metrics review',
        content: 'Review customer success metrics and identify improvement opportunities',
        priority: 'medium',
        status: 'recurring'
      })
    ],
    renewal: [
      taskFixtures.customerSuccess.renewal(),
      E2ETaskFactory.create({
        title: 'E2E Renewal negotiation',
        content: 'Negotiate renewal terms and pricing for existing customer',
        priority: 'high',
        status: 'open'
      })
    ]
  }),

  /**
   * Create tasks for different priority levels
   */
  priorityTesting: () => ({
    critical: E2ETaskFactory.createHighPriority({
      title: 'E2E Critical system outage',
      content: 'Investigate and resolve critical system outage affecting all customers',
      status: 'in_progress'
    }),
    high: [
      taskFixtures.sales.followUp(),
      taskFixtures.development.bugfix(),
      taskFixtures.customerSuccess.onboarding()
    ],
    medium: [
      taskFixtures.sales.proposal(),
      taskFixtures.marketing.campaign(),
      taskFixtures.development.feature()
    ],
    low: [
      taskFixtures.marketing.content(),
      taskFixtures.admin.dataEntry(),
      taskFixtures.admin.cleanup()
    ]
  }),

  /**
   * Create tasks for testing different statuses
   */
  statusTesting: () => ({
    open: [
      taskFixtures.sales.followUp(),
      taskFixtures.development.feature(),
      taskFixtures.marketing.content()
    ],
    inProgress: [
      taskFixtures.sales.proposal(),
      taskFixtures.customerSuccess.onboarding(),
      taskFixtures.development.bugfix()
    ],
    completed: [
      E2ETaskFactory.create({
        title: 'E2E Completed task',
        content: 'This task has been completed successfully',
        priority: 'medium',
        status: 'completed'
      })
    ],
    scheduled: [
      taskFixtures.marketing.campaign(),
      taskFixtures.customerSuccess.checkIn(),
      taskFixtures.admin.cleanup()
    ],
    cancelled: [
      E2ETaskFactory.create({
        title: 'E2E Cancelled task',
        content: 'This task was cancelled due to changing priorities',
        priority: 'low',
        status: 'cancelled'
      })
    ]
  })
};

/**
 * Edge case tasks for testing boundaries
 */
export const edgeCaseTasks = {
  /**
   * Minimal valid task
   */
  minimal: (): E2ETestTask => ({
    title: 'E2E Minimal Task'
  }),

  /**
   * Task with special characters
   */
  specialCharacters: (): E2ETestTask => E2ETaskFactory.create({
    title: 'E2E Special™ & Co. "Task" #1',
    content: 'Task with special characters: áéíóú ñ çß àèìòù âêîôû'
  }),

  /**
   * Task with very long fields
   */
  longFields: (): E2ETestTask => E2ETaskFactory.create({
    title: 'E2E Very Long Task Title That Exceeds Normal Length Expectations For Testing Purposes',
    content: 'This is a very long task description that contains multiple paragraphs and goes on for quite some time to test how the system handles lengthy text fields. It includes detailed instructions, background information, acceptance criteria, and extensive notes that might be provided in real-world scenarios. The purpose is to ensure that the system can handle and properly store, retrieve, and display longer text content without issues or truncation.'
  }),

  /**
   * Task with Unicode and emoji
   */
  unicode: (): E2ETestTask => E2ETaskFactory.create({
    title: 'E2E 📋 Unicode Task 测试 任务 ✅',
    content: 'Task with Unicode characters: 中文 العربية русский 日本語 한국어 🌍'
  }),

  /**
   * Task with null/undefined prone fields
   */
  nullishFields: (): E2ETestTask => ({
    title: 'E2E Nullish Task',
    content: undefined,
    priority: null as any,
    status: undefined,
    due_date: null as any
  }),

  /**
   * Task with past due date
   */
  pastDue: (): E2ETestTask => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days ago
    
    return E2ETaskFactory.create({
      title: 'E2E Past Due Task',
      content: 'This task is past its due date for testing overdue scenarios',
      due_date: pastDate.toISOString().split('T')[0],
      status: 'open',
      priority: 'high'
    });
  },

  /**
   * Task with far future due date
   */
  farFuture: (): E2ETestTask => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
    
    return E2ETaskFactory.create({
      title: 'E2E Far Future Task',
      content: 'This task has a due date far in the future for testing long-term planning',
      due_date: futureDate.toISOString().split('T')[0],
      status: 'open',
      priority: 'low'
    });
  }
};

/**
 * Performance testing tasks
 */
export const performanceTasks = {
  /**
   * Generate many tasks for batch testing
   */
  generateBatch: (count: number = 100): E2ETestTask[] => {
    return E2ETaskFactory.createMany(count, {
      content: 'Batch testing task for performance evaluation',
      priority: 'medium',
      status: 'open'
    });
  },

  /**
   * Generate tasks with similar titles for search testing
   */
  generateSimilarTitles: (baseNumber: number = 20): E2ETestTask[] => {
    return Array.from({ length: baseNumber }, (_, i) => 
      E2ETaskFactory.create({
        title: `E2E Similar Task ${String(i + 1).padStart(3, '0')}`,
        content: `Search testing task number ${i + 1}`,
        priority: 'medium'
      })
    );
  },

  /**
   * Generate tasks with different due dates for timeline testing
   */
  generateTimeline: (count: number = 30): E2ETestTask[] => {
    return Array.from({ length: count }, (_, i) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + i); // Spread tasks over next 30 days
      
      return E2ETaskFactory.create({
        title: `E2E Timeline Task ${i + 1}`,
        content: `Task ${i + 1} in timeline sequence`,
        due_date: dueDate.toISOString().split('T')[0],
        priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low'
      });
    });
  }
};

/**
 * Task status options
 */
export const taskStatuses = [
  'open',
  'in_progress',
  'completed',
  'scheduled',
  'cancelled',
  'on_hold',
  'waiting',
  'recurring'
];

/**
 * Task priority options
 */
export const taskPriorities = [
  'critical',
  'high',
  'medium',
  'low'
];

/**
 * Export all fixtures
 */
export default {
  fixtures: taskFixtures,
  scenarios: taskScenarios,
  edgeCases: edgeCaseTasks,
  performance: performanceTasks,
  statuses: taskStatuses,
  priorities: taskPriorities
};