# User Guide: Working with Attio MCP Server

This guide covers common workflows and examples for using the Attio MCP Server with AI assistants like Claude.

## Quick Start

Once configured, you can interact with your Attio CRM using natural language. The server supports universal tools that work across all Attio record types (companies, people, deals, etc.).

### Basic Operations

- **Search**: "Find all people at Google"
- **Create**: "Create a new company called Acme Corp"
- **Update**: "Update John Smith's email to john.smith@example.com"
- **View**: "Show me details for the Acme Corp company"

## Common Workflows

### Lead Management

#### Capturing a New Lead
```
Add a new contact named John Smith with email john@example.com and phone 555-123-4567
```

#### Lead Follow-up
```
Add a note to John Smith that I need to follow up next week about our product demo
```

#### List Management
```
Add John Smith to our New Leads list
```

### Account Management

#### Preparing for Customer Meetings
```
Find Acme Corporation in our CRM and show me their recent activity
```

#### Deal Tracking
```
Create a new deal for $10,000 with Acme Corp for Q4 software licensing
```

### Data Management

#### Bulk Operations
```
Find all companies in the Technology industry and show their contact information
```

#### Advanced Filtering
```
Show me all people who work at companies with more than 100 employees
```

## Best Practices

### Efficient Searching
- Use specific criteria when possible
- Combine multiple filters for precise results
- Utilize relationship-based searches

### Data Quality
- Always verify data before bulk operations
- Use consistent naming conventions
- Keep notes and activities up to date

### Security
- Never share API keys in chat logs
- Use appropriate field visibility settings
- Follow your organization's data handling policies

## Troubleshooting

### Common Issues
- **Authentication errors**: Check your ATTIO_API_KEY environment variable
- **Record not found**: Verify spelling and check record existence
- **Permission errors**: Ensure your API key has appropriate permissions

### Getting Help
- Check the API reference in `/docs/api/`
- Review error messages for specific guidance
- Consult the troubleshooting guide

## Next Steps

- Explore the [API Reference](api/universal-tools.md) for advanced usage
- Learn about [extending functionality](development/extending-mcp.md)
- Review [deployment options](deployment/README.md)