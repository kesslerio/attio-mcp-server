## Bug/UX Enhancement Description

The `create-company` CLI command fails when using category options that don't actually exist in the Attio schema, even if they seem logical or were previously documented. This creates a poor user experience and highlights the need for better option discovery and error handling.

## Steps to Reproduce

1. Run the create-company command with a logical but invalid category
2. Use the following request data:

```json
{
  "attributes": {
    "name": "The Plastics Doc",
    "website": "https://www.theplasticsdoc.com",
    "categories": ["Medical Practice"],  // ❌ This seems logical but doesn't exist
    "description": "Plastic surgery and medical spa practice led by board-certified plastic surgeon Dr. Samuel Salcedo. Specializes in breast augmentation, liposuction, body contouring, and comprehensive aesthetic treatments in Corona, CA."
  }
}
```

## Expected Behavior

One of the following should happen:
1. **Fuzzy Matching**: Suggest similar valid options (e.g., "Health Care" for "Medical Practice")
2. **Option Discovery**: Provide a way to list all valid category options
3. **Dynamic Creation**: Allow creating new categories if they don't exist (if Attio API supports it)
4. **Better Error Messages**: Include list of valid options in error response

## Actual Behavior

The command fails with an unhelpful error:

```
ERROR [unknown_error]: Company create failed: Bad Request: Cannot find select option with title "Medical Practice".
```

## Error Details

- **Method**: POST
- **URL**: /objects/companies/records
- **Status**: Unknown
- **Headers**: {}
- **Data**: {}
- **Raw Error**: `{"name":"CompanyOperationError"}`

## Technical Analysis

This issue reveals several systemic UX problems:

1. **Documentation Reliability**: Even documented options may not exist in the actual schema
2. **Option Discovery Gap**: No easy way for users to discover valid categories
3. **Poor Error Messages**: Errors don't provide constructive guidance
4. **Missing Fuzzy Matching**: System doesn't suggest similar valid options
5. **Static Options**: No apparent way to create new categories dynamically

## Current Valid Categories (verified)

- `"Health Care"` ✅
- `"B2C"` (Business to Consumer) ✅
- `"E-commerce"` ✅
- `"Sports & Fitness"` ✅
- `"Health & Wellness"` ✅
- `"Physical Therapy"` ✅

## Invalid Categories (cause errors)

- ~~`"Medical Practice"`~~ ❌ (Use "Health Care" instead)

## Suggested Enhancements

### 1. **Fuzzy Matching Feature**
When an invalid option is provided, suggest similar valid options:
```
Error: "Medical Practice" not found. Did you mean:
- "Health Care" (similarity: 0.8)
- "Health & Wellness" (similarity: 0.6)
```

### 2. **Option Discovery Tool**
Create a CLI command to list valid options:
```bash
# List all valid categories
attio-cli list-category-options

# Search categories
attio-cli search-category-options "medical"
```

### 3. **Better Error Messages**
Include available options in error responses:
```
Error: "Medical Practice" not found. 
Valid categories: Health Care, B2C, E-commerce, Sports & Fitness, Health & Wellness, Physical Therapy
```

### 4. **Dynamic Category Creation** (if API supports)
Allow creating new categories when they don't exist:
```bash
attio-cli create-category-option "Medical Practice"
```

## Immediate Workaround

Use "Health Care" instead of "Medical Practice" for medical businesses:
```json
{
  "attributes": {
    "categories": ["Health Care"],  // ✅ CORRECT
    "name": "The Plastics Doc"
  }
}
```

## Priority

**High** - This affects user onboarding and creates frustration when logical options don't work

## Impact

- Poor user experience with unclear error messages
- Time wasted guessing valid options
- Potential data quality issues from using incorrect categories
- Documentation maintenance burden

## Related Enhancements

This pattern likely affects other select fields like:
- `facilities` options
- `type_persona` options  
- `referrer` options

Consider implementing similar improvements across all select fields.

## Technical Investigation Needed

1. **Explore Attio API**: Check if category options can be dynamically created
2. **Fuzzy Matching Library**: The user mentioned there's already a library used for `type_persona` - investigate reusing it
3. **Option Discovery**: Build tools to automatically discover valid options for all select fields 