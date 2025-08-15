/**
 * Note Test Data Fixtures for E2E Tests
 *
 * Provides pre-configured note test data scenarios for companies and people
 */
import { E2ENoteFactory, type E2ETestNote } from '../utils/test-data.js';

/**
 * Standard note fixtures for E2E testing
 */
export const noteFixtures = {
  /**
   * Company note fixtures
   */
  companies: {
    meeting: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Meeting Notes',
        content:
          'Initial meeting with the client went well. Discussed their current challenges with data management and potential solutions. Key decision makers were present and showed strong interest in our platform.',
        format: 'plaintext',
      }),

    followUp: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Follow-up Call',
        content:
          'Follow-up call completed. Client confirmed budget availability and timeline. Next steps: send proposal by end of week and schedule technical demo.',
        format: 'plaintext',
      }),

    demo: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Product Demo Notes',
        content:
          'Conducted comprehensive product demo. Attendees were impressed with the analytics capabilities and integration options. Technical questions answered satisfactorily.',
        format: 'plaintext',
      }),

    contract: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Contract Discussion',
        content:
          'Contract negotiation meeting. Discussed terms, pricing, and implementation timeline. Minor revisions requested on data retention policy.',
        format: 'plaintext',
      }),

    onboarding: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Onboarding Session',
        content:
          'Completed initial onboarding session. Set up user accounts, configured basic settings, and provided training materials. Customer team is ready to begin using the platform.',
        format: 'plaintext',
      }),

    quarterly: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Quarterly Business Review',
        content:
          'Q3 business review completed. Customer satisfaction remains high. Discussed expansion opportunities and additional feature requests for next quarter.',
        format: 'plaintext',
      }),

    support: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Support Issue',
        content:
          'Customer reported integration issue with their CRM system. Provided temporary workaround and escalated to engineering team for permanent fix.',
        format: 'plaintext',
      }),

    renewal: (companyId: string): E2ETestNote =>
      E2ENoteFactory.create('companies', companyId, {
        title: 'E2E Contract Renewal',
        content:
          'Annual renewal discussion. Customer is happy with service and wants to expand usage. Negotiating upgraded plan with additional features.',
        format: 'plaintext',
      }),
  },

  /**
   * Person note fixtures
   */
  people: {
    introduction: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Initial Contact',
        content:
          'First conversation with prospect. They are the head of operations and decision maker for technology purchases. Interested in learning more about our solution.',
        format: 'plaintext',
      }),

    discovery: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Discovery Call',
        content:
          'Discovery call revealed specific pain points around data integration and reporting. Current tools are manual and time-consuming. Budget approved for solution.',
        format: 'plaintext',
      }),

    technical: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Technical Discussion',
        content:
          'Technical deep-dive with their IT team. Discussed security requirements, API limitations, and integration possibilities. All technical concerns addressed.',
        format: 'plaintext',
      }),

    champion: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Champion Identified',
        content:
          'This person has become a strong internal champion for our solution. They are advocating for purchase and helping navigate their internal approval process.',
        format: 'plaintext',
      }),

    training: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Training Session',
        content:
          'Provided comprehensive training on platform features. User is quick to learn and already implementing advanced workflows. Excellent candidate for power user.',
        format: 'plaintext',
      }),

    feedback: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E User Feedback',
        content:
          'Regular check-in call. User loves the new dashboard features and has seen 30% improvement in productivity. Suggested additional automation features.',
        format: 'plaintext',
      }),

    escalation: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Issue Escalation',
        content:
          'User escalated data sync issue. Problem resolved within 2 hours. Provided additional monitoring to prevent future occurrences.',
        format: 'plaintext',
      }),

    referral: (personId: string): E2ETestNote =>
      E2ENoteFactory.create('people', personId, {
        title: 'E2E Referral Opportunity',
        content:
          'User mentioned colleague at another company who might benefit from our solution. Agreed to make introduction. Strong referral potential.',
        format: 'plaintext',
      }),
  },

  /**
   * Markdown formatted notes
   */
  markdown: {
    meetingAgenda: (
      recordId: string,
      parentObject: string = 'companies'
    ): E2ETestNote =>
      E2ENoteFactory.createMarkdown(parentObject, recordId, {
        title: 'E2E Meeting Agenda',
        content: `# E2E Client Meeting Agenda

## Attendees
- John Smith (CEO)
- Sarah Johnson (CTO)
- Mike Wilson (Sales Rep)

## Topics
1. **Current Challenges**
   - Data integration issues
   - Manual reporting processes
   - Scalability concerns

2. **Solution Overview**
   - Platform capabilities
   - Integration options
   - Pricing structure

3. **Next Steps**
   - Technical demo scheduling
   - Proposal timeline
   - Decision criteria

## Action Items
- [ ] Send technical specifications
- [ ] Schedule demo for next week
- [ ] Prepare custom proposal`,
      }),

    projectStatus: (
      recordId: string,
      parentObject: string = 'companies'
    ): E2ETestNote =>
      E2ENoteFactory.createMarkdown(parentObject, recordId, {
        title: 'E2E Project Status Update',
        content: `# E2E Implementation Project Status

## Progress Overview
**Overall Progress:** 75% Complete

### Phase 1: Planning ✅
- Requirements gathering complete
- Technical architecture approved
- Timeline established

### Phase 2: Development 🚧
- Core features implemented
- API integrations in progress
- Testing framework setup

### Phase 3: Testing ⏳
- Unit tests: 85% complete
- Integration tests: 40% complete
- User acceptance testing: scheduled

## Risks & Issues
| Risk | Impact | Mitigation |
|------|--------|------------|
| API Rate Limits | Medium | Implement caching layer |
| Resource Availability | Low | Cross-train team members |

## Next Milestones
- **Week 1:** Complete API integration
- **Week 2:** Begin UAT
- **Week 3:** Production deployment`,
      }),

    technicalSpecs: (
      recordId: string,
      parentObject: string = 'companies'
    ): E2ETestNote =>
      E2ENoteFactory.createMarkdown(parentObject, recordId, {
        title: 'E2E Technical Specifications',
        content: `# E2E Technical Integration Specifications

## System Requirements
### Infrastructure
- **Cloud Provider:** AWS
- **Database:** PostgreSQL 14+
- **Runtime:** Node.js 18+
- **Container:** Docker

### Security Requirements
- OAuth 2.0 authentication
- TLS 1.3 encryption
- Role-based access control
- SOC 2 compliance

## API Endpoints

### Data Sync
\`\`\`
POST /api/v1/sync/companies
GET /api/v1/sync/status
\`\`\`

### Webhooks
\`\`\`
POST /webhooks/data-updated
POST /webhooks/user-action
\`\`\`

## Integration Flow
1. Initial data import
2. Real-time sync setup
3. Webhook configuration
4. User training
5. Go-live validation

## Performance Expectations
- **Latency:** < 200ms API response time
- **Throughput:** 1000 requests/second
- **Availability:** 99.9% uptime SLA`,
      }),
  },
};

