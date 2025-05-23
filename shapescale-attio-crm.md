# ShapeScale Attio CRM Setup Guide

This document provides a detailed overview of our custom Attio CRM setup for ShapeScale, including available attributes, field types, and common issues when interacting with these fields.

> **Note:** The MCP server uses `config/field-mappings.json` to map friendly attribute names to our custom fields. For example, `industry` inputs are mapped to the `type_persona` select field in this workspace.

## Custom Attributes

Based on the API interactions, our Attio instance has the following custom attributes for company records:

### Custom Fields (28 total)

| Field Name                           | Type          | Notes                                                                    |
| ------------------------------------ | ------------- | ------------------------------------------------------------------------ |
| body_composition_technologies        | text (string) | Describes what technologies a company uses for body composition analysis |
| body_contouring                      | text (string) | Details about body contouring services offered                           |
| company_phone_5                      | text (string) | Phone number field, likely the fifth phone number for a company          |
| competitor_use                       | select        | Information about competitors they use                                   |
| domain_confidence                    | number        | Confidence level in the domain information (0-100%)                      |
| facilities                           | select        | Number of facilities (options include "1")                               |
| google_business_name                 | text (string) | Business name on Google                                                  |
| google_business_status               | select        | Business status on Google (e.g., "operational", "closed")                |
| google_credibility_score             | number        | Credibility score from Google                                            |
| google_maps_url                      | text (string) | Google Maps URL                                                          |
| google_price_level                   | select        | Price level indicator from Google (e.g., "$", "$$", "$$$")               |
| google_rating_1                      | number        | Google rating (usually 1-5)                                              |
| google_review_count_7                | number        | Number of Google reviews                                                 |
| google_website                       | text (string) | Website listed on Google                                                 |
| has_before_after_photos              | boolean       | Whether they have before/after photos                                    |
| has_body_contouring                  | boolean       | Whether they offer body contouring services                              |
| has_weight_loss_program              | boolean       | Whether they have a weight loss program                                  |
| referrer                             | select        | Referral source information (options include "Website", "Virtual Demo")  |
| referrer_notes                       | text (string) | Notes about referrals                                                    |
| regions                              | text (string) | Geographic regions served                                                |
| services                             | text (string) | Comprehensive list of services offered                                   |
| strongest_connection_strength_legacy | number        | Legacy field for connection strength                                     |
| trade_show_event_7                   | select        | Trade show/event information                                             |
| type_persona                         | select        | Company persona type (options include "Plastic Surgeon")                 |
| type_persona_5                       | select        | Alternative persona classification                                       |
| typpe                                | select        | Company type classification (options include "Potential Customer")       |
| uses_body_composition                | boolean       | Whether they use body composition analysis                               |
| uses_competitor_products             | boolean       | Whether they use competitor products                                     |

### Key Field Values and Options

Based on our analysis, we've identified some important field values used in the CRM:

#### Company Type ("typpe")

The "typpe" field is a select field used to categorize companies by their relationship with ShapeScale:

- "Existing Customer" - Current users of ShapeScale products
- "Potential Customer" - Prospects in the sales pipeline
- "Previous Customer" - Former customers who may be targets for re-engagement
- "Distributor" - Companies that distribute fitness or body composition equipment
- "Sales Representative" - Independent sales agents representing ShapeScale
- "Industry Affiliate" - Companies in related industries that may collaborate
- "Connector" - Individuals or organizations that facilitate introductions
- "Potential Partner" - Companies being evaluated as potential business partners
- "Channel Partner" - Organizations that resell or promote ShapeScale through established channels
- "Investor" - Financial stakeholders in the company
- "Research Partner" - Academic or institutional collaborators on research initiatives
- "Other" - Miscellaneous relationships that don't fit other categories
- "TBD" - Relationship status to be determined

The unusual spelling "typpe" (with double 'p') appears to be intentional to distinguish it from other "type" fields in the system.

#### Type Persona

The "type_persona" field categorizes companies by their business type or specialty:

##### Medical & Health Categories

