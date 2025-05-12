#!/bin/bash
# Attio MCP Additional GitHub Labels Setup Script
# This script creates additional area labels based on the project structure

echo "Setting up additional GitHub area labels for Attio MCP workflow system..."

# API-specific area labels based on docs directory
echo "Creating API-specific area labels..."
gh label create "area:api:people" --color 0366d6 --description "People API related issues" || echo "Label area:api:people already exists"
gh label create "area:api:lists" --color 0366d6 --description "Lists API related issues" || echo "Label area:api:lists already exists"
gh label create "area:api:notes" --color 0366d6 --description "Notes API related issues" || echo "Label area:api:notes already exists"
gh label create "area:api:objects" --color 0366d6 --description "Objects API related issues" || echo "Label area:api:objects already exists"
gh label create "area:api:records" --color 0366d6 --description "Records API related issues" || echo "Label area:api:records already exists"
gh label create "area:api:tasks" --color 0366d6 --description "Tasks API related issues" || echo "Label area:api:tasks already exists"

# Additional functional area labels
echo "Creating functional area labels..."
gh label create "area:extension" --color 0366d6 --description "MCP extension related issues" || echo "Label area:extension already exists"
gh label create "area:integration" --color 0366d6 --description "Integration related issues" || echo "Label area:integration already exists"
gh label create "area:security" --color d93f0b --description "Security related issues" || echo "Label area:security already exists"
gh label create "area:rate-limiting" --color d93f0b --description "Rate limiting related issues" || echo "Label area:rate-limiting already exists"
gh label create "area:error-handling" --color d93f0b --description "Error handling related issues" || echo "Label area:error-handling already exists"
gh label create "area:logging" --color 0366d6 --description "Logging related issues" || echo "Label area:logging already exists"

echo "✅ Additional GitHub labels setup complete!"
