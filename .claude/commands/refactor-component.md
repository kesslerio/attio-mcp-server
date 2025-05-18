Please refactor the component specified in $ARGUMENTS to adopt the specified pattern or standard.

Follow these steps:

1.  **Identify Target and Pattern:** Understand the file path provided in the arguments and the refactoring goal (e.g., "Use UnifiedSchemaAdapter", "Implement centralized format:text handling", "Standardize error logging with log_error").
2.  **Analyze Existing Code:** Review the current implementation of the target component.
3.  **Identify Code Sections for Refactoring:** Pinpoint the specific functions or methods that need modification.
4.  **Implement Refactoring:** Apply the desired pattern/standard:
    *   Update imports.
    *   Modify function signatures if needed.
    *   Replace old logic with the new pattern (e.g., replace direct API calls with adapter calls, replace manual error checks with standard utilities).
    *   Ensure interaction with other components (like API client, cache, loggers) follows current project standards.
5.  **Maintain Compatibility:** Ensure the refactored component maintains its original public API or document necessary changes.
6.  **Add Logging/Instrumentation:** Incorporate standard logging (using `get_logger` and `log_with_trace`) and potentially telemetry calls if relevant to the pattern.
7.  **Test the Changes:** Write or update unit/integration tests to verify the refactoring works correctly and doesn't introduce regressions. Run the tests.
8.  **Document Changes:** Add comments explaining the refactoring and update relevant module/function docstrings.
9.  **Output:** Provide the complete, refactored code for the specified file.