- "Plastic Surgeon" - Medical specialists offering cosmetic and reconstructive procedures
- "Medical Spa/Aesthetics" - Businesses offering medical-grade aesthetic services
- "Medical Weight Loss" - Practices specializing in weight loss under medical supervision
- "Weight Management" - Programs focused on weight control and management
- "Integrated Health" - Providers combining conventional and alternative medicine approaches
- "Pain Management" - Specialists in treating acute or chronic pain
- "Medical/Healthcare" - General medical or healthcare services
- "Physio/Chiro/Recov" - Physical therapy, chiropractic, or recovery services
- "Wellness" - Holistic health and well-being providers

##### Fitness Categories

- "Personal Trainer/Solo Owner" - Individual fitness professionals
- "PT Gym" - Personal training-focused facilities
- "Boutique/Studio Gym" - Specialized, smaller fitness facilities
- "Franchise Gym" - Chain fitness locations operating under a franchise model
- "Big Box Gym" - Large-scale commercial fitness centers
- "Athletic Team/Professional Athlete" - Sports teams or individual athletes
- "Corporate Wellness" - Wellness programs for corporate environments
- "Corporate, Residential, or Hotel Facility" - Fitness facilities in these settings

##### Industry Partners

- "Equipment Manufacturer" - Makers of fitness or body composition equipment
- "Distributor or Retailer" - Companies that distribute or sell fitness equipment
- "Consultant" - Advisory professionals in the industry
- "Sales Representative" - Independent sales agents
- "Influencer/Connector" - Individuals with significant industry influence
- "Supplier" - Providers of components or materials
- "Retail/Nutrition Store" - Retail locations specializing in nutrition products

##### Knowledge & Research

- "University/Research" - Academic or research institutions
- "Educational Platform" - Organizations providing educational content
- "Professional Association/Network" - Industry groups and networks

##### Other Categories

- "Event/Conference Organizer" - Companies that run industry events
- "Industry Media/Publication" - Media outlets focusing on the industry
- "Spa" - Non-medical spa facilities
- "Other (Software)" - Software companies relevant to the industry
- "Other" - Generic categorization for businesses that don't fit standard categories
- "Unknown" - Companies whose type has not yet been determined

#### Referrer

- "Website" - Lead came through the website
- "Virtual Demo" - Lead came through a virtual demo session
- (Other options may exist)

#### Categories

- "Health Care"
- "B2C"
- "E-commerce"

### Standard Fields (43 total)

The CRM also includes 43 standard fields like:

- about
- description
- website
- social media fields (facebook, twitter, instagram, linkedin, etc.)
- location fields (country, city, state, etc.)
- interaction data (first_interaction, last_interaction, etc.)
- company metadata (employee_range, estimated_arr_usd, etc.)

## Type Handling Issues

When updating boolean fields, the API requires actual boolean values (not string representations). The following attempts failed:

```
update-company-attribute Request{
  `value`: `No`,
  `companyId`: `724955fd-51a1-5eef-94d6-8de42c6a82c8`,
  `attributeName`: `uses_body_composition`
}

ERROR: Invalid company data: Field 'uses_body_composition' must be of type boolean, but got string
```

```
update-company-attribute Request{
  `value`: `false`,
  `companyId`: `724955fd-51a1-5eef-94d6-8de42c6a82c8`,
  `attributeName`: `uses_body_composition`
}

ERROR: Invalid company data: Field 'uses_body_composition' must be of type boolean, but got string
```

### Strict Type Handling

The Attio API is very strict about field types:

1. Boolean fields must receive actual boolean values, not strings
2. Select fields must receive valid option objects or IDs
3. Text fields receive strings
4. Number fields receive numeric values

## Lists in Attio

Our Attio instance contains numerous lists for organizing companies and people, including:

- Prospecting (ID: 88709359-01f6-478b-ba66-c07347891b6f)
- Referrals (ID: be7680c9-5b78-4b08-8557-aeec1ac1023d)
- Partnerships (ID: 9ca76784-1a5a-493c-b36c-a96ca260c781)
- Event-specific lists (e.g., ASAPS 2025, CryoCon 2024)
- Geographical lists (e.g., Weight Loss Management (SF Bay))
- Functional lists (e.g., Customer Success, Ambassadors)
- Data collection lists

