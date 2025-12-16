# Data Enrichment Pattern

## Keywords

`enrich`, `external data`, `augment`, `Clearbit`, `ZoomInfo`, `firmographic`, `social`, `LinkedIn`, `API integration`

## Overview

Augment Attio records with external data from enrichment providers. This pattern covers firmographic data for companies, deal intelligence, and social profile data for people.

## When to Use

- Adding firmographic data to companies (size, industry, revenue)
- Enriching people records with social profiles
- Augmenting deals with competitive intelligence
- Populating missing fields from external sources
- Building enrichment queues and tracking enrichment status

## Workflow Steps

### Companies (Firmographic Data)

```
Step 1: Get records needing enrichment
{
  listId: 'enrichment-queue-id',
}
// OR filter by enrichment_status attribute

Step 2: Fetch external data
external_data = await fetch_from_api(company.domain);
// Sources: Clearbit, ZoomInfo, etc.

Step 3: Map to Attio schema
// Standard attributes:
standard_data = {
  description: external_data.summary,         // Standard: text field
  categories: [external_data.category]        // Standard: multiselect
};
// Custom attributes (verify via schema skill):
// employee_count, industry, annual_revenue, headquarters, etc.
custom_data = { /* your workspace-specific attributes */ };

Step 4: Update record
{
  resource_type: 'companies',
  record_id: company.record_id,
  record_data: { ...standard_data, ...custom_data }
}

Step 5: Track enrichment (via note)
{
  resource_type: 'companies',
  record_id: company.record_id,
  title: 'Data Enrichment',
  content: `Source: Clearbit\nDate: ${new Date().toISOString()}\nFields updated: description, categories`
}
```

### Deals (Financial/Competitive Data)

```
Step 1: Fetch deal intelligence
external_data = await fetch_deal_intel(deal.company_domain);

Step 2: Map to Attio
mapped_data = {
  competitive_threat: external_data.competitors,  // Text
  market_segment: [external_data.segment],        // Array
  estimated_close_value: external_data.value      // Number
};

Step 3: Update + document
// Same pattern as companies
```

### People (Social Profiles)

```
Step 1: Fetch social data
linkedin_data = await fetch_linkedin(person.email);

Step 2: Map to Attio
mapped_data = {
  job_title: linkedin_data.title,           // Text
  linkedin_url: linkedin_data.profile_url,  // Text
  seniority_level: [linkedin_data.level]    // Array for select
};

Step 3: Update + document
// Same pattern as companies
```

## Field Mapping Reference

| External Source | Attio Standard | Attio Custom (verify) |
| --------------- | -------------- | --------------------- |
| Company name    | `name`         | -                     |
| Website domain  | `domains`      | -                     |
| Description     | `description`  | -                     |
| Industry        | -              | `industry`            |
| Employee count  | -              | `employee_count`      |
| Annual revenue  | -              | `annual_revenue`      |
| Headquarters    | -              | `headquarters`        |

## Key Points

- **Document enrichment source** - Track where data came from
- **Map carefully** - Standard vs custom attributes differ per workspace
- **Rate limit external APIs** - Respect provider limits
- **Handle missing data** - External APIs may return partial data
- **Enrichment queue** - Use lists to track records needing enrichment

## Cross-References

- [Golden Rules](../golden-rules.md) - Attribute validation, data types
- [Tool Reference](../tool-reference.md) - `update-record`, `create-note`, `records_discover_attributes`
- **attio-workspace-schema skill** - Your workspace's available attributes for mapping
