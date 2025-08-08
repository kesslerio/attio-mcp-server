# Claude Desktop Prompt for Testing Issue #157 (add-record-to-list)

I need to test if your add-record-to-list tool is working correctly. Previously it was failing with validation errors due to incorrect payload formatting.

Please follow these steps to test this functionality:

1. First, create a test company with these details:
   - Name: List Addition Test Company
   - Industry: Test Industry
   - Website: https://list-test.example.com

2. Create a new list with these details:
   - Name: Test List for Issue 157
   - Description: A test list for validation

3. Add the company to the list using the add-record-to-list tool. Make sure to include:
   - List ID: (use the ID from the created list)
   - Record ID: (use the ID from the created company)
   - Record Type: company (or the appropriate record type parameter)

4. Show me the complete response from the add-record-to-list tool.

5. Verify that the company was added to the list by getting the list entries and showing me that the company appears in the list.

Then, please try these edge cases and show me how the tool responds:
1. Try adding to the list with a missing listId
2. Try adding with a missing recordId
3. Try adding with a missing recordType
4. Try adding a record to a non-existent list
5. Try adding a non-existent record to a list
6. Try adding the same record to the list again (should either succeed or indicate it's already in the list)

This will help me verify that the add-record-to-list tool now correctly handles all parameter formats and validation cases.