/**
 * Note scenarios for complex testing
 */
export const noteScenarios = {
  /**
   * Create a complete sales process with notes
   */
  salesProcess: (companyId: string, contactPersonId: string) => ({
    // Company notes
    initialMeeting: noteFixtures.companies.meeting(companyId),
    followUpCall: noteFixtures.companies.followUp(companyId),
    productDemo: noteFixtures.companies.demo(companyId),
    contractNegotiation: noteFixtures.companies.contract(companyId),

    // Contact person notes
    introduction: noteFixtures.people.introduction(contactPersonId),
    discoveryCall: noteFixtures.people.discovery(contactPersonId),
    technicalDiscussion: noteFixtures.people.technical(contactPersonId),
    championIdentified: noteFixtures.people.champion(contactPersonId),
  }),

  /**
   * Create customer success journey notes
   */
  customerSuccess: (companyId: string, userId: string) => ({
    // Onboarding
    onboardingSession: noteFixtures.companies.onboarding(companyId),
    userTraining: noteFixtures.people.training(userId),

    // Ongoing relationship
    quarterlyReview: noteFixtures.companies.quarterly(companyId),
    userFeedback: noteFixtures.people.feedback(userId),

    // Issue resolution
    supportIssue: noteFixtures.companies.support(companyId),
    issueEscalation: noteFixtures.people.escalation(userId),

    // Growth
    renewalDiscussion: noteFixtures.companies.renewal(companyId),
    referralOpportunity: noteFixtures.people.referral(userId),
  }),

  /**
   * Create project management notes
   */
  projectManagement: (companyId: string) => ({
    meetingAgenda: noteFixtures.markdown.meetingAgenda(companyId),
    statusUpdate: noteFixtures.markdown.projectStatus(companyId),
    technicalSpecs: noteFixtures.markdown.technicalSpecs(companyId),

    // Additional project notes
    kickoffMeeting: E2ENoteFactory.create('companies', companyId, {
      title: 'E2E Project Kickoff',
      content:
        'Project kickoff meeting completed. All stakeholders aligned on timeline, deliverables, and success criteria. Project officially launched.',
      format: 'plaintext',
    }),

    riskAssessment: E2ENoteFactory.createMarkdown('companies', companyId, {
      title: 'E2E Risk Assessment',
      content: `# Project Risk Assessment

## High Risk Items
- **Data Migration Complexity**
  - Impact: Project timeline
  - Mitigation: Extended testing phase

## Medium Risk Items  
- **Third-party API Changes**
  - Impact: Integration functionality
  - Mitigation: Version pinning and monitoring

## Low Risk Items
- **Staff Availability**
  - Impact: Minor delays
  - Mitigation: Resource cross-training`,
    }),
  }),

  /**
   * Create support ticket notes
   */
  supportTicket: (companyId: string, userId: string) => ({
    issueReport: E2ENoteFactory.create('people', userId, {
      title: 'E2E Support Ticket #12345',
      content:
        'User reported data sync issues with CRM integration. Error occurs during peak hours. Investigating potential rate limiting or timeout issues.',
      format: 'plaintext',
    }),

    investigation: E2ENoteFactory.create('companies', companyId, {
      title: 'E2E Issue Investigation',
      content:
        'Root cause identified: API rate limiting during high-traffic periods. Implementing exponential backoff and request queuing to resolve.',
      format: 'plaintext',
    }),

    resolution: E2ENoteFactory.create('people', userId, {
      title: 'E2E Issue Resolution',
      content:
        'Fix deployed and tested. Data sync now stable during peak hours. Customer confirmed issue resolved. Added monitoring alerts.',
      format: 'plaintext',
    }),

    followUp: E2ENoteFactory.create('companies', companyId, {
      title: 'E2E Resolution Follow-up',
      content:
        'One week follow-up: No recurrence of sync issues. Customer satisfaction confirmed. Added to knowledge base for future reference.',
      format: 'plaintext',
    }),
  }),
};

