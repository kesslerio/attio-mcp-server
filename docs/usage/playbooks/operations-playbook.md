# Operations Playbook: Data Management & Process Automation

*Master your CRM data quality and automate operational workflows through systematic record management and maintenance.*

> Important: Data Requirements
> - Ops prompts assume your workspace has a breadth of records: companies, people, tasks, lists, and notes with recent updates.
> - Data quality prompts depend on specific fields (industry, website, phone, job title) being present to check for completeness/consistency.
> - List and task prompts require active list memberships and assigned tasks to produce meaningful results.
>
> Tip: To validate quickly, create one “Demo Ops Co” with website/industry fields, one contact with email/title, two tasks (one overdue), and add the company to a test list.

## 🎯 Quick Start: Your First Data Review

**Copy this exact prompt to test your setup:**

```
Show me all companies in my CRM that are missing website URLs. For each company, provide the company name, industry (if available), and any contact information we have. Help me prioritize which ones to research and update first.
```

*Expected result: A list of companies with incomplete data that can be systematically updated.*

---

## 🧹 Daily Data Maintenance Routines

### Morning Data Quality Check (15 minutes)

**📊 Record Status Review**
```
Show me all records created or updated in the last 24 hours:
- New companies added yesterday
- Recently updated contact information
- New tasks created but not yet assigned
- People records without proper company associations

Highlight any obvious data entry issues or missing critical information.
```

**🚨 Critical Missing Information Alert**
```
Find records missing essential business information:
- Companies without industry classification
- People without email addresses who have phone numbers
- Active tasks without due dates or assignees
- Companies with websites but no contact information

Create a prioritized list for manual data entry and research.

Note: This check relies on fields like industry, email, and due_date being used consistently across records.
```

**🔄 Data Consistency Verification**
```
Check for data consistency issues in recent records:
- Companies with inconsistent naming (variations, abbreviations)
- People associated with multiple company variations
- Duplicate contact information across different records
- Tasks referencing records that may have been merged or deleted

Flag potential duplicates and inconsistencies for review.

Note: Consistency checks work best when naming conventions are partially established (e.g., industry, location, title formatting).
```

### Data Enhancement & Maintenance

**🌟 Data Enrichment Opportunities**
```
Identify records ready for manual data enrichment:
- Companies with domains but missing social media profiles
- People with LinkedIn URLs but incomplete job titles
- Companies missing employee count or industry data
- Contacts without phone numbers where publicly searchable

Create research task list with publicly available information sources.

Note: Enrichment prompts expect domains, social URLs, or partial profiles to exist to suggest next best data.
```

**🔍 Relationship Mapping**
```
Find connection opportunities in existing data:
- People working at companies we have partial contact with
- Email domains that suggest additional company relationships  
- Phone number area codes indicating geographic clustering
- Job titles that suggest org chart relationships

Suggest relationship mapping and data structure improvements.
```

---

## 📋 Weekly Bulk Operations

### Mass Data Updates & Corrections

**🏢 Company Data Standardization**
```
Review and standardize company information:
- Find variations of company names (e.g., "Tech Inc", "Tech Incorporated", "Tech, Inc.")
- Identify industry naming inconsistencies (e.g., "Software", "Technology", "SaaS")
- Review company size categories and location formatting
- Check website URL formatting and accessibility

Create standardization plan with specific record updates needed.
```

**👥 Contact Information Cleanup**
```
Systematic contact record maintenance:
- Find people with similar names who might be duplicates
- Identify outdated email addresses (bounced, auto-responses)
- Review job title formatting and standardization opportunities
- Check for people who may have changed companies

Create merge/update plan prioritized by contact importance and recent activity.
```

**📊 Task and List Management**
```
Maintain task and list organization:
- Review overdue tasks and reassign or close as appropriate
- Update task descriptions for clarity and actionability
- Clean up completed tasks that are no longer relevant
- Review list memberships and remove outdated entries

Focus on active workflows and current business priorities.
```

### List Management & Organization

**📋 Strategic List Creation & Maintenance**
```
Create and maintain organized prospect and customer lists:
- High-priority accounts (based on company size, industry, recent activity)
- Geographic territories for sales coverage
- Industry segments for targeted outreach
- Contact types (decision makers, influencers, users)

Set up clear list criteria and membership rules for ongoing maintenance.

Note: If you don’t use lists, these prompts will return empty; create a test list and add a few records to explore.
```

