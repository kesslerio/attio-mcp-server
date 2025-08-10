# Claude Desktop Prompt for Testing Issue #154 (batch-update-companies)

I need to test if your batch-update-companies tool is working correctly. Previously it was failing with a "Cannot read properties of undefined (reading 'map')" error.

First, please create two test companies with these details:

Company 1:
- Name: Batch Update Test A
- Industry: Original Industry A
- Website: https://original-a.example.com

Company 2:
- Name: Batch Update Test B
- Industry: Original Industry B
- Website: https://original-b.example.com

After creating these companies, please make note of their IDs. Now I'd like you to use the batch-update-companies tool to update both companies at once with these changes:

Updates for Company 1:
- Industry: Updated Industry A
- Description: This description was added in a batch update

Updates for Company 2:
- Industry: Updated Industry B
- Description: This company was also updated in a batch operation

Please show me the full response from the batch-update-companies tool.

After updating, please verify the changes were successful by retrieving both companies and showing their updated attributes.

Then, please try these edge cases and show me how the tool responds:
1. Attempt a batch update with an empty updates array
2. Try updating with a missing ID for one of the companies
3. Try updating with a non-existent company ID