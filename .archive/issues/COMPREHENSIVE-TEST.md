# Claude Desktop Prompt for Comprehensive Testing of Company Tools

I need to perform a comprehensive end-to-end test of the Attio company tools that were recently fixed. Please help me test all of these tools together in a single workflow to ensure they're working correctly. Follow these steps in order:

## Step 1: Batch Create Companies
Create these three test companies using the batch-create-companies tool:
- Company A: Name "Comprehensive Test A", Industry "Technology", Website "https://test-a.example.com"
- Company B: Name "Comprehensive Test B", Industry "Healthcare", Website "https://test-b.example.com"
- Company C: Name "Comprehensive Test C", Industry "Finance", Website "https://test-c.example.com"

Show me the full response and save the company IDs for later steps.

## Step 2: Get Company Information
For Company A:
- Get its basic information using get-company-basic-info
- Get its business information using get-company-business-info
- Get specific fields (name, industry, website) using get-company-fields

Show me the responses from each of these tools.

## Step 3: Update Companies
Use batch-update-companies to update Companies A and B with these changes:
- Company A: Change Industry to "Updated Technology" and add Description "This was updated in batch"
- Company B: Change Industry to "Updated Healthcare" and add Description "This was also batch updated"

Show me the full response and verify the changes were successful.

## Step 4: Update Single Attribute
Use update-company-attribute to change Company C's industry to "Updated Finance Sector".

Show me the full response and verify the change was successful.

## Step 5: Create List and Add Companies
- Create a new list called "Comprehensive Test List"
- Add all three companies to this list using add-record-to-list
- Verify the companies were added by retrieving the list entries

Show me the responses from each step.

## Step 6: Update Full Company
Use update-company to update Company A with these changes:
- Description: "This was updated with the update-company tool"
- Website: "https://updated-comprehensive.example.com"
- Add a new field: Employees = 500

Show me the full response and verify all changes were successful.

## Step 7: Final Verification
Get the complete details of all three companies and show me their current attributes to verify that all changes from the previous steps were saved correctly.

This comprehensive test will verify that all the recently fixed tools work correctly together in a realistic workflow.