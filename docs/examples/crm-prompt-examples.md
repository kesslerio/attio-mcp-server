# Attio MCP CRM Prompt Examples

This document provides examples of natural language prompts that users can use with Claude to leverage the Attio MCP server's filtering capabilities in real-world CRM and sales scenarios.

## Relationship-Based Filtering Prompts

### People-Company Relationship Scenarios

#### Finding Decision Makers at Target Companies

**Prompt:**
```
Find all VP and C-level executives at technology companies with more than 500 employees in my CRM.
```

Claude will use:
- `search-companies-by-people` to find companies in the Technology industry with >500 employees
- Filter on job title containing "VP", "Chief", "CTO", "CEO", "COO", etc.

#### Identifying Companies with Multiple Contacts

**Prompt:**
```
Which companies in our CRM do we have at least 3 contacts for? I want to focus on those relationships.
```

Claude will use:
- `search-companies-by-people` with a count aggregation
- Show companies with multiple associated people records

#### Finding People at Recently Added Companies

**Prompt:**
```
Show me all contacts who work at companies that were added to our CRM in the last 30 days.
```

Claude will use:
- `search-companies-by-creation-date` with a date range filter (last 30 days)
- `search-people-by-company` to find people at those companies

### List-Based Relationship Scenarios

#### Targeting People at Companies in Specific Sales Stages

**Prompt:**
```
Show me all contacts at companies in our "Demo Scheduled" list who haven't been contacted in the last 2 weeks.
```

Claude will use:
- `search-people-by-company-list` to find people at companies in the "Demo Scheduled" list
- Activity filtering to identify those without recent interactions

#### Finding Neglected Accounts

**Prompt:**
```
Which companies in our "Enterprise Accounts" list don't have any activity recorded in the last 90 days?
```

Claude will use:
- Relationship filtering to find companies in the specified list
- Activity filtering to identify those without recent interactions

#### Cross-List Analysis

**Prompt:**
```
Find all companies that are in both our "Financial Services" list and our "Enterprise Tier" list, and show me the primary contacts for each.
```

Claude will use:
- List membership filtering to find companies in both lists
- Relationship filtering to identify the primary contacts

### Note-Based Relationship Scenarios

#### Finding Follow-Up Opportunities

**Prompt:**
```
Show me all companies where we've discussed "renewal" or "upsell" in the notes within the last quarter, but haven't had any activity in the last 30 days.
```

Claude will use:
- `search-companies-by-notes` to find companies with notes containing those terms
- Date filtering to focus on recent notes
- Activity filtering to identify those without recent interactions

#### Identifying Customer Pain Points

**Prompt:**
```
Find all contacts where we've documented "pain points" or "challenges" in our notes, and summarize the key issues mentioned for each.
```

Claude will use:
- `search-people-by-notes` to find people with notes containing those terms
- Analyze and summarize the note content

## Advanced Filtering Combinations

### Multi-Criteria Account Targeting

**Prompt:**
```
I want to create a targeted outreach campaign. Find all financial services companies with more than 1000 employees, where we have contacts at the Director level or above, but haven't had any activity in the last 60 days.
```

Claude will use:
- Industry filtering (financial services)
- Employee count filtering (>1000)
- Job title filtering (Director+)
- Activity filtering (no activity in last 60 days)
- Relationship filtering to connect all these criteria

### Opportunity Prioritization

**Prompt:**
```
Help me prioritize my sales pipeline. Show all companies in our "Qualified Opportunity" list where we have notes mentioning "budget" in the last 30 days, and have at least one contact with a title containing "Manager" or higher.
```

Claude will use:
- List membership filtering ("Qualified Opportunity" list)
- Note content filtering (mentions of "budget")
- Date filtering (last 30 days)
- Job title filtering (Manager+)

### Account Expansion Strategy

**Prompt:**
```
I'm planning an account expansion strategy. Find all existing customers who have been with us for at least 1 year, have users actively engaging with our product (logged in last 7 days), and where we've identified upsell opportunities in our notes.
```

Claude will use:
- Customer age filtering (>1 year)
- Activity filtering (recent logins)
- Note content filtering (upsell opportunities)
- Relationship filtering to connect customers with their usage data and notes

## Integration with Sequential Thinking

By using the `mcp-sequentialthinking-tools` in combination with Attio MCP, Claude can break down complex CRM analysis tasks into logical steps.

**Prompt:**
```
I need to prepare for next quarter's strategic accounts review. Please analyze our enterprise accounts to identify which ones have the highest expansion potential based on recent interactions, company growth signals, and existing product usage patterns.
```

Claude will:
1. Use sequential thinking to break this into multiple steps
2. Identify and query the right data from Attio CRM
3. Apply relationship filtering to connect account information with interaction history
4. Analyze patterns to identify expansion opportunities
5. Provide a structured analysis with actionable insights

## Integration with Brave Search

By combining Brave Search with Attio CRM data, Claude can enrich relationship analysis with market intelligence.

**Prompt:**
```
I'm preparing for a meeting with Acme Corp. Find all our contacts at this company in our CRM, summarize our relationship history from our notes, and also search for any recent news about Acme Corp that might be relevant to our discussion.
```

Claude will:
1. Use Attio MCP to find contacts at Acme Corp
2. Use relationship filtering to gather notes and interaction history
3. Use Brave Search to find recent news about the company
4. Synthesize CRM data with market intelligence for a comprehensive briefing