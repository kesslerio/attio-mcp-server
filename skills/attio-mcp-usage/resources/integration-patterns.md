# Integration Patterns Index

Use-case specific workflow patterns have been organized into separate files for progressive discovery. See [patterns/README.md](patterns/README.md) for the pattern selection guide.

> **Note**: This file serves as an index to the pattern library. Each pattern is self-contained with code examples and cross-references.

## Available Patterns

### Sales & Pipeline

| Pattern                                                    | Use Case                       | File                          |
| ---------------------------------------------------------- | ------------------------------ | ----------------------------- |
| [Sales Pipeline](patterns/sales-pipeline.md)               | Deal creation to close         | Manage deals through stages   |
| [Deal Stage Automation](patterns/deal-stage-automation.md) | Auto-advance based on activity | Automate pipeline progression |

### Growth & Acquisition

| Pattern                                              | Use Case                | File                                |
| ---------------------------------------------------- | ----------------------- | ----------------------------------- |
| [Lead Qualification](patterns/lead-qualification.md) | Inbound lead processing | Form submissions to qualified leads |
| [PLG Product-Led](patterns/plg-product-led.md)       | Product events → PQL    | Usage tracking and PQL scoring      |

### Retention & Success

| Pattern                                                  | Use Case               | File                         |
| -------------------------------------------------------- | ---------------------- | ---------------------------- |
| [Customer Success](patterns/customer-success.md)         | Renewal/churn tracking | Health scoring and renewals  |
| [Investor Fundraising](patterns/investor-fundraising.md) | VC/Angel pipeline      | Fundraising round management |

### Operations

| Pattern                                            | Use Case                   | File                           |
| -------------------------------------------------- | -------------------------- | ------------------------------ |
| [List Organization](patterns/list-organization.md) | Multi-list categorization  | Flexible record organization   |
| [Bulk Operations](patterns/bulk-operations.md)     | Mass import/update         | Data migration and sync        |
| [Data Enrichment](patterns/data-enrichment.md)     | External data augmentation | Firmographic/social enrichment |
| [RevOps Automation](patterns/revops-automation.md) | Webhook orchestration      | Multi-tool integration         |

### Universal

| Pattern                                      | Use Case                 | File                    |
| -------------------------------------------- | ------------------------ | ----------------------- |
| [Error Handling](patterns/error-handling.md) | Universal error template | Validation and recovery |

## Quick Selection

**What are you trying to do?**

- **Track investors or fundraise** → [Investor Fundraising](patterns/investor-fundraising.md)
- **Product-led growth / PQL scoring** → [PLG Product-Led](patterns/plg-product-led.md)
- **Customer renewals / health scores** → [Customer Success](patterns/customer-success.md)
- **Webhooks / form automation** → [RevOps Automation](patterns/revops-automation.md)
- **Sales deals / pipeline** → [Sales Pipeline](patterns/sales-pipeline.md)
- **Auto-advance deal stages** → [Deal Stage Automation](patterns/deal-stage-automation.md)
- **Qualify inbound leads** → [Lead Qualification](patterns/lead-qualification.md)
- **Organize into lists** → [List Organization](patterns/list-organization.md)
- **Import/bulk update** → [Bulk Operations](patterns/bulk-operations.md)
- **Enrich with external data** → [Data Enrichment](patterns/data-enrichment.md)
- **Handle errors gracefully** → [Error Handling](patterns/error-handling.md)

## Cross-References

- [Golden Rules](golden-rules.md) - Error prevention system
- [Tool Reference](tool-reference.md) - MCP tool signatures
- [Workflows](workflows.md) - Universal workflow patterns
- **attio-workspace-schema skill** - Your workspace-specific attributes
