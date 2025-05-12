#!/bin/bash

# Script to install git hooks for the Attio MCP project
# This script supports both copy and symlink installation methods

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo -e "${RED}Error:${NC} This script must be run from the root of a git repository."
  exit 1
fi

# Default to symlink installation
INSTALL_METHOD="symlink"

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --copy) INSTALL_METHOD="copy"; shift ;;
    --symlink) INSTALL_METHOD="symlink"; shift ;;
    --help) 
      echo -e "${BLUE}Attio MCP Git Hooks Installer${NC}"
      echo -e "Usage: ./build/install-hooks.sh [options]"
      echo -e "\nOptions:"
      echo -e "  --copy     Install hooks by copying files (good for CI environments)"
      echo -e "  --symlink  Install hooks using symlinks (default - keeps hooks in sync with repo)"
      echo -e "  --help     Show this help message"
      exit 0
      ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

echo -e "${YELLOW}Installing Git hooks using ${INSTALL_METHOD} method...${NC}"

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Make sure hooks are executable
chmod +x build/hooks/pre-commit
chmod +x build/hooks/prepare-commit-msg

# Install hooks based on selected method
if [ "$INSTALL_METHOD" = "symlink" ]; then
  # Create symlinks for pre-commit and prepare-commit-msg
  ln -sf "$(pwd)/build/hooks/pre-commit" .git/hooks/pre-commit
  ln -sf "$(pwd)/build/hooks/prepare-commit-msg" .git/hooks/prepare-commit-msg
  
  echo -e "${GREEN}✅ Git hooks installed using symlinks${NC}"
  echo -e "Symlinks created to ensure hooks stay up-to-date with repository changes."
else
  # Copy hooks directly
  cp build/hooks/pre-commit .git/hooks/pre-commit
  cp build/hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
  
  echo -e "${GREEN}✅ Git hooks installed using file copies${NC}"
  echo -e "Files copied to .git/hooks directory."
fi

# List the hooks to verify installation
echo -e "\n${YELLOW}Verifying installation:${NC}"
ls -la .git/hooks/pre-commit .git/hooks/prepare-commit-msg

# Test if grep works correctly with the patterns
echo -e "\n${YELLOW}Testing pattern detection:${NC}"
TEST_STRING="Generated with [Claude Code]"
if echo "$TEST_STRING" | grep -q "Generated with \[Claude Code\]"; then
  echo -e "${GREEN}✅ Pattern detection working correctly${NC}"
else
  echo -e "${RED}❌ Pattern detection not working. Check grep patterns.${NC}"
fi

echo -e "\n${GREEN}Successfully installed all git hooks!${NC}"
echo -e "These hooks will prevent including AI attribution messages in commits and PRs."

exit 0