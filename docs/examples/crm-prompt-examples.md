# Attio MCP Universal Tools CRM Examples

This document provides examples of natural language prompts that users can use with Claude to leverage the Attio MCP server's **universal tools** in real-world CRM and sales scenarios.

> **🎯 New Universal Tools**: All examples use the modern 13 universal tools system that replaced 40+ individual tools. See [Universal Tools Overview](../universal-tools/README.md) for details.

## 🏢 Company Management Examples

### Finding Target Companies

**Prompt:**
```
Find all technology companies with more than 500 employees in my CRM.
```

**Universal Tools Used:**
- `advanced-search` with `resource_type: "companies"`
- Filters: `industry: "Technology"`, `employees: { "$gte": 500 }`

### Company Research & Analysis

**Prompt:**
```
Show me all SaaS companies we added in the last 30 days, including their business information and social profiles.
```

**Universal Tools Used:**
- `search-by-timeframe` with `resource_type: "companies"`
- Date field: `created_at`, relative range: `last_30_days`
- `search-records` with query: "SaaS" 
- `get-detailed-info` with `info_type: "business"` and `info_type: "social"`

### Bulk Company Updates

**Prompt:**
```
Update the industry field to "Financial Technology" for all companies whose names contain "fintech" or "financial".
```

**Universal Tools Used:**
- `search-records` with `resource_type: "companies"`, query: "fintech"
- `batch-operations` with `operation_type: "update"`
- Multiple company updates in a single operation

## 👥 People Management Examples

### Finding Decision Makers

**Prompt:**
```
Find all VP and C-level executives at our enterprise accounts.
```

**Universal Tools Used:**
- `advanced-search` with `resource_type: "people"`
- Filters: `job_title: { "$contains": ["VP", "Chief", "CTO", "CEO", "COO"] }`
- `search-by-relationship` to connect with company size data

### Contact Outreach Planning

**Prompt:**
```
Show me all marketing contacts at companies with 100+ employees who we haven't contacted in 60 days.
```

**Universal Tools Used:**
- `advanced-search` with `resource_type: "people"`
- Filters: `job_title: { "$contains": "marketing" }`
- `search-by-relationship` with company employee filter
- `search-by-timeframe` to exclude recent contacts

### Contact Network Analysis

**Prompt:**
```
Find all people who work at companies in our "Enterprise Accounts" list and show me their contact information.
```

**Universal Tools Used:**
- `search-by-relationship` with `resource_type: "people"`
- Related resource type: "companies" with list membership filter
- `get-detailed-info` with `info_type: "contact"`

## 📋 Pipeline & List Management Examples

### Sales Pipeline Analysis

**Prompt:**
```
Show me all companies in our "Demo Scheduled" list that haven't had activity in the last 2 weeks.
```

**Universal Tools Used:**
- `search-records` with `resource_type: "companies"` and list filter
- `search-by-timeframe` with negative filter (no activity in timeframe)
- Cross-reference results for companies lacking recent activity

### Account Prioritization

**Prompt:**
```
Help me prioritize accounts. Find companies in both our "Financial Services" and "Enterprise Tier" lists, show their primary contacts and recent notes.
```

**Universal Tools Used:**
- `advanced-search` with `resource_type: "companies"`
- List membership filters (multiple lists with AND logic)
- `search-by-relationship` to find primary contacts
- `search-by-content` to retrieve recent notes

### Cross-List Analysis

**Prompt:**
```
Find all people who are in our "VIP Contacts" list but whose companies are not in any sales pipeline list.
```

**Universal Tools Used:**
- `search-records` with `resource_type: "people"` and list membership
- `search-by-relationship` to check company list memberships
- Advanced filtering to identify gaps in pipeline coverage

## 🔍 Advanced Search & Analysis Examples

### Multi-Criteria Account Targeting

**Prompt:**
```
I want to create a targeted outreach campaign. Find all financial services companies with more than 1000 employees, where we have Director+ level contacts, but no activity in 60 days.
```

**Universal Tools Used:**
- `advanced-search` with `resource_type: "companies"`
- Complex filters:
  ```typescript
  {
    "industry": "Financial Services",
    "employees": { "$gte": 1000 }
  }
  ```
- `search-by-relationship` to find Director+ contacts
- `search-by-timeframe` to exclude companies with recent activity

### Revenue Opportunity Analysis

**Prompt:**
```
Find all enterprise accounts (>$100K revenue) where we've mentioned "renewal" or "expansion" in notes within the last quarter, prioritized by company size.
```

**Universal Tools Used:**
- `advanced-search` with `resource_type: "companies"`
- Revenue filter: `{ "revenue": { "$gte": 100000 } }`
- `search-by-content` with content query: "renewal OR expansion"
- Date range: last quarter
- Sort by company size (employees or revenue)

### Customer Success Analysis

**Prompt:**
```
Identify at-risk accounts: Find all customers with contracts ending in next 90 days who have had support tickets mentioning "issues" or "problems" in the last 30 days.
```

**Universal Tools Used:**
- `search-by-timeframe` with `resource_type: "companies"`
- Date field: contract expiration, range: next 90 days
- `search-by-content` to find support tickets with negative sentiment
- Combine results to identify at-risk customers

## 🔄 Relationship-Based Examples

### Account Expansion Strategy

