# Customer Success Playbook: Proactive Account Management

*Maintain strong customer relationships, track account health, and identify expansion opportunities through systematic CRM data management and outreach coordination.*

> Important: Data Requirements
> - These prompts assume your Attio workspace contains Customer Success data beyond sales (e.g., existing companies, relationships/contacts, and especially notes/tasks that reflect recent interactions).
> - Content-based prompts only work when notes exist with the referenced keywords (e.g., “feedback satisfaction survey”, “success story expansion opportunity growth”).
> - Timeframe prompts require records with created_at/modified_at dates in the requested range.
> - If you only use Attio for sales, many examples will return “0 found” results. That’s expected and not a tool failure.
>
> Tip: Seed a small demo dataset (one company + two notes) before running these prompts to see realistic outputs.

## 🎯 Quick Start: Your First Customer Review

**Copy this exact prompt to test your setup:**

```
Show me all customers (companies with closed deals) and their basic information. Include company name, total deal value, last contact date, and any open tasks or notes from the last 30 days. Help me identify which accounts haven't been contacted recently and might need attention.
```

*Expected result: A customer portfolio overview with recent activity and attention priorities.*

---

## 📋 Daily Customer Management Routines

### Morning Account Review (20 minutes)

**👥 Customer Portfolio Status**
```
Review current customer portfolio:
- List all active customer accounts
- Show recent activity (calls, meetings, emails logged as tasks/notes)
- Identify accounts with no contact in 30+ days
- Review any overdue tasks related to customer accounts

Create daily outreach and follow-up priority list.
```

**🚨 Attention-Needed Alerts**
```
Find accounts requiring immediate attention:
- Customers with support tickets or concerns noted in recent records
- Accounts approaching renewal dates (if tracked in your system)
- New customers in their first 90 days needing check-ins
- High-value accounts with recent deal closures requiring onboarding support

Prioritize by account value and relationship criticality.

Note: This prompt relies on interaction history. If your workspace doesn’t log CS interactions (notes/tasks), you may get no results.
```

**📝 Activity Planning**
```
Plan today's customer success activities:
- Schedule follow-up calls for accounts flagged yesterday
- Create tasks for customer health checks and satisfaction surveys
- Set reminders for important account milestones or commitments
- Plan documentation of customer interactions and outcomes

Focus on proactive outreach and relationship maintenance.
```

### Customer Health Tracking

**❤️ Account Health Assessment**
```
Evaluate customer account health through available data:
- Frequency and recency of interactions
- Response rates and engagement levels
- Deal progression and expansion activity
- Task completion rates and follow-through

Document health status and improvement actions needed.

Note: Health indicators come from the actual data you store (notes, tasks, deal progress). Without this data, the result will be empty or limited.
```

**🔄 Renewal Preparation**
```
Prepare for customer renewals through systematic review:
- Identify accounts with renewal dates in next 90 days
- Review relationship strength and satisfaction indicators
- Document value delivered and ROI achieved
- Prepare renewal discussions and expansion opportunities

Create renewal strategy and timeline for each account.
```

---

## 📊 Weekly Customer Success Operations

### Account Portfolio Management

**🏢 Account Segmentation & Prioritization**
```
Organize customer accounts by strategic importance:
- High-value accounts requiring white-glove service
- Growth accounts with expansion potential
- Stable accounts needing regular check-ins
- At-risk accounts requiring intensive attention

Create appropriate outreach frequency and resource allocation for each segment.
```

**📈 Expansion Opportunity Identification**
```
Identify expansion opportunities through systematic account review:
- Customers with multiple contacts but limited product usage
- Accounts in growing industries or expanding markets
- Companies with budget increases or new initiatives
- Success stories that could lead to additional purchases

Document expansion potential and required next steps.

Note: Expansion opportunities depend on existing notes/tasks and relationships indicating growth signals. Without such data, results will be empty.
```

### Relationship Building & Maintenance

**🤝 Stakeholder Mapping**
```
Map and maintain customer relationships:
- Identify decision makers, influencers, and end users
- Track relationship strength and engagement levels
- Document stakeholder preferences and communication styles
- Maintain up-to-date contact information and role changes

Ensure broad relationship coverage across customer organizations.

Note: This assumes contact/relationship records exist for your customer companies.
```

**💬 Communication Strategy**
```
Develop systematic customer communication:
- Regular check-in schedules based on account tier
- Value-delivery updates and success story sharing
- Educational content and best practice sharing
- Feedback collection and satisfaction monitoring

Create consistent touchpoint calendar for each account segment.
```

### Customer Onboarding & Adoption

**🚀 New Customer Integration**
```
Manage new customer onboarding through structured approach:
- Create 30-60-90 day milestone tracking for new accounts
- Document implementation progress and success metrics
- Identify onboarding blockers and resolution strategies
- Track time-to-value and initial satisfaction indicators

Ensure smooth transition from sales to customer success.

Note: Onboarding timelines require recent “created_at” and “modified_at” data on accounts and related notes/tasks.
```

**📚 Product Adoption Support**
```
Support customer product adoption and value realization:
- Track feature usage and engagement patterns (where data available)
- Identify training opportunities and knowledge gaps
- Document success stories and best practice implementations
- Create resource libraries and educational content

Focus on maximizing customer value and satisfaction.
```

---

## 🔄 Monthly Strategic Customer Management

### Portfolio Performance Review

**📊 Customer Success Metrics**
```
Review customer success performance through available data:
- Account growth and expansion rates
- Customer retention and satisfaction trends
- Response rates and engagement metrics
- Success story documentation and case study development

Create improvement strategies for underperforming areas.

Note: Metrics require historical data. If your workspace isn’t tracking CS KPIs in notes/tasks, expect limited output.
```

