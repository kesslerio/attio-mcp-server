# Attio MCP CLI Documentation

The Attio MCP server includes automatic attribute discovery that runs on startup and periodically updates your mappings. Additionally, a powerful Command Line Interface (CLI) is available for manual discovery and configuration management.

## Automatic Discovery (New!)

Starting with version 0.0.3, the Attio MCP server now automatically discovers and updates attribute mappings:

- **On Startup**: Runs automatically when the server starts
- **Periodic Updates**: Updates mappings every hour by default
- **Zero Configuration**: Works out of the box with default settings
- **Customizable**: Configure via environment variables

### Configuration

Set these environment variables to customize auto-discovery:

```bash
# Disable auto-discovery (default: true)
ATTIO_AUTO_DISCOVERY=false

# Disable discovery on startup (default: true)
ATTIO_DISCOVERY_ON_STARTUP=false

# Set update interval in minutes (default: 60, set to 0 to disable)
ATTIO_DISCOVERY_INTERVAL=120
```

## Manual Discovery with CLI

The CLI tool (`attio-discover`) is still available for manual configuration management:

- **Manual Control**: Run discovery on demand
- **Custom Output**: Save to specific file locations
- **Selective Discovery**: Discover specific objects only
- **Reset Options**: Clear existing mappings

## Installation and Setup

The CLI is automatically installed when you install the Attio MCP server:

```bash
npm install -g attio-mcp-server
```

### Environment Setup

The CLI requires an Attio API key. You can provide it via:

1. Environment variable: `ATTIO_API_KEY`
2. Command-line option: `--api-key YOUR_KEY`
3. `.env` file in the project root

## Core Features

### 1. Attribute Discovery

The most important feature of the CLI is manual attribute discovery when automatic discovery is disabled or when you need immediate updates.

#### Why This Matters

- Attio uses API slugs like `company_name` internally
- Users prefer natural names like "Company Name"
- The CLI manually creates these mappings
- Enables natural language queries through the MCP

#### Commands

```bash
# Discover attributes for a specific object
npm run discover:attributes -- --object companies

# Discover attributes for all objects
npm run discover:all-attributes

# High-memory versions for large workspaces
npm run discover:all-attributes:high-memory

# Robust version with environment loading
npm run discover:all-attributes:robust
```

### 2. Configuration Management

The CLI generates and manages mapping configuration files:

```bash
# Generate default configuration
attio-discover attributes --all

# Output to custom location
attio-discover attributes --all --output config/mappings/custom.json

# Reset existing mappings
attio-discover attributes --all --reset
```

## Command Reference

### Basic Commands

```bash
attio-discover [command] [options]
```

### Available Commands

#### `attributes`
Discover attribute mappings for Attio objects.

**Options:**
- `--object, -o`: Specific object type (e.g., companies, people)
- `--all, -a`: Discover attributes for all objects
- `--output, -f`: Output file path (default: config/mappings/user.json)
- `--reset, -r`: Reset existing mappings instead of merging
- `--api-key, -k`: Attio API key

**Examples:**
```bash
# Discover all attributes
attio-discover attributes --all

# Discover attributes for companies only
attio-discover attributes --object companies

# Save to custom location
attio-discover attributes --all --output my-mappings.json
```

## Benefits of Using the CLI

### 1. Manual Control
- Run discovery exactly when needed
- Update specific objects without affecting others
- Create custom configuration files

### 2. Large Workspace Support
- High-memory options for extensive schemas
- Batch processing for multiple objects
- Error recovery for partial failures

### 3. Development Workflow
- Test configurations before deployment
- Maintain multiple configuration versions
- Integrate with CI/CD pipelines

### 4. Backup and Recovery
- Export current mappings
- Maintain configuration history
- Restore previous configurations

## Common Use Cases

### Manual Updates
```bash
# Update mappings after schema changes
npm run discover:attributes:robust -- --object companies
```

### Custom Configurations
```bash
# Generate configuration for specific environment
ATTIO_API_KEY=$CUSTOM_KEY npm run discover:all-attributes:robust -- --output config/custom.json
```

