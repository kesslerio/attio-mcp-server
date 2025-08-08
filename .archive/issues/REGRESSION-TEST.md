# Claude Desktop Prompt for Regression Testing of Company Tools

I need to perform thorough regression testing of the Attio company tools that were recently fixed (Issues #153-#157). Please help me systematically verify that each fixed tool works correctly and that there are no regressions or new issues.

I'd like to test each tool with both valid cases and edge cases to ensure robust validation and error handling. Please work through each section in order:

## Section 1: Company Creation Tests

1. Create a basic company with these details:
   - Name: "Regression Test Alpha"
   - Industry: "Technology"
   - Website: "https://regression-alpha.example.com"

2. Use batch-create-companies to create two more companies:
   - Company Beta: Name "Regression Test Beta", Industry "Healthcare"
   - Company Gamma: Name "Regression Test Gamma", Industry "Finance"

3. Try these edge cases and show me how they're handled:
   - Create company with missing name
   - Batch create with empty array
   - Batch create with non-array input

## Section 2: Company Information Retrieval

1. For one of the companies, please:
   - Get basic info
   - Get business info
   - Get specific fields (name, industry, website)

2. Try these edge cases:
   - Get company with missing ID
   - Get fields without specifying which fields
   - Get company with non-existent ID

## Section 3: Company Update Tests

1. Update a company with new values:
   - Find "Regression Test Alpha"
   - Update its industry to "Updated Technology" and add description

2. Use batch-update-companies to update both Beta and Gamma:
   - Change industries to "Updated Healthcare" and "Updated Finance"
   - Add descriptions to both

3. Use update-company-attribute to make a single attribute change:
   - For Alpha, change website to "https://updated-regression.example.com"

4. Try these edge cases:
   - Update with missing ID
   - Update with non-existent ID
   - Update attribute with missing attribute name
   - Batch update with missing attributes

## Section 4: List Operation Tests

1. Create a list called "Regression Test List"

2. Add all three companies to the list

3. Verify the list contains all companies

4. Try these edge cases:
   - Add to list with missing list ID
   - Add to list with missing record ID
   - Add to list with missing record type
   - Add the same record twice

## Section 5: Final Verification

1. Get all three companies and show their current attributes

2. Verify all updates from previous steps were applied correctly

3. Show a summary of all test results:
   - How many tests passed
   - Any tests that failed
   - Any unexpected behaviors

This comprehensive regression test will help ensure all fixed issues remain resolved and no new issues have been introduced.