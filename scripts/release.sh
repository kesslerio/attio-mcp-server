#!/bin/bash

# Publish Release Script
# This script prepares and tags an Attio MCP Server release.

set -euo pipefail

echo "🚀 Publishing Attio MCP Server Release"
echo "======================================"

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Must be on main branch to release"
    echo "   Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean"
    echo "   Please commit or stash your changes"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull --ff-only origin main

# Run build and tests
echo "🔨 Building project..."
bun run build

echo "🧪 Running tests..."
bun run test:offline

# Run linting and type checking
echo "🔍 Running linting and type checks..."
bun run check

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📌 Current version: $CURRENT_VERSION"

# Ask for new version
echo ""
echo "🔢 What type of release is this?"
echo "1) Patch (bug fixes) - e.g., 0.1.0 -> 0.1.1"
echo "2) Minor (new features) - e.g., 0.1.0 -> 0.2.0"  
echo "3) Major (breaking changes) - e.g., 0.1.0 -> 1.0.0"
echo "4) Custom version"
read -p "Enter choice (1-4): " RELEASE_TYPE

case $RELEASE_TYPE in
    1) 
        # Parse version and increment patch
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
        MAJOR=${VERSION_PARTS[0]}
        MINOR=${VERSION_PARTS[1]}
        PATCH=$((${VERSION_PARTS[2]} + 1))
        NEW_VERSION="$MAJOR.$MINOR.$PATCH"
        ;;
    2) 
        # Parse version and increment minor
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
        MAJOR=${VERSION_PARTS[0]}
        MINOR=$((${VERSION_PARTS[1]} + 1))
        NEW_VERSION="$MAJOR.$MINOR.0"
        ;;
    3) 
        # Parse version and increment major
        IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
        MAJOR=$((${VERSION_PARTS[0]} + 1))
        NEW_VERSION="$MAJOR.0.0"
        ;;
    4)
        read -p "Enter custom version (e.g., 0.1.0): " NEW_VERSION
        ;;
    *) 
        echo "Invalid choice"; exit 1 
        ;;
esac

echo "🔄 Updating version to: $NEW_VERSION"

# Update versioned files
echo "📝 Updating package.json and server.json versions..."
node - "$NEW_VERSION" <<'NODE'
const fs = require('node:fs');

const version = process.argv[2];

for (const file of ['package.json', 'server.json']) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.version = version;

  if (file === 'server.json' && Array.isArray(json.packages)) {
    json.packages = json.packages.map((pkg) =>
      pkg.registryType === 'npm' && pkg.identifier === 'attio-mcp'
        ? { ...pkg, version }
        : pkg
    );
  }

  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}
NODE

# Update changelog
echo ""
echo "📝 Please update CHANGELOG.md with the new version details"
echo "   New version: $NEW_VERSION"
read -p "Press enter when CHANGELOG.md is updated..."

echo "🧪 Validating release notes section..."
node scripts/release-notes.cjs "v$NEW_VERSION" --validate

# Rebuild after version change
echo "🔨 Rebuilding with new version..."
bun run build

# Commit version bump and changelog
echo "📝 Committing version bump..."
git add package.json server.json CHANGELOG.md
git commit -m "Chore: prepare v$NEW_VERSION release"

# Create git tag
echo "🏷️  Creating git tag..."
git tag "v$NEW_VERSION"

# Push changes and tags
echo "⬆️  Pushing changes to GitHub..."
git push origin main
git push --tags

echo ""
echo "✅ Release v$NEW_VERSION prepared successfully!"
echo ""
echo "📋 Post-release checklist:"
echo "[ ] Watch the GitHub tag workflows complete for release + npm publish"
echo "[ ] Verify the GitHub release body matches the curated CHANGELOG entry"
echo "[ ] Verify attio-mcp@$NEW_VERSION is available on npm"
echo ""
echo "🔗 Tag pushed: v$NEW_VERSION"
echo "   GitHub Release workflow will create the release notes from CHANGELOG.md"
