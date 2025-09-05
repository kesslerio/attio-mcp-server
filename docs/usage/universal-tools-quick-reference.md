# Universal Tools Quick Reference: Copy-Paste Prompts

*Validated prompts that work perfectly with the Attio MCP Server's universal tools architecture. Every prompt tested for compatibility with the current 14-tool system.*

## 🎯 Tool Architecture Overview

The Attio MCP Server uses **14 universal tools** (68% reduction from 40+ tools) that handle all CRM operations through `resource_type` parameters:

| **Universal Tool** | **Purpose** | **Resource Types** |
|---|---|---|
| `search-records` | Basic search with filters | companies, people, tasks, deals |
| `advanced-search` | Multi-condition complex queries | companies, people, tasks, deals |
| `get-record-details` | Complete record information | companies, people, tasks, deals |
| `create-record` | Create new records | companies, people, tasks, deals |
| `update-record` | Modify existing records | companies, people, tasks, deals |
| `delete-record` | Remove records | companies, people, tasks, deals |
| `get-attributes` | Available fields for resource type | companies, people, tasks, deals |
| `discover-attributes` | Dynamic field discovery | companies, people, tasks, deals |
| `get-detailed-info` | Structured info by type | companies, people |
| `search-by-relationship` | Find connected records | companies ↔ people |
| `search-by-content` | Text-based matching | notes, activities, content |
| `search-by-timeframe` | Date-based filtering | created, modified, last_interaction |
| `batch-operations` | Bulk processing | create, update, delete, search |
| `batch-search` | Multi-criteria batch search | All resource types |

**Plus 11 Lists Tools**: Complete pipeline and list management functionality

---

## 🚀 Validated Copy-Paste Prompts

### 🔍 Basic Search Operations

#### **Find Companies (Universal)**
```
Use search-records with resource_type="companies" to find:
- Technology companies with 50+ employees
- Show: name, industry, employee_count, website
- Limit to 15 results for optimal performance
```

#### **Advanced Company Search**
```
Use advanced-search for companies where:
- Industry contains "Technology" OR "Software"
- Employee count greater than 100
- Created in last 60 days
- Resource type: companies
Format as table with company name, size, industry, date added
```

#### **Find People by Role**
```
Search for people using advanced-search:
- Resource type: people
- Job title contains "CEO" OR "Founder" OR "VP"  
- Company size over 50 employees
- Show: name, title, company, email
Limit to 20 results to avoid truncation
```

### 📊 Pipeline Management

#### **Sales Pipeline Overview**
```
Get my sales pipeline status using these steps:
1. Use get-lists to see all available pipelines
2. For each pipeline, use get-list-entries to show current deals
3. Use advanced-filter-list-entries for deals over $5,000
4. Group by stage and calculate totals
Limit each stage to top 10 deals by value
```

#### **Move Deal Through Pipeline**
```
Update pipeline position:
1. Find the deal using search-records with resource_type="deals"
2. Use update-list-entry to change stage from "Qualified" to "Proposal"
3. Use add-record-to-list if moving between different pipelines
4. Confirm the update with get-list-entries
Include deal value and expected close date in the update
```

### ✅ Task Management (Addresses Issue #472)

#### **Create Tasks (Avoiding "Unnamed" Issue)**
```
Create follow-up tasks using create-record:
- Resource type: tasks
- Content: "Follow up on demo with [Company Name] - discuss pricing"
- Title: "Demo Follow-up: [Company Name]"
- Due date: [specific date]
- Assigned to: [team member]

IMPORTANT: Always include both 'content' and 'title' fields to avoid "Unnamed" display
```

#### **Review Tasks (Workaround for Issue #472)**
```
Get task overview using these methods:
1. Use search-by-timeframe for tasks created in last 7 days
2. Use get-record-details for each task to get complete info
3. Show: content, title, due_date, assignee, linked_company

Avoid generic "show all tasks" - use specific timeframes or filters
```

### 🔗 Relationship Discovery

#### **Find Company Connections**
```
Discover relationships using search-by-relationship:
1. Start with target company ID
2. Use relationship_type="company_to_people" to find all contacts
3. Use search-by-relationship with "people_to_company" for reverse lookup
4. Show: person name, role, contact info, relationship strength
Limit to 15 connections per company
```

#### **Account Mapping**
```
Build complete account map:
1. Use get-record-details for the target company
2. Use search-by-relationship to find all connected people
3. Use search-by-content to find related notes and activities
4. Use get-record-list-memberships to see which lists/pipelines they're in
Present as organizational chart with contact details
```

### 📈 Analytics & Reporting

#### **Revenue Forecast (Optimized for Issue #469)**
```
Generate revenue forecast in batches:
1. Use search-by-timeframe for current quarter deals
2. Filter by stages: "Proposal", "Negotiation", "Closing"
3. Process in batches of 20 deals to avoid JSON truncation
4. Calculate totals by month and probability
5. Show top 10 deals by value, then ask for next batch
```

#### **Performance Dashboard**
```
Create performance summary using:
1. search-by-timeframe for deals closed this month
2. batch-search for multiple metrics in one query
3. Use get-attributes to identify available performance fields
4. Limit each metric to key numbers only
Format: Won deals: X, Revenue: $Y, Pipeline: $Z, Activities: N
```

### 🧹 Data Management

