# Golden Rules: Error Prevention System

Universal rules to prevent API errors. Applicable to ALL Attio workspaces.

---

## 🚨 NEVER Do These

### 1. Never Update Read-Only Fields

**Read-only fields** (cannot be updated):

- `record_id`
- `created_at`
- `created_by`
- `object_id`
- Any interaction-type fields

**How to Check**: Schema skill marks read-only fields with _(read-only)_

**Error if violated**: `400 Bad Request: Field is read-only`

---

### 2. Never Forget Arrays for Multi-Select

**These REQUIRE arrays** even for single values:

- **Multi-select attributes**: `domains: ["example.com"]`
- **Select fields**: `lead_type: ["uuid-or-title"]`
- **Record references**: `team: ["person_id"]`

**Common Mistakes**:

```
❌ domains: "example.com"         → ✅ domains: ["example.com"]
❌ industry: "Technology"         → ✅ industry: ["Technology"]
❌ assignees: "person_id"         → ✅ assignees: ["person_id"]
```

**Error if violated**: `"expects array"` or `"invalid type"`

---

### 3. Never Mix Data Types

**Common mistakes**:

```
❌ lead_score: "85"               → ✅ lead_score: 85
❌ deal_value: "50000"            → ✅ deal_value: 50000
❌ is_active: "true"              → ✅ is_active: true
❌ close_date: "Dec 14, 2024"     → ✅ close_date: "2024-12-14"
```

**Type Reference**:
| Type | Correct | Incorrect |
|------|---------|-----------|
| Number | `85` | `"85"` (string) |
| Boolean | `true` | `"true"` (string) |
| Date | `"2024-12-14"` (ISO 8601) | `"Dec 14, 2024"` |
| Text | `"Acme Inc"` | (avoid emoji unless intentional) |

**How to Check**: Schema skill shows type for each attribute

---

### 4. Never Skip UUID Validation

**Before ANY record operation**:

```typescript
// Validate record_id format
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(record_id)) {
  throw new Error('Invalid record_id format');
}
```

**Examples**:

```
✅ "550e8400-e29b-41d4-a716-446655440000"
❌ "123"
❌ "not-a-uuid"
❌ ""
```

**Error if violated**: `400 Bad Request: Invalid UUID`

---

### 5. Never Use Display Names as API Slugs

**Always use API slugs, not display names**:

```
❌ "Primary Location"             → ✅ primary_location
❌ "Lead Type"                    → ✅ lead_type
❌ "Deal Stage"                   → ✅ deal_stage
❌ "Company Name"                 → ✅ name
```

**How to Check**: Schema skill has "Display Name → API Slug" mapping table

**Error if violated**: `400 Bad Request: Unknown attribute`

---

## ✅ ALWAYS Do These

### 1. Discovery First - Know Your Schema

**Before writing ANY code that touches Attio:**

```
Step 1: Run records_discover_attributes
  → Get current schema for the object type
  → Attribute slugs may differ from display names

Step 2: Verify attribute slugs
  → Use API slugs, not display names
  → "Lead Type" → lead_type (or whatever schema returns)

Step 3: Check data types
  → Numbers: 85 (not "85")
  → Arrays: ["value"] for multi-select
  → Dates: ISO 8601 format
```

**Why This Matters**:

- Attribute slugs are workspace-specific (custom fields)
- Display names ≠ API slugs
- Schema skill provides pre-fetched discovery data

---

### 2. Always Check Schema Skill First

Before ANY operation:

- Verify attribute slugs exist
- Check data types match
- Confirm field is writable
- Get valid select/status options

**Pre-Flight Checklist**:

```
□ Attribute exists in schema skill
□ Data type matches schema
□ Field is writable (not read-only)
□ Multi-select wrapped in array
□ UUID format validated
```

---

### 3. Always Validate Before Updating

```typescript
// Pre-flight validation
1. Verify record_id is valid UUID
2. Check attributes exist in schema
3. Validate data types match
4. Wrap multi-select in arrays
5. Exclude read-only fields
6. Confirm exact option values
```

