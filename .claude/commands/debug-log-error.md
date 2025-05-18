Please analyze the log files to diagnose the root cause of the error described in $ARGUMENTS.

Follow these steps:

1.  **Understand the Error:** Parse the arguments to identify the error description and any provided Trace ID (e.g., `[TRACE:98b97c20]`).
2.  **Locate Relevant Logs:**
    *   Identify the correct timestamped run directory in `logs/production/` or `logs/test/`. If a specific run ID is given, use that. Otherwise, assume the 'latest' symlink.
    *   Search the central `errors/error.log` file for the primary error message and stack trace, using the Trace ID if available.
    *   Search relevant component log files (in `components/`) using the Trace ID to trace the execution flow leading up to the error. Check files like `api.log`, `domain_discovery.log`, `analyzers.log`, etc.
    *   Check `llm/llm_interactions.log` if the error seems related to an API call, using the Trace ID.
3.  **Analyze Log Sequence:** Reconstruct the sequence of operations leading to the error by correlating log entries using the Trace ID across different files.
4.  **Identify Root Cause:** Based on the log sequence and error messages, determine the specific module, function, and line of code where the error originated. Identify the underlying cause (e.g., unexpected API response, invalid data, schema mismatch, configuration issue).
5.  **Find Relevant Code:** Search the codebase (`src/core/`) for the functions and modules identified in the logs.
6.  **Propose Solution:** Suggest specific code changes or configuration adjustments to fix the root cause.
7.  **Output:** Provide a summary including:
    *   The identified root cause.
    *   Key log entries supporting the analysis (with timestamps and Trace IDs).
    *   The relevant code file(s) and line number(s).
    *   A proposed fix or explanation.