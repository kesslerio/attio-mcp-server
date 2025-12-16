# Attio Integration Patterns

Use-case specific workflow patterns for the Attio MCP server. Each pattern is self-contained with code examples and cross-references to the golden-rules and tool-reference files.

## Pattern Selection Guide

Choose the pattern that matches your workflow intent:

| User Intent                                          | Pattern File                                         |
| ---------------------------------------------------- | ---------------------------------------------------- |
| "track investors", "fundraising", "LP", "term sheet" | [investor-fundraising.md](investor-fundraising.md)   |
| "product usage", "PQL", "activation", "signup flow"  | [plg-product-led.md](plg-product-led.md)             |
| "renewal", "churn", "health score", "CSM"            | [customer-success.md](customer-success.md)           |
| "webhook", "form submission", "Slack notification"   | [revops-automation.md](revops-automation.md)         |
| "sales", "deal", "pipeline", "opportunity"           | [sales-pipeline.md](sales-pipeline.md)               |
| "stage", "auto-advance", "progression"               | [deal-stage-automation.md](deal-stage-automation.md) |
| "lead", "qualification", "inbound", "form"           | [lead-qualification.md](lead-qualification.md)       |
| "list", "organize", "filter", "segment"              | [list-organization.md](list-organization.md)         |
| "import", "bulk", "batch", "mass"                    | [bulk-operations.md](bulk-operations.md)             |
| "enrich", "external data", "augment", "Clearbit"     | [data-enrichment.md](data-enrichment.md)             |
| "error", "retry", "validate", "exception"            | [error-handling.md](error-handling.md)               |

## Pattern Categories

### Sales & Pipeline

- **[Sales Pipeline](sales-pipeline.md)** - Deal creation to close workflow
- **[Deal Stage Automation](deal-stage-automation.md)** - Auto-advance deals based on activity

### Growth & Acquisition

- **[Lead Qualification](lead-qualification.md)** - Inbound lead processing
- **[PLG Product-Led](plg-product-led.md)** - Product events to PQL scoring

### Retention & Success

- **[Customer Success](customer-success.md)** - Renewal tracking and health scoring

### Fundraising

- **[Investor Fundraising](investor-fundraising.md)** - VC/Angel pipeline management

### Operations

- **[List Organization](list-organization.md)** - Multi-list categorization
- **[Bulk Operations](bulk-operations.md)** - Mass import/update
- **[Data Enrichment](data-enrichment.md)** - External data augmentation
- **[RevOps Automation](revops-automation.md)** - Webhook and integration orchestration

### Universal

- **[Error Handling](error-handling.md)** - Universal error handling template

## Cross-References

All patterns reference:

- **[Golden Rules](../golden-rules.md)** - Error prevention system
- **[Tool Reference](../tool-reference.md)** - MCP tool signatures
- **attio-workspace-schema skill** - Your workspace-specific attributes and lists
