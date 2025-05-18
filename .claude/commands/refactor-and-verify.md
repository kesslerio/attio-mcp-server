Please refactor the code in `$ARGUMENTS[1]` based on the requirements in GitHub issue #`$ARGUMENTS[0]` or the provided refactoring goal: "$ARGUMENTS[2]".

**Crucially, ensure all existing tests in the corresponding test file(s) (typically `tests/.../test_*.py` related to `$ARGUMENTS[1]`) continue to pass after refactoring.**

Follow these steps:

1.  **Fetch Issue/Goal Context:** Use `gh issue view $ARGUMENTS[0]` or analyze the goal "$ARGUMENTS[2]".
2.  **Analyze Target Code:** Understand the current implementation in `$ARGUMENTS[1]`.
3.  **Identify Corresponding Tests:** Locate the primary test file(s) associated with `$ARGUMENTS[1]`.
4.  **Perform Refactoring:** Modify the code in `$ARGUMENTS[1]` to meet the refactoring requirements (e.g., improve clarity, enhance performance, adopt a new pattern) while preserving the original functionality as defined by the tests.
5.  **Adhere to Code Principles:** Follow all guidelines from `CLAUDE.md`.
6.  **Verify Against Tests (Simulated):** Mentally ensure your refactored code does not break any existing test cases in the associated test file(s). The functional behavior, as tested, must remain the same.
7.  **Output:** Provide the complete, *refactored* content **only for the implementation file (`$ARGUMENTS[1]`)**.