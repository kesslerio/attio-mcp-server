# Claude Desktop Prompt for Testing Issue #153 (batch-create-companies)

I need to test and diagnose the batch-create-companies tool which is still failing with the error "Cannot read properties of undefined (reading 'map')".

When you try to use this tool, it's showing URLs like "objects/undefined/records/batch", suggesting the object type isn't being properly passed.

Please help me diagnose by:

1. First, checking the specific response URLs for these requests:
   - Create a single company with create-company
   - Use batch-create-companies
   
   In both cases, note what appears in place of "undefined" in the URL path.

2. Try creating an array of companies with the batch-create-companies tool using this exact format:
```
{
  "companies": [
    {
      "name": "API Debug Company A",
      "industry": "Technology"
    },
    {
      "name": "API Debug Company B",
      "industry": "Finance"
    }
  ]
}
```

3. Then try directly passing the companies array without the "companies" key wrapper:
```
[
  {
    "name": "Direct Array Company A",
    "industry": "Technology"
  },
  {
    "name": "Direct Array Company B",
    "industry": "Finance"
  }
]
```

4. If both of those fail, try this format explicitly specifying the resource type:
```
{
  "objectSlug": "companies",
  "companies": [
    {
      "name": "Resource Type Company A",
      "industry": "Technology"
    },
    {
      "name": "Resource Type Company B",
      "industry": "Finance"
    }
  ]
}
```

For each attempt, show me:
- The exact API URL that shows in the error
- The complete error message
- The request format you used

This will help identify if this is a parameter format issue, a resource type issue, or something deeper in the handler implementation.