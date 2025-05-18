Please add tests for the code specified in $ARGUMENTS.

Follow these steps:

1.  **Identify the target:** Locate the specific file path and function/class name provided in the arguments.
2.  **Understand the code:** Analyze the logic, inputs, and outputs of the target function/class within the `leadenrichment` project.
3.  **Determine Test Strategy:** Decide whether unit tests, integration tests, or both are most appropriate. Consider mocking external dependencies like API clients (`src/core/api/client.py`) or cache managers (`src/core/cache_manager.py`) if necessary.
4.  **Identify Test Cases:** Define test cases covering:
    *   Happy path scenarios with expected inputs and outputs.
    *   Edge cases (e.g., empty inputs, None values, boundary values).
    *   Error handling scenarios (e.g., invalid data, exceptions raised).
    *   Specific scenarios relevant to the function's purpose (e.g., different business types for a classifier, various response formats for a parser).
5.  **Write Tests:** Implement the test cases using the `pytest` framework. Place the test file in the corresponding directory under `tests/` (e.g., tests for `src/core/utils/string_utils.py` go in `tests/utils/test_string_utils.py`). Follow existing testing patterns and conventions in the project.
6.  **Import Necessary Modules:** Ensure all required modules and test utilities are imported correctly.
7.  **Run Tests:** Execute the tests using `pytest tests/path/to/your/test_file.py` and ensure they pass.
8.  **Format Code:** Ensure the generated test code follows PEP 8 standards.
9.  **Output:** Provide the complete content for the new or updated test file.