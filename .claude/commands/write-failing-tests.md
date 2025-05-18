Please write **failing** pytest tests for the functionality described in GitHub issue #$ARGUMENTS[0], targeting the file/module/function: $ARGUMENTS[1].

**Adhere strictly to Test-Driven Development (TDD):** DO NOT write any implementation code for `$ARGUMENTS[1]` yet. The tests MUST fail initially because the implementation doesn't exist or is incorrect.

Follow these steps:

1.  **Fetch Issue Details:** Use `gh issue view $ARGUMENTS[0]` to fully understand the requirements, expected inputs, outputs, and edge cases for the feature or bug fix.
2.  **Identify Target Code:** Determine the precise location (`src/...`) where the implementation code *will* reside, even if the file doesn't exist yet.
3.  **Determine Test Location:** Based on the target code path, determine the correct corresponding test file path in the `tests/` directory (e.g., `tests/core/utils/test_domain_utils.py` for `src/core/utils/domain_utils.py`).
4.  **Design Test Cases:** Based on the issue requirements, design comprehensive `pytest` test cases covering:
    *   Core functionality (happy path).
    *   Known edge cases (e.g., `None` inputs, empty strings, empty lists, boundary values).
    *   Expected error handling scenarios (if applicable).
    *   Specific examples mentioned in the issue.
5.  **Write Failing Pytest Code:** Implement the test cases in the identified test file.
    *   Use `assert` statements to check for the *expected* outcomes.
    *   Import the *target* function/class (even if it doesn't exist yet) from its planned location in `src/`.
    *   Mock dependencies where necessary, especially external APIs (`ApiClient`, `CacheManager`) using `unittest.mock` or `pytest-mock`. Follow patterns in existing tests.
    *   Adhere to project testing conventions (fixtures, markers if needed).
6.  **DO NOT IMPLEMENT:** Absolutely do not write any implementation code in the `src/` directory for `$ARGUMENTS[1]` at this stage.
7.  **Output:** Provide the complete content for the new or updated test file (`tests/.../test_*.py`).

*Self-Correction Reminder: The goal is failing tests that accurately reflect the requirements. Verify the tests target the intended functionality and cover important cases described in the issue.*