Each list has entries with unique entry IDs referencing company or people records. The Prospecting list appears to be used for tracking potential customers at various stages of the sales process. Companies in this list often have the "typpe" attribute set to "Potential Customer" and may include additional information about their services and business details.

### List Structure Limitations

One notable limitation is that the Attio MCP server doesn't currently offer a way to easily determine which lists a specific company or person belongs to. This makes it difficult to understand a record's position in various pipelines and workflows without manually checking each list.

## API Integration Issues

When interacting with the Attio API through the MCP server, several issues were discovered:

1. **Tool Availability Problems**: Some tools may return errors or be unavailable.
2. **Value Type Conversion**: The API returns errors when a string representation of a boolean is passed rather than a native boolean.
3. **Attribute Existence Checks**: Always verify attributes exist before updating.

### Recommendations for LLM Instructions

When providing instructions to an LLM that interacts with this Attio MCP server:

1. **Type Enforcement**: For boolean fields, explicitly send boolean values (true/false), not strings ("true"/"false").

   ```javascript
   // Correct
   { "value": false, ... }

   // Incorrect
   { "value": "false", ... }
   ```

2. **Attribute Name Verification**: Before trying to update a field, verify that the field exists using the discover-company-attributes endpoint.

3. **Fields Existence**: Some fields have variable existence. For example, "body_composition" doesn't exist but "body_composition_technologies" and "uses_body_composition" do.

4. **Structured Data**: Consider providing a schema of available attributes in your prompt, especially for complex objects or when specific formatting is required.

5. **Error Handling**: Implement error handling that can interpret Attio API errors, especially for type mismatches.

6. **Backend Validation**: Consider adding backend validation to convert string booleans to actual booleans.

## Common Use Patterns

For ShapeScale's use case, we track:

1. Whether a company uses body composition technology
2. What specific body composition technologies they use
3. Details about their body contouring services
4. Complete service offerings
5. Whether they're using competitor products

This information helps determine if a client would benefit from ShapeScale's 3D body scanning technology as a complement to their existing services.

## Example Record

Here's an example of a company record in our CRM (The Plastics Doc):

```json
{
  "name": "The Plastics Doc",
  "typpe": "Potential Customer",
  "type_persona": "Plastic Surgeon",
  "referrer": "Website",
  "domains": ["theplasticsdoc.com"],
  "facilities": "1",
  "description": "The Plastics Doc offers plastic surgery procedures including eyelid lift, BOTOX®, breast augmentation, and liposuction in Corona, CA and surrounding areas.",
  "services": "Comprehensive plastic surgery and med spa services including: breast augmentation with fat grafting, breast lifts, facelifts, tummy tucks, BodySculpt™ liposuction, neurotoxins (Botox), dermal fillers, liquid rhinoplasty, chemical peels, microneedling with red light therapy, lymphatic drainage massage, and post-surgical body contouring.",
  "body_contouring": "Comprehensive body contouring services including liposuction (BodySculpt™), tummy tucks with waist tucks, arm lifts, and thigh contouring.",
  "body_composition_technologies": "The practice primarily uses visual assessment and traditional measurements. They currently do not utilize any advanced body composition analysis technologies or 3D imaging for body composition.",
  "primary_location": "Corona, California US"
}
```

## Pipeline and Sales Process

Based on our analysis of the codebase and the Attio API documentation, the Attio CRM supports tracking prospects through sales pipelines using list entries with stage attributes.

### Standard Stage Attribute

According to the Attio API documentation, "stage" is a **standard attribute type** for list entries. This is a built-in feature of Attio lists that allows tracking the progression of records through different stages of a process.

### ShapeScale Prospecting List Stages

The **Prospecting list** (ID: 88709359-01f6-478b-ba66-c07347891b6f) in our ShapeScale Attio instance uses a **custom stage configuration** with the following stage options:

