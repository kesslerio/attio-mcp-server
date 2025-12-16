---
name: attio-mcp-usage
description: Provides universal workflow patterns and best practices for using the Attio MCP server. Complements the attio-workspace-schema skill with HOW-TO guidance for MCP tools and error prevention.
---

# Attio MCP Usage Guide

Universal workflow patterns and best practices for the Attio MCP server.

## Purpose

Teaches universal patterns for:

- Structuring multi-step workflows
- Preventing common API errors
- Using MCP tools correctly
- Building integrations

## Related Skills

**attio-workspace-schema** - Reference for YOUR workspace-specific:

- Attribute slugs and types
- Select/status option values
- List IDs and names
- Read-only fields

> Always check the schema skill for workspace-specific data

## Quick Links

- [Workflows](resources/workflows.md) - Universal workflow patterns
- [Golden Rules](resources/golden-rules.md) - Error prevention system
- [Tool Reference](resources/tool-reference.md) - MCP tool signatures
- [Integration Patterns](resources/integration-patterns.md) - Pattern index

## Pattern Selection

Choose the right pattern for your workflow:

| Keywords                               | Pattern                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| investors, fundraising, LP, term sheet | [Investor Fundraising](resources/patterns/investor-fundraising.md)   |
| product usage, PQL, activation, trial  | [PLG Product-Led](resources/patterns/plg-product-led.md)             |
| renewal, churn, health score, CSM      | [Customer Success](resources/patterns/customer-success.md)           |
| webhook, form submission, automation   | [RevOps Automation](resources/patterns/revops-automation.md)         |
| sales, deal, pipeline, opportunity     | [Sales Pipeline](resources/patterns/sales-pipeline.md)               |
| stage, auto-advance, progression       | [Deal Stage Automation](resources/patterns/deal-stage-automation.md) |
| lead, qualification, inbound, form     | [Lead Qualification](resources/patterns/lead-qualification.md)       |
| list, organize, filter, segment        | [List Organization](resources/patterns/list-organization.md)         |
| import, bulk, batch, migrate           | [Bulk Operations](resources/patterns/bulk-operations.md)             |
| enrich, external data, augment         | [Data Enrichment](resources/patterns/data-enrichment.md)             |
| error, retry, validate, exception      | [Error Handling](resources/patterns/error-handling.md)               |

## When to Use This Skill

- Planning multi-step workflows
- Troubleshooting API errors
- Learning MCP tool syntax
- Building integrations
- Understanding best practices

## Key Principles

1. **Schema skill = WHAT** (your specific fields/lists)
2. **Usage skill = HOW** (universal patterns)
3. **Cross-reference** when you need workspace specifics
