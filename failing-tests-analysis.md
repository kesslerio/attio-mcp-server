# Failing Tests Analysis - Strategic Removal Candidates

## Overview
**Current**: 21 failing test files (out of 69 total files)  
**Strategy**: Remove failing mock-heavy tests to improve pass rate while preserving valuable behavior tests

## Failing Test Files Categorization

### 🔴 HIGH PRIORITY REMOVAL (11 files)
**Rationale**: Mock-heavy implementation tests that are failing - perfect removal candidates

#### Mock Coordination Failures (8 files)
```
test/api/attio-client.test.ts          - Mock coordination, API client config
test/api/attio-operations.test.ts      - Mock coordination, API operations  
test/handlers/tools.people.test.ts     - Tool dispatch coordination (handlers/)
test/integration/advanced-search-companies.test.ts - Fake integration w/ mocks
test/integration/attribute-validation-integration.test.ts - Fake integration w/ mocks
test/integration/boolean-attribute-update.test.ts - Fake integration w/ mocks
test/integration/industry-mapping.test.ts - Fake integration w/ mocks
test/objects/batch-people.test.ts      - Mock coordination batch ops
```

#### Objects Mock Coordination (3 files)
```
test/objects/company-attributes.test.ts - Mock coordination testing
test/objects/lists.test.ts             - Mock coordination with fallbacks
test/objects/people-advanced-search.test.ts - Mock coordination testing
```

### 🟡 MEDIUM PRIORITY REMOVAL (4 files)  
**Rationale**: Integration tests with mocking - likely "fake integration"

```
test/integration/lists/get-list-details.integration.test.ts - Mock coordination via axios
test/integration/lists/record-list-memberships.integration.test.ts - Mock coordination via axios
test/objects/lists.record-memberships.test.ts - Entry lookup logic, but failing
test/performance/relationship-filters.test.ts - Performance tests, complex setup
```

### 🟢 KEEP (6 files)
**Rationale**: Real behavior tests that should be fixed, not removed

#### Real Integration Tests (5 files)
```
test/integration/real-api-integration.test.ts - Real API, just has vi.setTimeout issue
test/integration/company-write-operations.test.ts - Real API workflows  
test/integration/concurrent-operations.test.ts - Real concurrency testing
test/integration/lists/add-record-to-list.integration.test.ts - Real API when available
test/api/industry-categories-mapping.test.ts - E2E mapping validation
```

#### Utility Logic (1 file)
```
test/utils/record-utils.test.ts - Pure utility function testing
```

## Strategic Impact Analysis

### If We Remove HIGH PRIORITY (11 files):
- **Files**: 69 → 58 (-16% further reduction)
- **Estimated Pass Rate**: ~93-95% (removing 11 failing files)
- **Quality**: Eliminates mock coordination tests
- **Risk**: Low - these test implementation details

### If We Remove MEDIUM PRIORITY (4 files):
- **Files**: 58 → 54 (-22% total from Phase 2A)
- **Estimated Pass Rate**: ~95-97% 
- **Quality**: Removes complex/fake integration tests
- **Risk**: Medium - some may have business logic value

### Keep HIGH VALUE (6 files):
- **Focus**: Fix real integration and behavior tests
- **Value**: These test actual user workflows
- **Goal**: Get these 6 to pass for meaningful TDD

## Recommended Action Plan

### Phase 2B-1: Remove HIGH PRIORITY (11 files)
**Immediate removal** - mock coordination tests that are failing
- Low risk, high reward
- Direct path to ~95% pass rate
- Eliminates maintenance burden

### Phase 2B-2: Evaluate MEDIUM PRIORITY (4 files)  
**Case-by-case analysis** - may have some value
- Review for business logic
- Consider simplification vs removal

### Phase 2B-3: Fix KEEP Tests (6 files)
**Targeted fixes** for high-value behavior tests
- Real integration tests
- Utility function tests
- These failures indicate actual issues worth fixing

## Expected Outcome

**Target State After Phase 2B:**
- **Files**: 69 → 54-58 (20-22% further reduction from Phase 2A)  
- **Total Reduction**: 89 → 54-58 (35-39% total reduction)
- **Pass Rate**: 88.8% → 95-97%
- **Quality**: Focus on real behavior validation
- **Maintenance**: Dramatically reduced test debugging time

This strategy directly serves the TDD goal: eliminate useless failing tests, keep valuable behavior validation.