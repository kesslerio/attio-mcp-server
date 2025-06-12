#!/bin/bash

# Publish Release Script
# This script handles the full release process for Attio MCP Server

set -e

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
git pull

# Run build and tests
echo "🔨 Building project..."
npm run build

echo "🧪 Running tests..."
npm run test:offline

# Run linting and type checking
echo "🔍 Running linting and type checks..."
npm run check

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

# Update version in package.json
echo "📝 Updating package.json version..."
npm version $NEW_VERSION --no-git-tag-version

# Update changelog
echo ""
echo "📝 Please update CHANGELOG.md with the new version details"
echo "   New version: $NEW_VERSION"
if [ ! -f "CHANGELOG.md" ]; then
    echo "Creating CHANGELOG.md..."
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${NEW_VERSION}] - $(date +%Y-%m-%d)

### Added
- Initial release of Attio MCP Server
- Model Context Protocol integration for Attio CRM
- Company, people, lists, notes, and tasks management
- Advanced search and filtering capabilities
- Batch operations support

### Changed
- N/A

### Fixed
- N/A

EOF
fi
read -p "Press enter when CHANGELOG.md is updated..."

# Rebuild after version change
echo "🔨 Rebuilding with new version..."
npm run build

# Commit version bump and changelog
echo "📝 Committing version bump..."
git add package.json CHANGELOG.md
git commit -m "Bump version to $NEW_VERSION"

# Create git tag
echo "🏷️  Creating git tag..."
git tag "v$NEW_VERSION"

# Push changes and tags
echo "⬆️  Pushing changes to GitHub..."
git push origin main
git push --tags

# Create GitHub release
echo "📋 Creating GitHub release..."
if command -v gh &> /dev/null; then
    gh release create "v$NEW_VERSION" \
        --title "Attio MCP Server v$NEW_VERSION" \
        --notes "See CHANGELOG.md for details" \
        --latest
else
    echo "⚠️  GitHub CLI not found. Please create the release manually at:"
    echo "   https://github.com/kesslerio/attio-mcp-server/releases/new?tag=v$NEW_VERSION"
fi

echo ""
echo "✅ Release v$NEW_VERSION completed successfully!"
echo ""
echo "📋 Post-release checklist:"
echo "[ ] Test the MCP server with the new version"
echo "[ ] Update any documentation if needed"
echo "[ ] Announce the release if significant"
echo ""
echo "🔗 Installation command for users:"
echo "   curl -fsSL https://raw.githubusercontent.com/kesslerio/attio-mcp-server/main/install.sh | bash"