**Example Validation Function**:

```typescript
function validateUpdate(resource_type, record_id, data) {
  // 1. UUID validation
  if (!isValidUUID(record_id)) throw new Error('Invalid UUID');

  // 2. Attribute validation (from schema skill)
  const validAttrs = getValidAttributes(resource_type);
  for (const attr in data) {
    if (!validAttrs.includes(attr)) {
      throw new Error(`Unknown attribute: ${attr}`);
    }
  }

  // 3. Type validation
  validateDataTypes(resource_type, data);

  // 4. Read-only check
  const readOnly = ['record_id', 'created_at', 'created_by'];
  for (const field of readOnly) {
    if (data[field]) throw new Error(`Cannot update read-only: ${field}`);
  }
}
```

---

### 4. Always Use Exact Option Values

**For select fields**:

- Use exact titles (case-sensitive): `"Potential Customer"`
- OR use UUIDs: `"8f6ac4eb-6ab6-40be-909a-29042d3674e7"`

**For status fields**:

- Titles are auto-converted (case-insensitive): `"demo scheduling"` works
- But exact case is safer: `"Demo Scheduling"`

**Examples**:

```
✅ lead_type: ["Potential Customer"]    (exact title)
✅ lead_type: ["uuid-goes-here"]        (UUID)
❌ lead_type: ["potential customer"]    (wrong case for select)

✅ deal_stage: "Proposal Sent"          (exact, status auto-converts)
✅ deal_stage: "proposal sent"          (works for status fields)
```

**How to Get Values**: Schema skill lists all options with exact casing

---

### 5. Always Verify Field Persistence

After updates:

```
Step 1: update-record
  → Send update request

Step 2: Re-fetch record
  → records_get_details with same record_id

Step 3: Confirm changes applied
  → Compare sent values vs returned values

Step 4: Handle mismatches
  → Semantic mismatch: Field didn't update (investigate)
  → Cosmetic mismatch: Field normalized (OK)
```

**Why**: Field verification is enabled by default (see `ENABLE_FIELD_VERIFICATION`)

**Semantic vs Cosmetic Mismatches**:

- **Semantic**: Sent `true`, got `false` → PROBLEM
- **Cosmetic**: Sent `"demo scheduling"`, got `"Demo Scheduling"` → OK (status normalization)

---

### 6. Always Add Context with Notes

When making significant changes:

```
Step 1: Update record
  → Make the change

Step 2: Create note documenting WHY
  → Explain reasoning
  → Include data source if enrichment
  → Add timestamp

Step 3: Link note to record_id
  → record_id references the updated record
```

**Benefits**:

- Audit trail for compliance
- Team communication
- Debugging assistance
- Historical context

**Example**:

```typescript
// After updating deal stage
await createNote({
  resource_type: 'deals',
  record_id: deal.record_id,
  title: 'Stage Updated',
  content:
    'Moved to Proposal Sent after demo call with CTO. Next: follow up in 48h.',
});
```

---

## Error Reference

| Error                    | Cause                         | Solution                             |
| ------------------------ | ----------------------------- | ------------------------------------ |
| `expects array`          | Single value for multi-select | Wrap in array: `["value"]`           |
| `invalid type`           | Wrong data type               | Check schema skill for type          |
| `Field is read-only`     | Updating read-only field      | Remove from payload                  |
| `Invalid UUID`           | Malformed record_id           | Validate UUID format                 |
| `option not found`       | Invalid select option         | Check schema skill for valid options |
| `Unknown attribute`      | Attribute doesn't exist       | Verify slug in schema skill          |
| `Required field missing` | Missing required attribute    | Check schema for required fields     |
| `Rate limit exceeded`    | Too many requests             | Add 100ms delay between requests     |

---

## Cross-References

Check your `attio-workspace-schema` skill for:

- Read-only field markers
- Multi-select attribute flags
- Data type specifications
- Valid select/status options
- Required field indicators
- Attribute slug mappings (Display Name → API Slug)
