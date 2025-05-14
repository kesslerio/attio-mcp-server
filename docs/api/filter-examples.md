# Attio MCP Filter Examples

This document provides practical examples of using the Attio MCP filtering capabilities. These examples demonstrate how to combine different filter types to create powerful and flexible queries.

## Simple Filters

### Text Filters

```typescript
// Search for people with a specific name
const nameFilter = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: 'contains',
      value: 'Smith'
    }
  ]
};

// Using the helper function
const nameFilter = createContainsFilter('name', 'Smith');

// Search for people with a specific email domain
const emailFilter = {
  filters: [
    {
      attribute: { slug: 'email' },
      condition: 'contains',
      value: '@example.com'
    }
  ]
};

// Using the helper function
const emailFilter = createContainsFilter('email', '@example.com');
```

### Date Filters

```typescript
// Search for people created in 2023
const creationDateFilter = {
  dateRange: {
    start: '2023-01-01T00:00:00Z',
    end: '2023-12-31T23:59:59Z'
  }
};

// Using the helper function
const creationDateFilter = createDateRangeFilter('created_at', {
  start: '2023-01-01T00:00:00Z',
  end: '2023-12-31T23:59:59Z'
});

// Search for people modified this week
const modificationDateFilter = {
  dateRange: {
    preset: 'this_week'
  }
};

// Using the helper function
const modificationDateFilter = createDateRangeFilter('updated_at', {
  preset: 'this_week'
});
```

### Numeric Filters

```typescript
// Search for companies with revenue between $1M and $10M
const revenueFilter = {
  min: 1000000,
  max: 10000000
};

// Using the helper function
const revenueFilter = createNumericFilter('annual_revenue', {
  min: 1000000,
  max: 10000000
});

// Search for companies with more than 100 employees
const employeeFilter = {
  min: 100
};

// Using the helper function
const employeeFilter = createNumericFilter('employee_count', {
  min: 100
});
```

## Advanced Examples

### Example 1: Finding Active High-Value Customers

Find companies that:
- Have revenue > $1M
- Were created in the last year
- Had an interaction in the last 30 days

```typescript
// Step 1: Define the individual filters
const revenueFilter = createNumericFilter('annual_revenue', { min: 1000000 });

const creationDateFilter = createDateRangeFilter('created_at', {
  start: {
    unit: 'year',
    value: 1,
    direction: 'past'
  },
  end: new Date().toISOString()
});

const activityFilter = {
  dateRange: {
    start: {
      unit: 'day',
      value: 30,
      direction: 'past'
    },
    end: new Date().toISOString()
  }
};

// Step 2: Combine the filters with AND logic
const combinedFilter = combineFiltersWithAnd(
  revenueFilter,
  creationDateFilter
);

// Step 3: Search for companies matching all criteria
const highValueActiveCustomers = await searchCompaniesByActivity(
  activityFilter,
  20, // limit
  0,  // offset
  combinedFilter // additional filters
);
```

### Example 2: Finding Potential Sales Opportunities

Find people who:
- Work at companies with > 100 employees
- Have a job title containing "Manager" or "Director"
- Haven't been contacted in the last 90 days

```typescript
// Step 1: Define the company filter
const companyFilter = createNumericFilter('employee_count', { min: 100 });

// Step 2: Define the job title filter
const jobTitleFilter = {
  filters: [
    {
      attribute: { slug: 'job_title' },
      condition: 'contains',
      value: 'Manager'
    },
    {
      attribute: { slug: 'job_title' },
      condition: 'contains',
      value: 'Director'
    }
  ],
  matchAny: true // OR logic
};

// Step 3: Define the activity filter (no interaction in last 90 days)
const noRecentActivity = {
  dateRange: {
    end: {
      unit: 'day',
      value: 90,
      direction: 'past'
    }
  }
};

// Step 4: Search for people matching these criteria
const salesOpportunities = await advancedSearchPeople(
  combineFiltersWithAnd(companyFilter, jobTitleFilter),
  20, // limit
  0   // offset
);

// Step 5: Filter out those with recent activity
const peopleWithoutRecentActivity = await filterPeopleByActivity(
  salesOpportunities,
  noRecentActivity,
  'last_interaction_before' // hypothetical activity filter mode
);
```

### Example 3: Finding Customers at Risk

Find companies that:
- Were previously active (had interactions 3-6 months ago)
- Haven't had any interaction in the last 3 months
- Have a high customer value score