**🎯 Account Planning & Strategy**
```
Develop strategic account plans for key customers:
- Annual business review preparation and scheduling
- Success metrics definition and tracking
- Risk assessment and mitigation strategies
- Expansion planning and opportunity development

Align customer success activities with business objectives.
```

### Customer Feedback & Improvement

**💭 Feedback Collection & Analysis**
```
Systematically collect and analyze customer feedback:
- Schedule regular satisfaction surveys and health checks
- Document customer concerns and improvement requests
- Track resolution rates and customer satisfaction trends
- Identify product improvement opportunities and feature requests

Create feedback loops for continuous improvement.

Note: This prompt searches notes for feedback-related content. If no such notes exist, you’ll receive a “Found 0” style message.
```

**🔧 Process Improvement**
```
Continuously improve customer success processes:
- Review customer success workflow efficiency
- Identify bottlenecks in customer issue resolution
- Streamline communication and documentation procedures
- Update customer success playbooks and best practices

Optimize processes for scalability and effectiveness.

Note: Process suggestions rely on the presence of logged CS interactions. Without that data, this remains a planning checklist rather than a data-driven report.

---

## Troubleshooting and Expectations

- “Found 0 records …” messages mean your workspace doesn’t have matching data for that prompt. This is expected in sales-only setups.
- If you see 400 errors on certain searches, they often indicate missing/invalid filters or absent data (e.g., no notes matching the query). Re-run with broader keywords or seed a demo note.
- For best results, ensure:
  - At least one company exists
  - Two notes attached to a company with keywords like “feedback satisfaction survey” and “success story expansion opportunity growth”
  - Recent created_at/modified_at timestamps to exercise timeframe prompts
```

---

## 🎯 Customer Journey Optimization

### Onboarding Excellence

**✅ Onboarding Milestone Tracking**
```
Track and optimize customer onboarding:
- Document key implementation milestones and timelines
- Monitor onboarding completion rates and success indicators
- Identify common onboarding challenges and solutions
- Create standardized onboarding checklists and procedures

Ensure consistent, successful customer onboarding experiences.
```

**📞 Early Success Validation**
```
Validate early customer success through systematic review:
- Schedule 30-day success check-ins with new customers
- Document initial value realization and satisfaction levels
- Identify early warning signs of implementation challenges
- Create intervention strategies for at-risk new customers

Focus on establishing strong foundations for long-term success.
```

### Retention & Growth Strategy

**🔒 Retention Risk Management**
```
Identify and mitigate customer retention risks:
- Monitor customer engagement patterns and communication frequency
- Track resolution times for customer issues and concerns
- Document competitive threats and market changes affecting customers
- Create retention strategies for at-risk accounts

Proactively address retention challenges before they become critical.
```

**📈 Growth Opportunity Development**
```
Systematically develop customer growth opportunities:
- Identify successful customer use cases suitable for expansion
- Document customer business growth and changing needs
- Track expansion conversation outcomes and success rates
- Create growth strategy templates for different customer segments

Focus on mutual value creation and long-term partnership development.
```

---

## 💡 Pro Tips for Customer Success Excellence

### 1. **Relationship-First, Process-Second**
Instead of: Following rigid customer success procedures  
Try: "Adapt your approach to each customer's communication style and business needs"

### 2. **Document Everything Important**
Instead of: Relying on memory for customer interactions  
Try: "Systematically document all customer interactions, decisions, and commitments"

### 3. **Proactive Beats Reactive**
Instead of: Waiting for customers to reach out with problems  
Try: "Schedule regular check-ins and proactively address potential issues"

### 4. **Value Communication is Key**
Focus on: "Regularly communicate the value you're delivering and helping customers achieve"

### 5. **Scale Through Systems**
Instead of: Managing every account identically  
Try: "Create scalable systems that allow personalization at different account tiers"

---

## 🚨 Common Customer Success Challenges

### Communication Gaps

**Problem**: Customer relationships weakening due to infrequent contact

**Resolution Approach**:
```
1. Audit current communication frequency:
   "Review contact history for all accounts to identify communication gaps"

2. Create systematic touchpoint calendar:
   "Establish regular check-in schedules based on account value and needs"

3. Implement accountability measures:
   "Track communication metrics and create accountability for consistent outreach"
```

### Account Growth Stagnation

**Problem**: Customers not expanding or growing their usage

**Resolution Approach**:
```
1. Analyze expansion opportunities:
   "Review successful customers to identify patterns and expansion indicators"

2. Document value delivery:
   "Create clear documentation of value delivered and ROI achieved"

3. Develop growth conversation framework:
   "Create systematic approach to expansion discussions and opportunity development"
```

---

## 🎯 Next Steps

1. **Customer Audit**: Review your current customer portfolio and categorize by health/value
2. **Communication Cadence**: Establish systematic outreach schedules for each customer tier
3. **Documentation Standards**: Create templates for customer interactions and milestone tracking
4. **Process Creation**: Develop repeatable processes for onboarding, retention, and expansion
5. **Success Metrics**: Define measurable indicators of customer success and satisfaction

**Remember**: Customer success is about building strong, profitable relationships through consistent value delivery and proactive account management. Focus on systematic approaches that scale with your growing customer base.

---

*🔗 Need operational support? Check the [Operations Playbook](operations-playbook.md). Looking for sales guidance? See the [Sales Playbook](sales-playbook.md).*