**🎯 List Optimization**
```
Optimize existing lists for usability:
- Remove inactive or irrelevant entries
- Add newly qualified prospects based on established criteria
- Update list descriptions and purposes
- Cross-reference lists to prevent overlap and confusion

Create systematic list review schedule for ongoing maintenance.
```

---

## 🔄 Monthly System Maintenance

### Data Integrity & Quality

**🔍 Data Integrity Review**
```
Systematic review of data relationships and quality:
- Companies with contacts but no recent activity
- People records missing company associations
- Tasks referencing non-existent or merged records
- Lists with outdated or irrelevant memberships

Create data integrity improvement plan with specific cleanup tasks.

Note: Integrity checks rely on relationships between companies/people/tasks and list memberships; ensure links exist.
```

**🗂️ Record Organization**
```
Review and improve record organization:
- Identify records that should be archived or deleted
- Update custom field usage and consistency
- Review tag usage and standardization
- Clean up old or obsolete data that's no longer relevant

Focus on maintaining clean, current data for active business operations.
```

### Process Documentation & Improvement

**📚 Data Entry Standards Review**
```
Review and update data entry procedures:
- Field completion requirements and standards
- Naming conventions and formatting rules
- Duplicate prevention processes
- Quality assurance checklists

Ensure procedures reflect current business needs and system capabilities.

Note: This section is a planning checklist; pair it with small pilot cleanups to generate measurable impact.
```

---

## 🔧 Integration Management & Automation

### Data Import & Export Management

**📥 Import Quality Review**
```
For data imports, verify and clean:
- Field mapping accuracy and completion
- Data format consistency (dates, phone numbers, URLs)
- Duplicate prevention during import process
- Required field completion rates

Create post-import cleanup checklist and validation procedures.
```

**📤 Export and Backup Procedures**
```
Maintain data export and backup processes:
- Regular export schedules for critical data
- Data format standardization for exports
- Backup verification and restoration procedures
- Integration data synchronization status

Document procedures for data portability and business continuity.
```

### System Integration Coordination

**🔗 Integration Data Consistency**
```
Monitor data consistency across integrated systems:
- Contact synchronization between platforms
- Custom field mapping accuracy
- Data update timing and sequence
- Conflict resolution procedures

Maintain integration health through systematic data verification.
```

---

## 🚨 Issue Resolution & Recovery

### Data Quality Issues

**🔧 Common Data Problems**

**Problem**: Duplicate records with slightly different information

**Resolution Approach**:
```
1. Search for potential duplicates:
   "Find companies with similar names or matching domains/phone numbers"

2. Compare record completeness:
   "For each duplicate pair, show which record has more complete information and recent activity"

3. Create merge plan:
   "Prioritize merges based on business impact - focus on active accounts and prospects first"
```

**Problem**: Inconsistent data entry causing search and filtering issues

**Resolution Approach**:
```
1. Identify inconsistency patterns:
   "Show me variations in how we record industry, company size, and location information"

2. Create standardization rules:
   "Develop consistent formats for common data fields based on most frequent usage"

3. Implement systematic updates:
   "Create update task list prioritized by data usage frequency and business impact"
```

---

## 💡 Pro Tips for Operations Excellence

### 1. **Focus on Data Usability, Not Perfection**
Instead of: Trying to complete every field for every record  
Try: "Prioritize completing the most business-critical fields for active accounts and prospects"

### 2. **Systematic Approach Beats Ad-Hoc Fixes**
Instead of: Fixing data issues as you encounter them  
Try: "Set aside dedicated time weekly for systematic data review and cleanup"

### 3. **Document Your Decisions**
Instead of: Making arbitrary choices about data standardization  
Try: "Create clear rules and document them so the team maintains consistency"

### 4. **Measure Impact Through Usage**
Add to queries: "Focus data quality efforts on the records and fields that are actually used for business decisions"

### 5. **Automate the Repetitive**
Instead of: Manual data entry for routine information  
Try: "Create templates and standard procedures for common data entry tasks"

---

## 🎯 Next Steps

1. **Start Small**: Begin with one data quality issue and create a systematic approach
2. **Create Routines**: Establish weekly review schedules for different data types  
3. **Document Standards**: Write clear data entry and maintenance procedures
4. **Train Users**: Share best practices with all CRM users
5. **Track Progress**: Monitor data quality improvements through regular reviews

**Remember**: Great operations create the foundation for effective sales and customer success. Clean, organized data enables better decision-making and more efficient workflows across your entire organization.

---

*🔗 Need sales support? Check the [Sales Playbook](sales-playbook.md). Working on customer health? See the [Customer Success Playbook](customer-success-playbook.md).*