### Troubleshooting
```bash
# Force refresh when auto-discovery fails
npm run discover:all-attributes:high-memory -- --reset
```

## Best Practices

1. **Use Auto-Discovery**: Let the server handle updates automatically
2. **Manual Updates**: Run CLI only when needed for immediate changes
3. **Version Control**: Commit mapping files to track changes
4. **Environment Separation**: Maintain separate configs for different environments

## Troubleshooting

### Memory Issues
If you encounter memory errors with large workspaces:
```bash
# Use high-memory version
npm run discover:all-attributes:high-memory

# Or increase memory manually
NODE_OPTIONS='--max-old-space-size=8192' npm run discover:all-attributes
```

### API Key Issues
If the CLI can't find your API key:
1. Check `.env` file exists and contains `ATTIO_API_KEY`
2. Use the robust version: `npm run discover:all-attributes:robust`
3. Pass key directly: `--api-key YOUR_KEY`

### Permission Errors
Ensure scripts are executable:
```bash
chmod +x scripts/run-discover.sh
chmod +x scripts/discover-with-memory.sh
```

## Dual-System Architecture: CLI + Default Mappings

The Attio MCP server uses a sophisticated dual-system approach for attribute mapping:

### System Components

#### 1. **Static Default Mappings** (`configs/runtime/mappings/default.json`)
- **Purpose**: Provides hardcoded fallback mappings for official Attio attributes
- **Function**: Static reference of standard field mappings (e.g., "Name" → "name", "Categories" → "categories")
- **Scope**: Contains only verified standard Attio API fields that exist in all workspaces
- **Use Case**: Ensures MCP server works immediately with standard fields, even without user configuration

#### 2. **Dynamic Discovery Tool** (`src/cli/commands/attributes.ts`)
- **Purpose**: CLI command that makes live API calls to discover workspace-specific attributes
- **Function**: Fetches real attribute mappings for custom fields (e.g., "Lead Score" → "lead_score")
- **Output**: Writes discovered mappings to user.json configuration file
- **Use Case**: Discovers custom fields that users have added to their specific Attio workspace

### How They Work Together

```
Server Startup → Load default.json → Load user.json → Merge Configurations
     ↓                    ↓              ↓                    ↓
Default mappings    +   Custom fields  =  Complete mapping system
(Name, Categories)     (Lead Score, etc.)  (All fields available)
```

#### Configuration Merging Priority:
1. **default.json**: Base layer with standard Attio API fields
2. **user.json**: Override layer with workspace-specific custom fields  
3. **Result**: Merged configuration supporting both standard and custom attributes

#### Benefits of This Architecture:
- **Immediate functionality**: Works out-of-the-box with standard fields
- **Extensibility**: Supports unlimited custom workspace fields
- **Reliability**: Fallback to defaults if custom discovery fails
- **Performance**: No API calls needed for standard field mapping

### Example Mapping Flow

**Standard Field (handled by default.json):**
```
User Query: "Company Name" → default.json → "name" → Attio API ✅
```

**Custom Field (requires CLI discovery):**
```
User Query: "Lead Score" → user.json → "lead_score" → Attio API ✅
User Query: "Lead Score" (no discovery) → No mapping → Error ❌
```

## Integration with Auto-Discovery

The CLI works alongside automatic discovery:

1. **Auto-Discovery Primary**: Server handles updates automatically for both default and custom fields
2. **CLI for Special Cases**: Manual updates when needed for immediate changes
3. **Shared Configuration**: Both systems use the same dual-layer mapping architecture
4. **Seamless Handoff**: Manual updates are preserved and enhanced by auto-discovery

## Future Enhancements

Planned features for the CLI include:
- Object discovery and mapping
- List configuration generation
- Relationship mapping
- Full workspace configuration export/import
- Configuration validation and testing

## Related Documentation

- [Getting Started](../getting-started.md)
- [Attribute Mapping Guide](../attribute-mapping.md)
- [API Overview](../api-overview.md)