#### Current Stage Options:

1. `"Unresponsive"` - Prospects who haven't responded to outreach
2. `"Interested"` - Prospects who have shown initial interest
3. `"Discovery Call"` - Scheduled or completed discovery calls
4. `"On Demand Demo"` - Self-service demo requests
5. `"Demo Scheduling"` - Actively scheduling product demonstrations
6. `"Demo"` - Scheduled or completed product demonstrations
7. `"Demo - No Shows"` - Prospects who missed their demo appointments
8. `"No Shows - Followed Up"` - No-shows that have been re-contacted
9. `"Post-Demo Follow Up"` - Following up after completed demos
10. `"Negotiation"` - Active contract or pricing discussions
11. `"Won"` - Successfully closed deals
12. `"Pause/Nurture"` - Prospects in long-term nurturing
13. `"Lost"` - Opportunities that didn't convert
14. `"Not a fit"` - Prospects determined to be unsuitable

**Note**: These are custom stage values specific to the ShapeScale Prospecting list and are **not** the standard Attio pipeline stages. Each list can have its own custom stage configuration.

### Stage Management Challenges

Currently, the Attio MCP server lacks the tools to:

- Update list entry stage values (e.g., changing from "Interested" to "Demo Scheduling")
- Read current stage values for list entries
- Filter list entries by stage
- Track stage progression history

This represents a significant gap in CRM functionality, as stage management is essential for sales pipeline operations.

## Known Bugs and Issues

