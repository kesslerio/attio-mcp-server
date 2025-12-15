# Generated Skill Validation Checklist

Use this checklist to verify generated skills before packaging and distribution.

---

## Structure Validation

### Required Files

- [ ] `SKILL.md` exists in root directory
- [ ] `resources/` directory exists
- [ ] At least one resource file exists

### SKILL.md Frontmatter

- [ ] Has valid YAML frontmatter (between `---` delimiters)
- [ ] `name` field is present
- [ ] `name` is hyphen-case (lowercase, digits, hyphens only)
- [ ] `name` is max 64 characters
- [ ] `name` starts with lowercase letter
- [ ] `description` field is present
- [ ] `description` is max 1024 characters
- [ ] `description` contains no angle brackets (< or >)

---

## Workspace-Specific Validation

### Object Slugs

- [ ] All referenced object slugs exist in the user's workspace
- [ ] Common objects: `companies`, `people`, `deals`
- [ ] Custom objects: Verify with `records_discover_attributes`

### Attribute Slugs

- [ ] All attribute slugs match the workspace schema
- [ ] Use API slugs, NOT display names
- [ ] Verify with attio-workspace-schema skill or MCP discovery

### List References

- [ ] All list IDs are valid UUIDs
- [ ] List IDs come from actual workspace (not templates)
- [ ] Each list's `parent_object` matches the workflow's target object
- [ ] Verify with `get-lists` MCP tool

### Select/Status Options

- [ ] All option values use exact titles from workspace
- [ ] Option values are case-sensitive
- [ ] Status field options verified with `records_get_attribute_options`
- [ ] Select field options verified with `records_get_attribute_options`

---

## Content Quality

### Completeness

- [ ] All workflow steps have descriptions
- [ ] Tool references are accurate
- [ ] Examples use realistic data
- [ ] Cross-references to other skills are correct

### Accuracy

- [ ] No hardcoded values from other workspaces
- [ ] No placeholder UUIDs (like `uuid-here`)
- [ ] Field types match (numbers, strings, arrays)
- [ ] Multi-select fields documented as requiring arrays

### Clarity

- [ ] Instructions are clear and actionable
- [ ] Error handling guidance is included
- [ ] Edge cases are documented
- [ ] Prerequisites are stated

---

## Technical Validation

### Data Types

- [ ] Number fields: Use numbers (`85`), not strings (`"85"`)
- [ ] Boolean fields: Use booleans (`true`), not strings (`"true"`)
- [ ] Date fields: Use ISO 8601 format (`"2024-12-14"`)
- [ ] Array fields: Multi-select uses arrays even for single values

### UUID Validation

- [ ] All UUIDs match format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- [ ] No truncated or partial UUIDs
- [ ] No placeholder UUIDs in final output

### Read-Only Fields

- [ ] Read-only fields are not included in update examples
- [ ] Computed fields are documented as read-only
- [ ] `created_at`, `updated_at` not in update payloads

---

## Final Checks

### Before Packaging

- [ ] Run `python quick_validate.py <skill-path>`
- [ ] Review all generated content for accuracy
- [ ] Test at least one workflow manually
- [ ] Verify skill loads in Claude without errors

### After Packaging

- [ ] `.skill` file is valid ZIP archive
- [ ] Archive contains all expected files
- [ ] Skill name matches directory name
- [ ] No sensitive data in packaged files

---

## Common Issues and Fixes

| Issue                  | Cause                                    | Fix                                 |
| ---------------------- | ---------------------------------------- | ----------------------------------- |
| "Invalid name"         | Name contains uppercase or special chars | Use hyphen-case                     |
| "Description too long" | Over 1024 characters                     | Shorten description                 |
| "Unknown attribute"    | Wrong API slug                           | Check workspace schema              |
| "Invalid option"       | Wrong option title                       | Use `records_get_attribute_options` |
| "List not found"       | Invalid list UUID                        | Use `get-lists` to get real IDs     |
| "Record not found"     | Invalid record UUID                      | Verify UUID format and existence    |

---

## Validation Script Usage

```bash
# Quick validation
python scripts/quick_validate.py ./my-skill

# Full validation before packaging
python scripts/quick_validate.py ./my-skill && \
python scripts/package_skill.py ./my-skill
```