**Prompt:**
```
I'm planning account expansion. Find existing customers (1+ year relationship) with recent product engagement who we've identified expansion opportunities for in our notes.
```

**Universal Tools Used:**
- `search-by-timeframe` with `resource_type: "companies"`
- Customer relationship duration filter
- `search-by-content` to find notes mentioning expansion/upsell
- Activity correlation analysis

### Competitive Intelligence

**Prompt:**
```
Find all prospects where we've mentioned competitors in our notes, and show me which competitors come up most frequently.
```

**Universal Tools Used:**
- `search-by-content` with `resource_type: "companies"`
- Content types: ["notes"]
- Query patterns for competitor names
- Aggregation and analysis of competitor mentions

### Network Effect Analysis

**Prompt:**
```
Show me all people who have changed companies in the last 6 months and now work at target accounts in our "Prospect" list.
```

**Universal Tools Used:**
- `search-by-timeframe` with `resource_type: "people"`
- Date field: company change or job title update
- `search-by-relationship` to connect with target company lists
- Track professional network movements

## 🚀 Batch Operations Examples

### Data Enrichment Campaign

**Prompt:**
```
For all companies missing industry information, research and update their industry field based on their website URLs.
```

**Universal Tools Used:**
- `search-records` with `resource_type: "companies"`
- Filter for missing industry field
- `batch-operations` with `operation_type: "update"`
- External research integration for industry classification

### List Management Automation

**Prompt:**
```
Move all companies from "Prospect" list to "Qualified Lead" list if they've had email engagement in the last 14 days.
```

**Universal Tools Used:**
- `search-records` to find companies in "Prospect" list
- `search-by-timeframe` for recent email engagement
- `batch-operations` for bulk list membership updates

### Contact Cleanup

**Prompt:**
```
Find and merge duplicate people records - anyone with the same email address or phone number.
```

**Universal Tools Used:**
- `search-records` with `resource_type: "people"`
- Advanced filtering to identify duplicates by email/phone
- `batch-operations` for record deduplication
- Data integrity validation

## 🔗 Integration Examples

### Universal Tools + Clear Thought Analysis

**Prompt:**
```
I need to prepare for next quarter's strategic accounts review. Please analyze our enterprise accounts to identify expansion opportunities using systematic analysis.
```

**Universal Tools + Clear Thought Integration:**
1. **Sequential Thinking**: Break down analysis into logical steps
2. **Advanced Search**: Find enterprise accounts with multiple criteria
3. **Relationship Analysis**: Connect accounts with usage and engagement data
4. **Content Search**: Find notes indicating expansion opportunities
5. **Decision Framework**: Prioritize opportunities systematically

### Universal Tools + External Data Enrichment

**Prompt:**
```
Research all companies in our "Hot Prospects" list - get their latest news, funding information, and key personnel changes to prepare for outreach.
```

**Universal Tools + External Integration:**
1. **Search Records**: Get companies from "Hot Prospects" list
2. **Get Detailed Info**: Extract company URLs and basic information
3. **External Research**: Use web search for recent news and funding
4. **Relationship Search**: Find key contacts and decision makers
5. **Batch Operations**: Update records with enriched information

## 🎯 Best Practices for Universal Tools

### 1. Start with Simple Searches
```
Find all people at technology companies
```
Uses: `search-records` with `resource_type: "people"` + relationship filtering

### 2. Layer in Complexity Gradually
```
Find technology company contacts who are VPs or higher with recent activity
```
Uses: `advanced-search` with multiple filters and relationship connections

### 3. Use Batch Operations for Scale
```
Update all stale contact records to "needs research" status
```
Uses: `batch-operations` for efficient bulk updates

### 4. Combine Multiple Universal Tools
```
Find enterprise prospects, get their detailed information, and create follow-up tasks
```
Uses: `search-records` → `get-detailed-info` → `create-record` (tasks)

## 🔮 Advanced Universal Tools Patterns

### Dynamic Query Building
Claude can build complex universal tool queries based on conversational context:

**Conversation:**
```
User: "Show me companies like Acme Corp"
Claude: First I'll get Acme Corp's details, then search for similar companies
```

**Universal Tools Sequence:**
1. `get-record-details` for Acme Corp
2. Extract industry, size, and other characteristics  
3. `advanced-search` with similar company profile
4. Present results with comparison analysis

### Cross-Resource Workflow Automation
```
User: "Create a complete sales workflow for all healthcare prospects"
```

**Universal Tools Workflow:**
1. `search-records` to find healthcare prospects
2. `get-detailed-info` for contact information
3. `create-record` to generate follow-up tasks
4. `batch-operations` to update prospect status
5. Automated sequence across multiple resource types

---

## 🎉 Getting Started

Ready to try these examples? 

1. **Start Simple**: Begin with `search-records` and `get-record-details`
2. **Add Complexity**: Layer in `advanced-search` and relationship queries  
3. **Scale Up**: Use `batch-operations` for multiple records
4. **Automate**: Combine tools for complete workflows

**Learn More:**
- [Universal Tools Overview](../universal-tools/README.md)
- [Complete API Reference](../universal-tools/api-reference.md)
- [Migration Guide](../universal-tools/migration-guide.md) 
- [Troubleshooting](../universal-tools/troubleshooting.md)

---

*These examples showcase the power and consistency of the universal tools system - one unified approach for all your CRM automation needs.*