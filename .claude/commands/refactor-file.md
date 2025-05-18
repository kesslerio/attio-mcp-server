Please refactor the file specified in `$ARGUMENTS[0]` into smaller, more focused modules, adhering to the Single Responsibility Principle (SRP).

**Primary Goal:** Break down the target file into logical, smaller units without changing the overall functionality or public interface where possible.

**Follow these steps:**

1.  **Analyze Target File:** Read the contents of `$ARGUMENTS[0]` and identify distinct responsibilities or logical groupings of functions/classes (e.g., API request building, response parsing, specific business logic, utility functions, constants).
2.  **Plan Refactoring:** Determine how to split the file. Identify which functions/classes belong together based on SRP. Plan the names and locations (`src/core/...` or `src/utils/...`) for the new `.py` files. Keep related functionality grouped logically.
3.  **Create New Modules:** Generate the content for each new Python file. Ensure each new module has:
    *   Necessary imports (stdlib -> external -> internal `src.*`).
    *   A relevant module-level docstring.
    *   Functions/classes moved from the original file.
    *   Proper type hints and Google-style docstrings for public elements.
4.  **Update Original Module:** Modify the original file (`$ARGUMENTS[0]`) to:
    *   Remove the code that was moved to new modules.
    *   Add necessary `import` statements to import the moved functionality from the new modules.
    *   Retain any code that logically still belongs in the original file. If the original file becomes just imports/exports, that's acceptable.
5.  **Update Importing Modules:** Identify other files within the codebase that might have imported functions/classes directly from the *original* file (`$ARGUMENTS[0]`). Update their import statements to point to the *new* locations of the moved code. *(Self-Correction: You might need to search the codebase for imports referencing the original file path.)*
6.  **Clean Up Imports:** In *all* modified and new files, remove any unused imports.
7.  **Identify Unused Code (Do Not Delete):** After refactoring, carefully review the original file (`$ARGUMENTS[0]`) and the new files. Identify any helper functions or classes that are *no longer called or imported* anywhere. List these potentially unused elements separately – **DO NOT delete them automatically.**
8.  **Adhere to Project Standards:** Ensure all new and modified code adheres to the principles in `CLAUDE.md` (SRP, PEP 8, naming conventions, type hints, docstrings).
9.  **Output:** Provide the following:
    *   The **full contents** for each **new file created**, clearly indicating the file path (e.g., `src/core/api/utils/request_builder.py`).
    *   The **full contents** of the **modified original file** (`$ARGUMENTS[0]`).
    *   The **full contents** of any **other files whose imports were updated**.
    *   A list of functions/classes identified as potentially unused after the refactoring.

*Self-Correction Reminder: The primary goal is structural improvement via SRP. Ensure the refactoring maintains the original functionality. External callers importing from the original module should ideally continue to work or have their imports clearly updated. This might require multiple interactions if the file is large or complex.*