/**
 * Edge case notes for testing boundaries
 */
export const edgeCaseNotes = {
  /**
   * Minimal valid note
   */
  minimal: (
    recordId: string,
    parentObject: string = 'companies'
  ): E2ETestNote => ({
    title: 'E2E Minimal Note',
    content: 'Minimal content.',
    format: 'plaintext',
    parent_object: parentObject,
    parent_record_id: recordId,
  }),

  /**
   * Note with special characters
   */
  specialCharacters: (
    recordId: string,
    parentObject: string = 'companies'
  ): E2ETestNote =>
    E2ENoteFactory.create(parentObject, recordId, {
      title: 'E2E Special™ & Co. "Note" #1',
      content:
        'Note with special characters: áéíóú ñ çß àèìòù âêîôû\n\nAnd symbols: @#$%^&*()_+-=[]{}|;:,.<>?',
    }),

  /**
   * Note with very long content
   */
  longContent: (
    recordId: string,
    parentObject: string = 'companies'
  ): E2ETestNote =>
    E2ENoteFactory.create(parentObject, recordId, {
      title:
        'E2E Very Long Note That Exceeds Normal Length Expectations For Testing Purposes',
      content: `This is a very long note that contains multiple paragraphs and goes on for quite some time to test how the system handles lengthy text content. 

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

This content continues for testing purposes to ensure that the system can handle and properly store, retrieve, and display longer text content without issues or truncation. The note system should be able to handle substantial amounts of text while maintaining performance and usability.`,
    }),

  /**
   * Note with Unicode and emoji
   */
  unicode: (
    recordId: string,
    parentObject: string = 'companies'
  ): E2ETestNote =>
    E2ENoteFactory.create(parentObject, recordId, {
      title: 'E2E 📝 Unicode Note 测试 笔记 ✨',
      content:
        'Note with Unicode characters: 中文 العربية русский 日本語 한국어 🌍\n\nEmojis: 🚀 💼 📊 ✅ ❌ ⚠️ 🔥 💡',
    }),

  /**
   * HTML formatted note
   */
  htmlContent: (
    recordId: string,
    parentObject: string = 'companies'
  ): E2ETestNote =>
    E2ENoteFactory.create(parentObject, recordId, {
      title: 'E2E HTML Formatted Note',
      content:
        '<h2>HTML Content Test</h2>\n<p>This note contains <strong>HTML formatting</strong> to test how the system handles <em>rich text</em> content.</p>\n<ul>\n<li>List item 1</li>\n<li>List item 2</li>\n</ul>\n<p><a href="https://example.com">Link example</a></p>',
      format: 'html',
    }),

  /**
   * Note with empty content edge case
   */
  emptyContent: (
    recordId: string,
    parentObject: string = 'companies'
  ): E2ETestNote => ({
    title: 'E2E Empty Content Note',
    content: '',
    format: 'plaintext',
    parent_object: parentObject,
    parent_record_id: recordId,
  }),
};

