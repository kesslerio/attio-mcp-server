# P1 Deal Operations Tests

## Overview

Automated MCP test suite for Deal operations validation as part of P1 Essential Tests. This test suite validates comprehensive deal management functionality through the MCP protocol layer.

## Quality Gate Requirements

- **Priority Level**: P1 Essential
- **Pass Rate Target**: **100%** (10/10 tests must pass)
- **Execution Time**: ~45 seconds for full suite
- **Test Environment**: Real Attio API integration

## Test Structure

```
test/e2e/mcp/deal-operations/
├── deal-crud.mcp.test.ts           # TC-D01 to TC-D04 (4 tests)
├── deal-pipeline.mcp.test.ts       # TC-D05 to TC-D07 (3 tests)
└── deal-relationships.mcp.test.ts  # TC-D08 to TC-D10 (3 tests)
```

## Test Execution Commands

```bash
# Run all deal operation tests
npm run test:mcp:p1:deals

# Run combined P1 tests (lists + deals)
npm run test:mcp:p1

# Individual test suites
vitest run test/e2e/mcp/deal-operations/deal-crud.mcp.test.ts
vitest run test/e2e/mcp/deal-operations/deal-pipeline.mcp.test.ts
vitest run test/e2e/mcp/deal-operations/deal-relationships.mcp.test.ts

# Watch mode for development
vitest test/e2e/mcp/deal-operations/ --watch
```

## Test Cases

### TC-D01 to TC-D04: Deal CRUD Operations

**File**: `deal-crud.mcp.test.ts`  
**Test Count**: 4 tests  
**Quality Gate**: 100% pass rate required

#### TC-D01: Create Deal with Basic Fields

- **Purpose**: Validate deal creation with required fields (name, stage, value)
- **Method**: `create-record` tool with resource_type 'deals'
- **Test Data**: Generated via `TestDataFactory.createDealData()`
- **Validation**: MCP response contains success confirmation and record ID
- **Field Mappings Tested**:
  - `name` (also accepts: title, deal_name, deal_title, opportunity_name)
  - `stage` (also accepts: status, deal_stage, pipeline_stage, deal_status)
  - `value` (also accepts: amount, deal_value, deal_amount, price, revenue)

#### TC-D02: Get Deal Details by ID

- **Purpose**: Validate deal record retrieval
- **Method**: `records.get_details` tool with deal ID from TC-D01
- **Validation**: MCP response contains deal information
- **Dependencies**: Requires successful TC-D01 execution

#### TC-D03: Update Deal Fields

- **Purpose**: Validate deal field updates (stage and value)
- **Method**: `update-record` tool with modified field values
- **Test Data**: Generated via `TestDataFactory.createUpdateData('deals')`
- **Validation**: MCP response confirms successful update
- **Dependencies**: Requires successful TC-D01 execution

#### TC-D04: Delete Deal Record

- **Purpose**: Validate deal deletion functionality
- **Method**: `delete-record` tool with deal ID
- **Validation**: MCP response confirms successful deletion
- **Dependencies**: Requires successful TC-D01 execution

### TC-D05 to TC-D07: Deal Pipeline Operations

**File**: `deal-pipeline.mcp.test.ts`  
**Test Count**: 3 tests  
**Quality Gate**: 100% pass rate required

#### TC-D05: Move Deal Through Pipeline Stages

- **Purpose**: Validate deal stage progression through pipeline
- **Stages Tested**: Lead → Qualified → Proposal
- **Method**: Sequential `update-record` calls with different stage values
- **Pipeline Stages**: Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
- **Validation**: Each stage update confirmed via MCP response

#### TC-D06: Update Deal Value and Currency

- **Purpose**: Validate deal value updates with different amounts
- **Method**: Multiple `update-record` calls with varying values
- **Test Values**: 25000, 50000, 100000
- **Validation**: Each value update confirmed via MCP response
- **Currency Handling**: Automatic USD assignment per workspace settings

#### TC-D07: Search Deals by Stage/Status

- **Purpose**: Validate deal search and filtering capabilities
- **Method**: Create deals in different stages, then search using `records.search`
- **Search Parameters**: resource_type 'deals', query pattern, limit 10
- **Validation**: Search returns relevant deal records

### TC-D08 to TC-D10: Deal Relationship Operations

**File**: `deal-relationships.mcp.test.ts`  
**Test Count**: 3 tests  
**Quality Gate**: 100% pass rate required

#### TC-D08: Associate Deal with Company

- **Purpose**: Validate deal-company relationship creation
- **Method**: Create company first, then create deal with `associated_company` field
- **Field Mappings**: `associated_company` (also accepts: company, company_id, account, customer)
- **Validation**: Deal creation with company association succeeds

