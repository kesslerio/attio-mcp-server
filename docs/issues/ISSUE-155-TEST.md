# Claude Desktop Prompt for Testing Issue #155 (update-company)

I need to test if your update-company tool is working correctly with the expected parameter format. Previously it had validation errors when receiving parameters in the format expected by the MCP protocol.

First, please create a test company with these details:
- Name: Update Test Company
- Industry: Initial Industry
- Website: https://initial.example.com

After creating this company, please make note of its ID. Now I'd like you to use the update-company tool to update it with these changes:

- Industry: Updated Industry Value
- Description: This is a new description added during an update
- Employees: 150
- Founded: 2023-01-01

Please use the MCP protocol format where you pass a companyId parameter and a separate attributes object containing the fields to update.

After updating, please retrieve the company and show me its updated attributes to verify the changes were successful.

Then, please try these edge cases and show me how the tool responds:
1. Try updating with a missing companyId
2. Try updating with missing attributes
3. Try updating with attributes that aren't in an object format
4. Try updating a company that doesn't exist

This will help me verify that the tool correctly handles all parameter formats and validation cases.