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

#### Step 1: Get records needing enrichment

Call `get-list-entries` with:

```json
{
  "listId": "<enrichment-queue-id>",
  "limit": 100
}
```

> **Note**: Or search for records with empty enrichment fields.

#### Step 2: Fetch external data

Query your enrichment provider (Clearbit, ZoomInfo, etc.) using the company domain.

#### Step 3: Update record with enriched data

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<company_record_id>",
  "record_data": {
    "description": "B2B SaaS company focused on developer tools",
    "categories": ["Technology", "SaaS"]
  }
}
```

> **Note**: Standard attributes: `description`, `categories`. Custom attributes (verify via schema skill): `employee_count`, `industry`, `annual_revenue`, `headquarters`.

#### Step 4: Document enrichment source

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<company_record_id>",
  "title": "Data Enrichment",
  "content": "Source: Clearbit\nDate: 2024-12-15\nFields updated: description, categories, employee_count"
}
```

### Deals (Financial/Competitive Data)

#### Step 1: Get deal company domain

Call `records_get_details` to fetch the deal and its associated company domain.

#### Step 2: Update deal with intelligence

Call `update-record` with:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "record_data": {
    "description": "Competitive landscape: 2 alternatives evaluated"
  }
}
```

> **Note**: Custom attributes (verify via schema): `competitive_threat`, `market_segment`, `estimated_close_value`.

#### Step 3: Document intelligence source

Call `create-note` with:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "title": "Competitive Intelligence",
  "content": "Source: G2 + LinkedIn\nCompetitors evaluating: Competitor A, Competitor B\nDifferentiators: Feature X, pricing"
}
```

### People (Social Profiles)

#### Step 1: Get person record

Call `records_get_details` to fetch person details and email.

#### Step 2: Update with social data

Call `update-record` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "record_data": {
    "job_title": "VP of Engineering",
    "description": "15+ years experience in B2B SaaS"
  }
}
```

> **Note**: Custom attributes (verify via schema): `linkedin_url`, `seniority_level`, `years_experience`.

#### Step 3: Document profile source

Call `create-note` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "title": "Profile Enrichment",
  "content": "Source: LinkedIn\nVerified: 2024-12-15\nProfile URL: https://linkedin.com/in/example"
}
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