#### TC-D09: Associate Deal with People/Contacts

- **Purpose**: Validate deal-person relationship creation
- **Method**: Create person first, then create deal with `associated_people` field
- **Field Mappings**: `associated_people` (also accepts: contact, contacts, primary_contact, people)
- **Data Structure**: Array of person record IDs
- **Validation**: Deal creation with people association succeeds

#### TC-D10: Search Deals by Associated Records

- **Purpose**: Validate relationship-based deal discovery
- **Method**: Create deal with both company and people associations, then search
- **Search Strategy**: Use query pattern that matches created test data
- **Validation**: Search returns deals with proper relationships

## Field Mappings Validation

The test suite validates comprehensive field mapping support from `DEALS_FIELD_MAPPING`:

### Core Fields

- **name**: Required field, accepts variations (title, deal_name, opportunity_name)
- **stage**: Required field, accepts variations (status, deal_stage, pipeline_stage)
- **value**: Currency field, accepts variations (amount, price, revenue)
- **owner**: Actor reference field for deal ownership
- **associated_company**: Record reference to company
- **associated_people**: Array of record references to people

### Invalid Fields Handled

Tests confirm proper rejection of invalid fields:

- `description`, `notes` → Should be created separately
- `close_date`, `probability` → Not built-in fields
- `currency` → Handled automatically by Attio

## Test Data Management

### Test Data Factory Methods

- `TestDataFactory.createDealData(testCase)`: Basic deal with random stage and value
- `TestDataFactory.createDealWithStage(testCase, stage)`: Deal with specific stage
- `TestDataFactory.createDealPipelineStages()`: Returns array of valid stages
- `TestDataFactory.createUpdateData('deals', testCase)`: Update payload for deals

### Cleanup Strategy

- Automatic cleanup in `afterAll()` hooks
- Failed records are tracked and cleaned up
- Deletion errors are ignored to prevent test failures
- Records are removed from tracking after successful deletion

## MCP Response Format

### Expected Response Characteristics

- **Format**: Text-based responses, not JSON
- **Success Indicators**: Text confirmation messages
- **ID Extraction**: Pattern `/\(ID:\s*([a-f0-9-]+)\)/i`
- **Error Handling**: Text-based error messages
- **Field Echo**: Values not echoed back in responses

### Validation Patterns

- **Creation**: Look for ID pattern and success text
- **Updates**: Confirm update success messages
- **Retrieval**: Validate record data presence
- **Deletion**: Confirm deletion success messages
- **Search**: Validate result count and relevance

## Performance Expectations

- **Individual Test**: 3-8 seconds per test
- **Full Suite**: 30-45 seconds total
- **API Calls**: 2-4 API calls per test on average
- **Data Volume**: Small test datasets for speed
- **Cleanup Time**: 5-10 seconds for full cleanup

## Integration with CI/CD

### Local Development

```bash
# Quick deal test run
npm run test:mcp:p1:deals

# Watch mode for TDD
vitest test/e2e/mcp/deal-operations/ --watch
```

### Quality Gate Integration

- Tests run locally (not in GitHub Actions CI/CD)
- Real API credentials required via `ATTIO_API_KEY`
- 100% pass rate enforced via quality gate validation
- Results logged with pass/fail metrics

## Troubleshooting

### Common Issues

1. **API Authentication**: Ensure `ATTIO_API_KEY` is set
2. **Rate Limiting**: Tests include small delays between API calls
3. **Test Data Conflicts**: Each test uses unique timestamps for isolation
4. **MCP Response Format**: Tests expect text responses, not JSON
5. **Field Validation**: Invalid fields are rejected by universal field mapper

### Debug Commands

```bash
# Verbose test output
vitest run test/e2e/mcp/deal-operations/ --reporter=verbose

# Single test debugging
vitest run test/e2e/mcp/deal-operations/deal-crud.mcp.test.ts --reporter=verbose

# Watch specific test
vitest test/e2e/mcp/deal-operations/deal-crud.mcp.test.ts --watch
```

## Success Metrics

### Target Outcomes

- ✅ **100% Pass Rate**: All 10 tests must pass
- ✅ **Field Mapping Coverage**: All core deal fields tested
- ✅ **Pipeline Validation**: All major pipeline operations verified
- ✅ **Relationship Testing**: Company and people associations validated
- ✅ **MCP Protocol Compliance**: Text-based response handling confirmed

### Quality Indicators

- Consistent test execution times
- Clean test data isolation
- Proper error handling and cleanup
- Comprehensive field mapping validation
- Real API integration verification

This test suite ensures robust deal management functionality through comprehensive MCP protocol testing with 100% reliability standards.
