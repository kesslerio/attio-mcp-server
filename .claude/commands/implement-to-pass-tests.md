Please write or modify the implementation code in the target file `$ARGUMENTS[1]` so that the tests in the test file `$ARGUMENTS[2]` pass. Reference GitHub issue #`$ARGUMENTS[0]` for context.

**Adhere strictly to Test-Driven Development (TDD):**
-   Your *only* goal is to make the tests in `$ARGUMENTS[2]` pass.
-   **DO NOT modify the test file (`$ARGUMENTS[2]`)** under any circumstances.
-   Implement the simplest code possible that satisfies the tests.

Follow these steps:

1.  **Fetch Issue Context:** Use `gh issue view $ARGUMENTS[0]` to understand the overall goal.
2.  **Analyze Failing Tests:** Carefully examine the tests within `$ARGUMENTS[2]` to understand the required inputs, outputs, and behavior. Pay attention to assertion errors from previous failed runs if available.
3.  **Analyze Target Code:** Review the *current* state of the implementation code in `$ARGUMENTS[1]` (it might be empty, partially implemented, or incorrect).
4.  **Write/Modify Implementation:** Write or modify the necessary functions/classes/methods within `$ARGUMENTS[1]` specifically to satisfy the requirements defined by the tests in `$ARGUMENTS[2]`.
5.  **Adhere to Code Principles:** Follow all guidelines from `CLAUDE.md` (Python style, SRP, error handling, logging, type hints, etc.).
6.  **Iterate and Verify (Simulated):** Although you can't run `pytest` directly, mentally simulate running the tests against your proposed code changes. Refine the code until you are confident it will make the tests pass.
7.  **Output:** Provide the complete, *modified* content **only for the implementation file (`$ARGUMENTS[1]`)**. Do not include the test code.