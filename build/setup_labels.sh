#!/bin/bash
# Attio MCP GitHub Labels Setup Script
# This script creates the required labels for the GitHub workflow system

echo "Setting up GitHub labels for Attio MCP workflow system..."

# Priority labels
echo "Creating priority labels..."
gh label create "P0" --color FF0000 --description "Critical priority" || echo "Label P0 already exists"
gh label create "P1" --color FF9900 --description "High priority" || echo "Label P1 already exists"
gh label create "P2" --color FFCC00 --description "Medium priority" || echo "Label P2 already exists"
gh label create "P3" --color FFFF00 --description "Low priority" || echo "Label P3 already exists"
gh label create "P4" --color CCFFCC --description "Trivial priority" || echo "Label P4 already exists"

# Type labels
echo "Creating type labels..."
gh label create "bug" --color d73a4a --description "Something isn't working" || echo "Label bug already exists"
gh label create "feature" --color a2eeef --description "New feature or request" || echo "Label feature already exists"
gh label create "enhancement" --color a2eeef --description "Improvement to existing functionality" || echo "Label enhancement already exists"
gh label create "documentation" --color 0075ca --description "Documentation improvements" || echo "Label documentation already exists"
gh label create "test" --color 0075ca --description "Test improvements" || echo "Label test already exists"

# Status labels
echo "Creating status labels..."
gh label create "status:ready" --color 0E8A16 --description "Ready for implementation" || echo "Label status:ready already exists"
gh label create "status:in-progress" --color 1D76DB --description "Currently being worked on" || echo "Label status:in-progress already exists"
gh label create "status:blocked" --color B60205 --description "Cannot proceed due to dependencies" || echo "Label status:blocked already exists"
gh label create "status:needs-info" --color FEF2C0 --description "Requires additional information" || echo "Label status:needs-info already exists"
gh label create "status:review" --color 5319E7 --description "Ready for or in review" || echo "Label status:review already exists"
gh label create "status:untriaged" --color FBCA04 --description "Not yet assessed" || echo "Label status:untriaged already exists"

# Area labels
echo "Creating area labels..."
gh label create "area:core" --color 0366d6 --description "Core module related issues" || echo "Label area:core already exists"
gh label create "area:api" --color 0366d6 --description "API related issues" || echo "Label area:api already exists"
gh label create "area:build" --color 0366d6 --description "Build system related issues" || echo "Label area:build already exists"
gh label create "area:dist" --color 0366d6 --description "Distribution related issues" || echo "Label area:dist already exists"
gh label create "area:documentation" --color 0366d6 --description "Documentation related issues" || echo "Label area:documentation already exists"
gh label create "area:testing" --color 0366d6 --description "Testing related issues" || echo "Label area:testing already exists"
gh label create "area:performance" --color 0366d6 --description "Performance related issues" || echo "Label area:performance already exists"
gh label create "area:refactor" --color 0366d6 --description "Refactoring related issues" || echo "Label area:refactor already exists"

echo "✅ GitHub labels setup complete!"