```typescript
// Step 1: Define the previous activity filter
const previousActivityFilter = {
  dateRange: {
    start: {
      unit: 'month',
      value: 6,
      direction: 'past'
    },
    end: {
      unit: 'month',
      value: 3,
      direction: 'past'
    }
  }
};

// Step 2: Define the high value filter
const highValueFilter = createNumericFilter('customer_value_score', {
  min: 80
});

// Step 3: Find companies with previous activity
const previouslyActiveCompanies = await searchCompaniesByActivity(
  previousActivityFilter,
  100, // larger limit to account for filtering
  0
);

// Step 4: Define the recent inactivity filter 
const recentInactivityFilter = {
  dateRange: {
    end: {
      unit: 'month',
      value: 3,
      direction: 'past'
    }
  },
  invertMatch: true // hypothetical parameter to find companies WITHOUT recent activity
};

// Step 5: Filter to find high-value companies without recent activity
const customersAtRisk = previouslyActiveCompanies
  .filter(company => {
    // Apply high value filter
    return company.values?.customer_value_score?.[0]?.value >= 80;
  })
  .filter(company => {
    // Apply recent inactivity filter (simplified example - in practice, use the API)
    const lastInteractionDate = new Date(company.values?.last_interaction?.[0]?.value);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return lastInteractionDate < threeMonthsAgo;
  });
```

### Example 4: Quarterly Business Review Analysis

Find all customer records that:
- Were created in the current quarter
- Include companies with any revenue range (grouped by revenue tiers)
- Have specific industry classifications
- Include interaction count metrics

```typescript
// Step 1: Define the creation date filter for current quarter
const createdThisQuarterFilter = {
  dateRange: {
    preset: 'this_quarter'
  }
};

// Step 2: Define industry filter
const industryFilter = {
  filters: [
    {
      attribute: { slug: 'industry' },
      condition: 'equals',
      value: 'Technology'
    },
    {
      attribute: { slug: 'industry' },
      condition: 'equals',
      value: 'Finance'
    },
    {
      attribute: { slug: 'industry' },
      condition: 'equals',
      value: 'Healthcare'
    }
  ],
  matchAny: true // OR logic
};

// Step 3: Create revenue tier definitions
const revenueTiers = [
  { name: 'Small', min: 0, max: 1000000 },
  { name: 'Medium', min: 1000000, max: 10000000 },
  { name: 'Large', min: 10000000, max: 100000000 },
  { name: 'Enterprise', min: 100000000, max: null }
];

// Step 4: Search for companies created this quarter in the specified industries
const newCustomers = await searchCompaniesByCreationDate(
  createdThisQuarterFilter,
  100, // larger limit
  0,
  industryFilter // additional filter
);

// Step 5: Process and categorize the results
const quarterlyReviewData = {
  totalNewCustomers: newCustomers.length,
  byRevenueTier: {},
  byIndustry: {},
  interactionMetrics: {
    totalInteractions: 0,
    averagePerCustomer: 0
  }
};

// Categorize by revenue tier
revenueTiers.forEach(tier => {
  const companiesInTier = newCustomers.filter(company => {
    const revenue = company.values?.annual_revenue?.[0]?.value || 0;
    return revenue >= tier.min && (tier.max === null || revenue < tier.max);
  });
  
  quarterlyReviewData.byRevenueTier[tier.name] = companiesInTier.length;
});

// Categorize by industry
newCustomers.forEach(company => {
  const industry = company.values?.industry?.[0]?.value || 'Unknown';
  quarterlyReviewData.byIndustry[industry] = (quarterlyReviewData.byIndustry[industry] || 0) + 1;
});

// Calculate interaction metrics (simplified - in practice, get this from the API)
const totalInteractions = newCustomers.reduce((sum, company) => {
  return sum + (company.values?.interaction_count?.[0]?.value || 0);
}, 0);

quarterlyReviewData.interactionMetrics.totalInteractions = totalInteractions;
quarterlyReviewData.interactionMetrics.averagePerCustomer = 
  totalInteractions / (newCustomers.length || 1);
```

## Using Pagination for Large Result Sets

When dealing with large result sets, always use pagination to improve performance:

