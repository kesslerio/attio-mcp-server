// Script to analyze all MCP tools and find tool #47
async function analyzeMCPTools() {
  const toolDefinitions = [];
  let toolCount = 0;

  // Companies tools
  const companySearchTools = [
    'search-companies',
    'advanced-search-companies'
  ];
  const companyCrudTools = [
    'create-company',
    'update-company', 
    'update-company-attribute',
    'delete-company'
  ];
  const companyAttributeTools = [
    'get-company-fields',
    'get-company-custom-fields',
    'discover-company-attributes',
    'get-company-attributes'
  ];
  const companyNotesTools = [
    'get-company-notes',
    'create-company-note'
  ];
  const companyRelationshipTools = [
    'search-companies-by-people',
    'search-companies-by-people-list',
    'search-companies-by-notes'
  ];
  const companyBatchTools = [
    'batch-create-companies',
    'batch-update-companies',
    'batch-delete-companies',
    'batch-search-companies',
    'batch-get-company-details'
  ];
  const companyFormatterTools = [
    'get-company-details',
    'get-company-json',
    'get-company-basic-info',
    'get-company-contact-info',
    'get-company-business-info',
    'get-company-social-info'
  ];

  // People tools
  const peopleTools = [
    'search-people',
    'search-people-by-email',
    'search-people-by-phone',
    'advanced-search-people',
    'get-person-details',
    'get-person-notes',
    'create-person-note',
    'search-people-by-creation-date',
    'search-people-by-modification-date',
    'search-people-by-last-interaction',
    'search-people-by-activity',
    'search-people-by-company',
    'search-people-by-company-list',
    'search-people-by-notes'
  ];

  // Lists tools
  const listsTools = [
    'get-lists',
    'get-list-details',
    'get-list-entries',
    'filter-list-entries',
    'advanced-filter-list-entries',
    'add-record-to-list',
    'remove-record-from-list'
  ];

  // Records tools
  const recordsTools = [
    'create-record',
    'get-record',
    'update-record',
    'delete-record',
    'list-records',
    'batch-create-records',
    'batch-update-records'
  ];

  // Prompts tools
  const promptsTools = [
    'list-prompts',
    'list-prompt-categories',
    'get-prompt-details',
    'execute-prompt'
  ];

  // Paginated people tools
  const paginatedPeopleTools = [
    'paginated-search-people',
    'paginated-search-people-by-creation-date',
    'paginated-search-people-by-modification-date',
    'paginated-search-people-by-last-interaction',
    'paginated-search-people-by-activity'
  ];

  // All tools in order
  const allTools = [
    ...companySearchTools,
    ...companyCrudTools,
    ...companyAttributeTools,
    ...companyNotesTools,
    ...companyRelationshipTools,
    ...companyBatchTools,
    ...companyFormatterTools,
    ...peopleTools,
    ...listsTools,
    ...recordsTools,
    ...promptsTools,
    ...paginatedPeopleTools
  ];

  console.log('Total MCP Tools:', allTools.length);
  console.log('\n=== All MCP Tools in Order ===\n');

  // List all tools with their index
  allTools.forEach((tool, index) => {
    const toolNumber = index + 1;
    console.log(`${toolNumber}. ${tool}`);
    
    // Check if this is tool #47
    if (toolNumber === 47) {
      console.log(`\n>>> TOOL #47 IS: ${tool} <<<\n`);
    }
  });

  // Check for schemas with oneOf, allOf, anyOf - we need to load the actual schema files for this
  const schemasWithConditionals = {
    'update-company-attribute': {
      hasOneOf: true,
      location: 'value property has oneOf for different types'
    },
    'create-company-note': {
      hasOneOf: true,
      location: 'root level has oneOf for companyId vs uri'
    },
    'get-company-notes': {
      hasOneOf: true,
      location: 'root level has oneOf for companyId vs uri'
    },
    'get-company-details': {
      hasOneOf: true,
      location: 'root level has oneOf for companyId vs uri'
    }
  };

  console.log('\n=== Tools with oneOf/allOf/anyOf at top level ===\n');
  Object.entries(schemasWithConditionals).forEach(([tool, info]) => {
    console.log(`${tool}: ${info.location}`);
  });

  // Tool #47 analysis
  const tool47 = allTools[46]; // 0-based index
  console.log(`\n=== Analysis of Tool #47: ${tool47} ===`);
  
  if (schemasWithConditionals[tool47]) {
    console.log('This tool has conditional schemas:', schemasWithConditionals[tool47].location);
  } else {
    console.log('This tool does not have oneOf/allOf/anyOf at the top level of its schema.');
  }
}

analyzeMCPTools();