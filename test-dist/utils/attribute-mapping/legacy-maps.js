/**
 * Legacy mapping data for backward compatibility
 * This is kept in a separate file for better code organization
 */
/**
 * Legacy mapping for backward compatibility
 * This is kept for reference and to ensure backward compatibility
 */
export const LEGACY_ATTRIBUTE_MAP = {
    // Company attributes
    Name: 'name',
    Website: 'website',
    Industry: 'industry',
    Revenue: 'annual_revenue',
    'Annual Revenue': 'annual_revenue',
    'Employee Count': 'employee_count',
    Employees: 'employee_count',
    'Company Name': 'name',
    'Company Website': 'website',
    'B2B Segment': 'type_persona',
    'Type Persona': 'type_persona',
    'Created At': 'created_at',
    'Updated At': 'updated_at',
    'Last Interaction': 'last_interaction',
    'Interaction Type': 'interaction_type',
    'Company Type': 'company_type',
    Notes: 'notes',
    Address: 'address',
    City: 'city',
    State: 'state',
    Country: 'country',
    ZIP: 'postal_code',
    'Postal Code': 'postal_code',
    // People attributes
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Full Name': 'name',
    Email: 'email',
    Phone: 'phone',
    Mobile: 'mobile',
    Title: 'title',
    'Job Title': 'title',
    Position: 'title',
    Department: 'department',
    Company: 'company',
    // General attributes (date-based)
    Created: 'created_at',
    Modified: 'updated_at',
    Updated: 'updated_at',
    'Last Activity': 'last_interaction',
};
// For backward compatibility
export const COMMON_ATTRIBUTE_MAP = LEGACY_ATTRIBUTE_MAP;