#### **Find Incomplete Records**
```
Identify data gaps using advanced-search:
1. Resource type: companies
2. Filter where industry IS_EMPTY OR website IS_EMPTY
3. Employee count less than 1 OR greater than 1000000 (outliers)
4. Show: name, missing fields, last updated date
Prioritize by deal value or engagement score
```

#### **Duplicate Detection**
```
Find potential duplicates:
1. Use search-records to get all companies
2. Use search-by-content for similar names/domains
3. Group by website domain for exact matches
4. Flag similar company names for manual review
Process in batches of 25 companies to manage response size
```

### 🎯 Batch Operations

#### **Bulk Data Import**
```
Import multiple records using batch-operations:
1. Operation type: "create"
2. Resource type: "companies" 
3. Include all required fields: name, industry, website
4. Process in batches of 10 records for reliability
5. Use batch-search to verify successful creation
Check each batch completion before proceeding
```

#### **Mass Updates**
```
Update multiple records efficiently:
1. Use search-records to find target records
2. Use batch-operations with operation_type="update"
3. Specify resource_type and update fields
4. Limit to 15 records per batch for optimal performance
5. Verify updates with get-record-details for sample records
```

---

## 🚨 Known Issues & Workarounds

### Issue #472: Tasks Showing "Unnamed"

**❌ Avoid These Patterns:**
```
"Show me all my tasks"
"List all tasks in the system"
"Get all task data"
```

**✅ Use These Instead:**
```
"Use search-by-timeframe to find tasks created in last 7 days with content and title fields"
"Get task details for overdue tasks, showing complete information"
"Search for tasks linked to [Company Name] with full task data"
```

**When Creating Tasks:**
```
Always include both fields:
- Content: "Detailed task description with context"
- Title: "Short task name for lists"
```

### Issue #469: JSON Response Truncation

**❌ Avoid Large Requests:**
```
"Export all companies with complete details"
"Show me everything about all deals"
"Get comprehensive data export"
```

**✅ Use Pagination:**
```
"Show me companies 1-20 with key fields only"
"Get the first 15 deals, then I'll ask for more"
"Limit to essential fields: name, industry, value"
```

**Optimize Field Selection:**
```
Instead of: "Show complete company profiles"
Use: "Show company name, industry, employee count, website only"
```

---

## 🛠️ Troubleshooting Universal Tools

### When Tools Don't Work

**1. Check Resource Type**
```
❌ "Find some companies"
✅ "Use search-records with resource_type='companies' to find technology firms"
```

**2. Verify Available Fields**
```
Before complex queries, first use:
"Use get-attributes with resource_type='companies' to see available fields"
```

**3. Build Incrementally**
```
Step 1: "Use search-records to find basic company data"
Step 2: "From those results, filter for companies over 100 employees"  
Step 3: "Add industry filter for technology companies"
```

### Performance Optimization

**Limit Results:**
```
Add to every query: "Limit to 15 results" or "Show first 20 records"
```

**Use Specific Filters:**
```
❌ "Find companies"
✅ "Find companies where industry='Technology' and employee_count>50"
```

**Batch Processing:**
```
"Process companies in groups of 10, starting with the first 10"
```

---

## 📚 Quick Syntax Reference

### Universal Tool Parameters

```json
{
  "resource_type": "companies|people|tasks|deals",
  "filters": {
    "filters": [
      {
        "attribute": {"slug": "field_name"},
        "condition": "equals|contains|greater_than|less_than|is_empty|is_not_empty",
        "value": "search_value"
      }
    ]
  },
  "limit": 20
}
```

### Common Conditions

| **Condition** | **Use Case** | **Example** |
|---|---|---|
| `equals` | Exact matches | Industry equals "Technology" |
| `contains` | Partial text | Name contains "Corp" |
| `greater_than` | Numeric/date | Employee count > 50 |
| `less_than` | Numeric/date | Deal value < 10000 |
| `is_empty` | Missing data | Website is empty |
| `is_not_empty` | Has data | Email address exists |
| `starts_with` | Name prefixes | Company name starts with "A" |
| `ends_with` | Domain suffixes | Email ends with ".com" |

### Resource Type Options

- **companies**: Organizations and businesses
- **people**: Contacts and individuals  
- **tasks**: To-dos and follow-up actions
- **deals**: Opportunities and sales pipeline items
- **lists**: Custom groupings and pipelines

---

## 🎯 Success Validation

**✅ Your prompts are working correctly when:**
- Results appear within 5 seconds
- No "Unnamed" items in task lists
- Response data isn't truncated with "..."
- All requested fields are populated
- Filtering returns expected record counts

**🏆 You're a universal tools expert when you can:**
- Build complex queries using multiple universal tools
- Troubleshoot prompt issues by adjusting resource_type or conditions
- Optimize large dataset queries with pagination
- Create reliable batch operations for bulk data management

---

**🔗 Related Documentation:**
- [Getting Started Guide](getting-started.md) - Initial setup and first queries
- [Troubleshooting Guide](troubleshooting.md) - Detailed problem solving
- [Sales Playbook](playbooks/sales-playbook.md) - Ready-to-use sales prompts
- [Operations Playbook](playbooks/operations-playbook.md) - Data management automation

*All prompts in this guide are tested and validated with the current universal tools architecture (v2.0+).*