/**
 * Performance testing notes
 */
export const performanceNotes = {
  /**
   * Generate many notes for batch testing
   */
  generateBatch: (
    recordId: string,
    parentObject: string,
    count: number = 50
  ): E2ETestNote[] => {
    return E2ENoteFactory.createMany(parentObject, recordId, count, {
      content:
        'Batch testing note for performance evaluation. This note is part of a large set of notes created to test system performance under load.',
    });
  },

  /**
   * Generate notes with similar titles for search testing
   */
  generateSimilarTitles: (
    recordId: string,
    parentObject: string,
    baseNumber: number = 20
  ): E2ETestNote[] => {
    return Array.from({ length: baseNumber }, (_, i) =>
      E2ENoteFactory.create(parentObject, recordId, {
        title: `E2E Similar Note ${String(i + 1).padStart(3, '0')}`,
        content: `Search testing note number ${i + 1} with similar title structure for search functionality testing.`,
      })
    );
  },

  /**
   * Generate notes with different formats for format testing
   */
  generateByFormat: (
    recordId: string,
    parentObject: string,
    format: 'plaintext' | 'html' | 'markdown',
    count: number = 10
  ): E2ETestNote[] => {
    const contentByFormat = {
      plaintext: 'Plain text content for format testing.',
      html: '<p><strong>HTML</strong> content for <em>format</em> testing.</p>',
      markdown:
        '# Markdown Content\n\n**Bold** and *italic* text for format testing.\n\n- List item\n- Another item',
    };

    return E2ENoteFactory.createMany(parentObject, recordId, count, {
      format,
      content: contentByFormat[format],
      title: `E2E ${format.toUpperCase()} Format Note`,
    });
  },
};

/**
 * Export all fixtures
 */
export default {
  fixtures: noteFixtures,
  scenarios: noteScenarios,
  edgeCases: edgeCaseNotes,
  performance: performanceNotes,
};