1. Boolean field updates fail when passing string values like "false" or "No" (Issue #178)
2. get-list-details tool fails with API errors (Issue #179)
3. advanced-search-companies tool fails with API errors (Issue #182)
4. get-company-attributes tool fails with API errors (Issue #183)
5. Missing attribute validation before updates can cause errors (Issue #181)
6. Resolved: use the `get-company-lists` tool to see which lists a company belongs to (Issue #184)
7. Type checking in the MCP server appears inconsistent
8. Intermittent connectivity issues with certain tools
9. **Facilities Field Select Options Issue**: Using incorrect values for the `facilities` select field causes API errors
10. **Categories Field Array Type Issue**: The `categories` field must be an array, not a string
11. **Postal Code Field Mapping Issue**: Using `postal_code` field causes "Cannot find attribute with slug/ID 'zip'" error
12. **Invalid Category Options Issue**: Some documented category options don't actually exist, causing "Cannot find select option" errors

### Facilities Field Select Options Issue

**Issue**: The `facilities` field is a select field with specific predefined options. Using incorrect values causes API errors.

**Error Example**:

```
Request

{
  "companyId": "d5cda19b-b316-5453-ae0d-c7cb3ec29ef2",
  "attributes": {
    "website": "https://ptsolutionsks.com",
    "services": "Physical Therapy, Orthopedic Rehabilitation, Sports Medicine, Concussion Care, Outpatient Therapy",
    "categories": [
      "Physical Therapy"
    ],
    "facilities": "2-5 locations in Kansas",  // ❌ INCORRECT - descriptive text
    "type_persona": "Medical Practice",
    "employee_range": "10-25",
    "body_contouring": "No",
    "foundation_date": "2012",
    "uses_body_composition": "No",
    "has_weight_loss_program": "No"
  }
}

Response: ERROR [unknown_error]: Company update failed for company d5cda19b-b316-5453-ae0d-c7cb3ec29ef2: Bad Request: Cannot find select option with title "2-5 locations in Kansas".
```

**Solution**: Use only the predefined select options for the `facilities` field:

#### Valid Facilities Options:

- `"1"` - Single location
- `"2-5"` - 2-5 locations
- `"6-10"` - 6-10 locations
- `"11-25"` - 11-25 locations
- `"26-50"` - 26-50 locations
- `"51-100"` - 51-100 locations
- `"101-250"` - 101-250 locations
- `"251+"` - 251+ locations
- `"Unknown"` - Unknown number of locations

**Correct Usage**:

```json
{
  "companyId": "d5cda19b-b316-5453-ae0d-c7cb3ec29ef2",
  "attributes": {
    "website": "https://ptsolutionsks.com",
    "services": "Physical Therapy, Orthopedic Rehabilitation, Sports Medicine, Concussion Care, Outpatient Therapy",
    "categories": ["Physical Therapy"],
    "facilities": "2-5", // ✅ CORRECT - use exact option value
    "type_persona": "Medical Practice",
    "employee_range": "10-25",
    "body_contouring": "No",
    "foundation_date": "2012",
    "uses_body_composition": "No",
    "has_weight_loss_program": "No"
  }
}
```

**Key Points**:

1. Always use the exact option value, not descriptive text
2. The `facilities` field expects a string value matching one of the predefined options
3. Geographic information (like "in Kansas") should be stored in location fields, not the facilities count field

### Categories Field Array Type Issue

**Issue**: The `categories` field expects an array of strings, not a single string value. Using a string value causes a field type error.

**Error Example**:

```
Request

{
  "attributes": {
    "name": "The Plastics Doc",
    "categories": "Medical Practice",  // ❌ INCORRECT - string value
    "website": "https://www.theplasticsdoc.com"
  }
}

Response: ERROR [unknown_error]: Invalid company data: Field 'categories' must be of type array, but got string
```

**Solution**: Always provide categories as an array of strings, even for single values:

**Correct Usage**:

```json
{
  "attributes": {
    "name": "The Plastics Doc",
    "categories": ["Medical Practice"], // ✅ CORRECT - array with single value
    "website": "https://www.theplasticsdoc.com"
  }
}
```

**Multiple Categories Example**:

```json
{
  "attributes": {
    "name": "The Plastics Doc",
    "categories": ["Health Care", "Medical Practice", "B2C"], // ✅ CORRECT - array with multiple values
    "website": "https://www.theplasticsdoc.com"
  }
}
```

#### Valid Categories Options:

- `"Health Care"`
- `"B2C"` (Business to Consumer)
- `"E-commerce"`
- `"Sports & Fitness"`
- `"Health & Wellness"`
- `"Physical Therapy"`

**Note**: ~~`"Medical Practice"`~~ was previously listed here but is NOT a valid option - this causes a "Cannot find select option" error.

**Key Points**:

1. Categories field type is **array**, not string
2. Always wrap category values in square brackets `[]`
3. Single categories still need to be in an array format: `["Health Care"]`
4. Multiple categories can be provided: `["Health Care", "B2C", "Sports & Fitness"]`
5. This is one of the most common field type errors in company creation/updates
6. **Invalid category options cause "Cannot find select option" errors** - validate options before use

### Postal Code Field Mapping Issue

**Issue**: The `postal_code` field causes an error claiming that the "zip" attribute cannot be found, suggesting there's a field mapping issue or the wrong field name is being used.

**Error Example**:

```
Request

{
  "attributes": {
    "city": "Corona",
    "name": "The Plastics Doc",
    "state": "CA",
    "website": "https://www.theplasticsdoc.com",
    "postal_code": "92584",  // ❌ User provides postal_code
    "street_address": "4226 Green River Rd",
    // ... other fields
  }
}

Response: ERROR [unknown_error]: Company create failed: Bad Request: Cannot find attribute with slug/ID "zip".
```

**Problem Analysis**:
The error indicates the system is looking for an attribute called "zip" when the user provides "postal_code". This suggests either:

1. **Incorrect Field Name**: The correct field name should be "zip" instead of "postal_code"
2. **Field Mapping Bug**: Internal mapping from "postal_code" to "zip" is failing
3. **Missing Attribute**: The "zip" attribute doesn't exist in the schema but is being referenced

**Possible Solutions** (need to be tested):

**Option 1 - Use "zip" instead**:

```json
{
  "attributes": {
    "zip": "92584", // ✅ Try using "zip" instead of "postal_code"
    "city": "Corona",
    "state": "CA"
  }
}
```

**Option 2 - Use structured location**:

```json
{
  "attributes": {
    "primary_location": {
      "city": "Corona",
      "state": "CA",
      "postal_code": "92584",
      "street_address": "4226 Green River Rd"
    }
  }
}
```

**Key Points**:

1. Avoid using "postal_code" as a top-level attribute until this is resolved
2. Test with "zip" field name instead
3. Consider using structured location data in "primary_location"
4. This appears to be a field mapping or schema definition bug

### Invalid Category Options Issue

**Issue**: Some category options that appear logical or were previously documented don't actually exist in the Attio schema, causing "Cannot find select option" errors.

**Error Example**:

```
Request

{
  "attributes": {
    "name": "The Plastics Doc",
    "website": "https://www.theplasticsdoc.com",
    "categories": ["Medical Practice"],  // ❌ This option doesn't exist
    "description": "Plastic surgery and medical spa practice..."
  }
}

Response: ERROR [unknown_error]: Company create failed: Bad Request: Cannot find select option with title "Medical Practice".
```

**Problem Analysis**:
This issue highlights several UX and system problems:

1. **Documentation Can Be Wrong**: Even documented options may not exist in the actual schema
2. **No Option Discovery**: Users can't easily discover what category options are available
3. **Poor Error Messages**: Error doesn't suggest valid alternatives
4. **No Fuzzy Matching**: Similar valid options aren't suggested (e.g., "Health Care" instead of "Medical Practice")
5. **No Dynamic Creation**: Users can't create new category options when needed

**Current Verified Valid Categories**:

- `"Health Care"` ✅
- `"B2C"` (Business to Consumer) ✅
- `"E-commerce"` ✅
- `"Sports & Fitness"` ✅
- `"Health & Wellness"` ✅
- `"Physical Therapy"` ✅

**Invalid Categories** (cause errors):

- ~~`"Medical Practice"`~~ ❌ - Use "Health Care" instead

**Suggested User Experience Improvements**:

1. **Fuzzy Matching**: When an invalid option is provided, suggest similar valid options

   ```
   Error: "Medical Practice" not found. Did you mean:
   - "Health Care"
   - "Health & Wellness"
   ```

2. **Dynamic Option Discovery**: API endpoint to list all valid category options

   ```
   GET /categories/options
   ```

3. **Option Creation**: Allow creating new category options through the API (if Attio supports it)

   ```
   POST /categories/options
   { "title": "Medical Practice" }
   ```

4. **Better Error Messages**: Include valid options list in error responses

**Workaround**:
Use "Health Care" instead of "Medical Practice" for medical businesses:

```json
{
  "attributes": {
    "categories": ["Health Care"], // ✅ CORRECT - use valid option
    "name": "The Plastics Doc"
  }
}
```

**Key Points**:

1. Always validate category options against current schema before use
2. When in doubt, use broader categories like "Health Care" instead of specific ones
3. This issue exists for other select fields too (facilities, type_persona, etc.)
4. Consider implementing fuzzy matching and option discovery tools

## ShapeScale-Specific Features

### Medical & Fitness Provider Segmentation

ShapeScale's CRM uses a robust segmentation system for categorizing different types of medical and fitness providers. This segmentation helps tailor marketing messages and sales approaches for different provider types.

The primary segmentation field is "type_persona", which includes a comprehensive set of values organized into categories:

1. **Medical Specialists**:

   - "Plastic Surgeon" - Medical professionals specializing in cosmetic and reconstructive procedures
   - "Medical Spa/Aesthetics" - Businesses offering medical-grade aesthetic services
   - "Medical Weight Loss" - Practices specializing in weight loss under medical supervision
   - "Pain Management" - Specialists in treating acute or chronic pain
   - "Medical/Healthcare" - General medical or healthcare providers
   - "Integrated Health" - Providers combining conventional and alternative medicine

2. **Fitness Professionals**:

   - "Personal Trainer/Solo Owner" - Individual fitness professionals
   - "PT Gym" - Personal training-focused facilities
   - "Boutique/Studio Gym" - Specialized, smaller fitness facilities
   - "Franchise Gym" - Chain fitness locations operating under a franchise model
   - "Big Box Gym" - Large-scale commercial fitness centers
   - "Athletic Team/Professional Athlete" - Sports teams or individual athletes
   - "Wellness" - Holistic health and well-being providers

3. **Corporate & Institutional**:

   - "Corporate Wellness" - Wellness programs for corporate environments
   - "Corporate, Residential, or Hotel Facility" - Fitness facilities in these settings
   - "University/Research" - Academic or research institutions

4. **Industry Partners**:
   - "Equipment Manufacturer" - Makers of fitness or body composition equipment
   - "Distributor or Retailer" - Companies that distribute or sell fitness equipment
   - "Consultant" - Advisory professionals in the industry
   - "Sales Representative" - Independent sales agents
   - "Supplier" - Providers of components or materials
   - "Retail/Nutrition Store" - Retail locations specializing in nutrition products

This comprehensive categorization system allows ShapeScale to segment the market precisely and tailor their approach based on the specific needs and characteristics of each business type.

The CRM has a particularly strong focus on aesthetic-oriented businesses, with over 200 companies categorized with "aesthetic" in their name or description. This reflects ShapeScale's focus on businesses concerned with physical appearance and body composition.

#### Medical Spa Focus

Medical spas are a particular focus in the CRM, with nearly 40 different medical spa businesses tracked. These businesses represent an important market segment as they often combine:

1. Medical oversight (allowing for more clinical approaches)
2. Aesthetic focus (concern with appearance outcomes)
3. Technology adoption (willingness to invest in new measurement tools)
4. Results tracking (need to demonstrate effectiveness to clients)

A related field, "type_persona_5", appears to be used for alternative categorization but its specific values were not identified in the current analysis.

The CRM also uses categories that overlap with persona types:

- "Health Care"
- "B2C" (Business to Consumer)
- "Sports & Fitness"
- "Health & Wellness"
- "E-commerce"

### Body Composition Technology Tracking

ShapeScale's CRM is set up to track specific information about body composition technologies used by potential customers and partners. This tracking helps identify opportunities where ShapeScale's 3D body scanning technology could complement or replace existing solutions.

Key fields used for tracking body composition technologies include:

1. **body_composition_technologies** (text field):

   - Records detailed information about what specific technologies a company uses
   - Example value: "The practice primarily uses visual assessment and traditional measurements. They currently do not utilize any advanced body composition analysis technologies or 3D imaging for body composition."
   - Format: Typically contains 1-2 paragraphs of qualitative description
   - Used to identify gaps in a company's current technology stack

2. **uses_body_composition** (boolean field):

   - Simple yes/no indicator of whether a company uses any body composition technology
   - Used for quick filtering of prospects

3. **body_contouring** (text field):

   - Describes body contouring services offered by the company
   - Example value: "Comprehensive body contouring services including liposuction (BodySculpt™), tummy tucks with waist tucks, arm lifts, and thigh contouring. Specializes in personalized treatment plans for post-weight loss patients and those with stubborn fat deposits resistant to diet and exercise."
   - Helps identify potential use cases for ShapeScale's technology in tracking contouring results

4. **has_body_contouring** (boolean field):

   - Quick indicator of whether a company offers body contouring services
   - Used for prospect segmentation

5. **has_before_after_photos** (boolean field):
   - Indicates if a company currently tracks visual progress with photos
   - Companies that already use before/after photos might be interested in ShapeScale's more precise 3D visualization

### Competitor Product Tracking

The CRM also tracks information about competitor products through:

1. **uses_competitor_products** (boolean field):
   - Indicates if a company uses technologies that compete with ShapeScale
2. **competitor_use** (select field):
   - Specific competitor products being used
   - Used to tailor comparisons when making sales pitches

### Body Composition Technology Companies

The CRM contains records of companies specializing in body composition technology:

1. **DXAMetrics** (Boston DEXA Scan provider):

   - Specializes in DEXA scans, RMR, and VO2 max tests
   - Categorized as "Health Care", "B2C", "Sports & Fitness", and "Health & Wellness"
   - Potential competitor/partner as they offer complementary body composition analysis

2. **Sanny Body Composition** (Brazil):
   - Distributor looking to potentially partner with ShapeScale
   - Interested in developing body composition equations for the Brazilian market
   - Example of a distribution partner relationship

### Integration with Sales Process

Body composition technology information is integrated into the sales process, with particular attention to:

1. **Type categorization**:

   - Companies using basic (visual assessment) vs. advanced technologies
   - Segmentation by technology type helps prioritize sales efforts

2. **Geographical distribution**:

   - Regional differences in body composition technology adoption
   - Region-specific distribution partnerships (e.g., Sanny for Brazil)

3. **Industry category mapping**:
   - Health Care, Sports & Fitness, and Health & Wellness categories
   - Different value propositions for different industry segments

### Success Metrics Tracking

While there aren't dedicated fields specifically for "success metrics" in the traditional sense, ShapeScale's CRM does track several indicators that relate to the success of body scanning implementations:

1. **Before/After Photo Usage**:

   - The "has_before_after_photos" boolean field identifies companies that already track visual progress
   - Companies using before/after photos are likely candidates for 3D scanning upgrades

2. **Results Orientation**:

   - Companies with "results" in their name or business description are flagged for targeted messaging
   - These businesses tend to be more metrics-driven and receptive to body scanning technologies

3. **Service Descriptions**:

   - The detailed "services" field often contains information about how results are measured and tracked
   - Example: "...specializes in personalized treatment plans and visual transformation results"

4. **Indirect Success Metrics**:
   - The primary way success metrics are tracked is through qualitative descriptions in the notes and services fields
   - Staff manually extract information about how companies measure client success

### Equipment and Device Management

ShapeScale's CRM doesn't appear to have dedicated fields for tracking equipment inventory or device deployments specifically. However, it does track:

1. **Competitor Equipment Use**:

   - "uses_competitor_products" (boolean) indicates if a company uses competing technologies
   - "competitor_use" (select) specifies which competitor products are being used

2. **Equipment Companies**:

   - The CRM contains entries for equipment providers like "Shandong Tianzhan Fitness Equipment Co."
   - These are potential manufacturing or distribution partners

3. **Technology Descriptions**:
   - The "body_composition_technologies" field often describes specific equipment being used
   - These descriptions are in free-text format rather than structured data

### Geographical Analysis Capabilities

The CRM has several fields for tracking geographical information:

1. **Region Field**:

   - The "regions" select field categorizes companies by broad geographical regions
   - Known values include "Latin America"
   - This helps identify regional market trends and distribution opportunities

2. **Primary Location**:

   - Structured location data including address, city, state, country
   - Includes lat/long coordinates for mapping capabilities

3. **Regional Market Focus**:

   - Geographic-specific lists like "Weight Loss Management (SF Bay)"
   - Multiple companies can be grouped by region for targeted campaigns

4. **International Strategy**:
   - Special handling for international distributors (e.g., Sanny Body Composition in Brazil)
   - Different fields to track international vs. domestic business development

## Attribute Type References

Based on analysis of the API responses and JSON data, we've identified the following attribute types in Attio:

1. **text**: Simple text fields for storing strings

   - Examples: body_contouring, description, services

2. **number**: Numeric fields for integers or decimals

   - Examples: google_rating_1, strongest_connection_strength_legacy, twitter_follower_count

3. **boolean**: True/false flags

   - Examples: has_before_after_photos, uses_body_composition, has_body_contouring

4. **select**: Dropdown fields with predefined options

   - Examples: type_persona, facilities, referrer, typpe

5. **domain**: Special field type for website domains

   - Example: domains

6. **timestamp**: Date and time fields

   - Example: created_at

7. **date**: Date-only fields

   - Example: foundation_date

8. **location**: Structured address information

   - Example: primary_location

9. **record-reference**: References to other records (e.g., people)

   - Example: team

10. **phone-number**: Structured phone number data
    - Example: company_phone_5

When updating these fields, it's critical to use the correct data type to avoid API errors.
