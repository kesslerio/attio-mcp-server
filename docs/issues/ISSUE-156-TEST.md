# Claude Desktop Prompt for Testing Issue #156 (update-company-attribute)

I need to test if your update-company-attribute tool is working correctly. Previously it was failing with "Tool handler not implemented" error because there was no handler for the 'updateAttribute' toolType in the dispatcher.

First, please create a test company with these details:
- Name: Attribute Update Test
- Industry: Initial Industry Value
- Website: https://initial-attribute.example.com
- Description: Initial description text

After creating this company, please make note of its ID. Now I'd like you to perform several attribute updates using the update-company-attribute tool:

1. Update the industry attribute:
   - Company ID: (use the ID from the created company)
   - Attribute Name: industry
   - Value: Updated Industry via Attribute Tool

2. Update the website attribute:
   - Company ID: (use the ID from the created company)
   - Attribute Name: website
   - Value: https://updated-attribute.example.com

3. Clear an attribute by setting it to null:
   - Company ID: (use the ID from the created company)
   - Attribute Name: description
   - Value: null

After each update, please show me the response from the tool. Then retrieve the company and show me its current attributes to verify the changes were made correctly.

Finally, please try these edge cases and show me how the tool responds:
1. Try updating with a missing companyId
2. Try updating with a missing attributeName
3. Try updating with a non-existent company ID
4. Try updating a non-existent attribute

This will help me verify that the update-company-attribute tool is now properly implemented and handles all cases correctly.