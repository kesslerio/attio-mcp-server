# Claude Desktop Prompt for Testing Issue #153 (batch-create-companies)

I need to test if your batch-create-companies tool is working correctly. Previously it was failing with a "Cannot read properties of undefined (reading 'map')" error.

Please create multiple test companies for me with the following details:

Company 1:
- Name: Test Company Alpha 
- Industry: Technology
- Website: https://alpha-test.example.com
- Description: This is a test company for batch creation

Company 2:
- Name: Test Company Beta
- Industry: Healthcare
- Website: https://beta-test.example.com
- Description: Another test company for batch operations

Company 3:
- Name: Test Company Gamma
- Industry: Finance
- Website: https://gamma-test.example.com
- Description: Third test company for verification

After creating these companies, please show me the full response from the batch-create-companies tool so I can verify it worked correctly.

Then please try creating an empty array of companies and show me how the tool handles this edge case.

Finally, can you also try creating a company with a missing required field (like name) to see if proper validation is happening?