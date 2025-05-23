## Bug/UX Issue Description

The `create-company` and `update-company` CLI commands fail when the `categories` field is provided as a string instead of an array. The error message clearly indicates the type mismatch, but this is a common user error that suggests the field definition may not be intuitive.

## Steps to Reproduce

1. Run the create-company command with categories as a string value
2. Use the following request data:

```json
{
  "attributes": {
    "city": "Corona",
    "name": "The Plastics Doc",
    "state": "CA",
    "website": "https://www.theplasticsdoc.com",
    "services": "Plastic Surgery, Medical Spa, Liposuction, Body Contouring, Breast Augmentation",
    "categories": "Medical Practice",  // ❌ INCORRECT - string instead of array
    "lead_score": "Priority Demo",
    "description": "Plastic surgery and medical spa practice led by board-certified plastic surgeon Dr. Samuel Salcedo...",
    "postal_code": "92584",
    "street_address": "4226 Green River Rd",
    "has_body_contouring": true,
    "has_weight_loss_program": true
  }
}
```

## Expected Behavior

One of the following should happen:
1. **Clear Documentation**: CLI help should specify that categories must be an array
2. **Auto-conversion**: System could automatically convert single string values to arrays
3. **Better Error Guidance**: Error message could suggest the correct format
4. **Input Validation**: Pre-submission validation could catch and correct this

## Actual Behavior

The command fails with a type error:

```
ERROR [unknown_error]: Invalid company data: Field 'categories' must be of type array, but got string
```

## Error Details

- **Method**: POST
- **URL**: /objects/companies/records
- **Status**: Unknown
- **Headers**: {}
- **Data**: {}
- **Raw Error**: `{"name":"InvalidCompanyFieldTypeError"}`

## Technical Analysis

This issue highlights a field definition that conflicts with user intuition:

1. **Field Name Suggests Multiple Values**: The plural "categories" suggests it accepts multiple values, which users might expect to provide as an array
2. **Common Single-Value Use Case**: Many companies have only one primary category, making string input feel natural
3. **Inconsistent with Other Fields**: Other fields like `services` accept strings for multiple items (comma-separated)

## Solution

The correct format is:

```json
{
  "attributes": {
    "categories": ["Medical Practice"]  // ✅ CORRECT - array with single value
  }
}
```

Or for multiple categories:
```json
{
  "attributes": {
    "categories": [
      "Health Care",
      "Medical Practice", 
      "B2C"
    ]  // ✅ CORRECT - array with multiple values
  }
}
```

## Valid Categories Options

Based on the ShapeScale CRM:
- `"Health Care"`
- `"B2C"` (Business to Consumer)
- `"E-commerce"`
- `"Sports & Fitness"`
- `"Health & Wellness"`
- `"Medical Practice"`
- `"Physical Therapy"`

## Suggested Improvements

1. **CLI Input Validation**: Add pre-submission validation that converts single strings to arrays
2. **Better Documentation**: CLI help should clearly state array requirement
3. **Error Message Enhancement**: Include example of correct format in error message
4. **Consider Field Design**: Evaluate if this field should accept both string and array inputs

## Priority

**Medium** - This is a common user error that affects onboarding and user experience

## Related Issues

- Field type validation issues across multiple CLI commands
- General need for better input validation and user guidance 