```typescript
// Iterate through all results with pagination
async function findAllMatchingRecords(filter, pageSize = 20) {
  let offset = 0;
  let allResults = [];
  let hasMoreResults = true;
  
  while (hasMoreResults) {
    const pageResults = await advancedSearchPeople(filter, pageSize, offset);
    
    // Add results to our collection
    allResults = [...allResults, ...pageResults];
    
    // Check if we've reached the end
    if (pageResults.length < pageSize) {
      hasMoreResults = false;
    } else {
      // Move to the next page
      offset += pageSize;
    }
  }
  
  return allResults;
}

// Usage example
const filter = createContainsFilter('name', 'Smith');
const allSmiths = await findAllMatchingRecords(filter);
```

## Combining Filters with Different Types

Sometimes you need to combine filters of different types:

```typescript
// Find people who:
// - Have a specific email domain
// - Work at companies with revenue > $10M
// - Were created in the last year
// - Had a phone interaction in the last week

// Step 1: Create individual filters
const emailFilter = createContainsFilter('email', '@enterprise.com');

const companyRevenueFilter = createNumericFilter('company.annual_revenue', {
  min: 10000000
});

const creationDateFilter = createDateRangeFilter('created_at', {
  start: {
    unit: 'year',
    value: 1,
    direction: 'past'
  },
  end: new Date().toISOString()
});

const recentPhoneInteractionFilter = {
  dateRange: {
    preset: 'last_week'
  },
  interactionType: 'phone'
};

// Step 2: Combine filters (except for the interaction filter)
const combinedFilter = combineFiltersWithAnd(
  emailFilter,
  companyRevenueFilter,
  creationDateFilter
);

// Step 3: Search for people with the combined filter
const matchingPeople = await advancedSearchPeople(combinedFilter, 100, 0);

// Step 4: Further filter by recent interaction
const peopleWithRecentPhoneCall = await searchPeopleByActivity(
  recentPhoneInteractionFilter,
  100,
  0,
  matchingPeople.map(person => person.id.record_id) // Use IDs from previous search
);
```

## Handling Complex Filter Scenarios

For very complex filtering needs, consider using a sequential approach:

```typescript
// Example: Find companies for a targeted campaign with multiple criteria
async function findTargetedCampaignProspects() {
  // Step 1: Start with industry and revenue filters
  const initialFilter = combineFiltersWithAnd(
    createContainsFilter('industry', 'Technology'),
    createNumericFilter('annual_revenue', { min: 5000000 })
  );
  
  const potentialCompanies = await advancedSearchCompanies(initialFilter, 200, 0);
  console.log(`Found ${potentialCompanies.length} companies in the Technology industry with >$5M revenue`);
  
  // Step 2: Filter to companies created in the last 2 years
  const creationDateFilter = { 
    start: {
      unit: 'year',
      value: 2,
      direction: 'past'
    },
    end: new Date().toISOString()
  };
  
  const companiesCreatedRecently = await filterCompaniesByCreationDate(
    potentialCompanies.map(company => company.id.record_id),
    creationDateFilter
  );
  console.log(`${companiesCreatedRecently.length} of these were created in the last 2 years`);
  
  // Step 3: Filter to companies without recent interactions
  const noRecentContactFilter = {
    dateRange: {
      end: {
        unit: 'month',
        value: 3,
        direction: 'past'
      }
    }
  };
  
  const companiesWithoutRecentContact = await filterCompaniesByLastInteraction(
    companiesCreatedRecently.map(company => company.id.record_id),
    noRecentContactFilter,
    'not_interacted_since' // hypothetical parameter
  );
  console.log(`${companiesWithoutRecentContact.length} have not been contacted in 3+ months`);
  
  // Step 4: Additional business logic filtering
  const finalProspects = companiesWithoutRecentContact.filter(company => {
    // Any additional criteria, like geographic region, employee count, etc.
    const employeeCount = company.values?.employee_count?.[0]?.value || 0;
    const region = company.values?.region?.[0]?.value || '';
    
    return employeeCount > 50 && ['US', 'Canada', 'UK'].includes(region);
  });
  
  console.log(`Final target list: ${finalProspects.length} companies`);
  return finalProspects;
}
```

## Conclusion

These examples demonstrate how to combine various filter types to create powerful queries. Remember that when working with complex filters:

1. Break down the problem into manageable filter components
2. Use the appropriate helper functions to create standardized filters
3. Combine filters using AND/OR logic as needed
4. Use pagination for large result sets
5. Consider a multi-step approach for very complex filtering needs
6. Use type-safe operations to ensure filter validity