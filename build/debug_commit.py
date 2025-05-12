#!/usr/bin/env python3
"""
Debug script to check how the commit message is being processed
"""

import sys
import os

# Create a test commit message file
with open("/tmp/test_commit_msg", "w") as f:
    f.write("Feature: Implement People object support #2\n\n")
    f.write("- Added People API client module for interacting with Attio People\n")
    f.write("- Updated resource handlers to support People objects\n")
    f.write("- Added People-specific tools for searching, reading details, and managing notes\n")
    f.write("- Created comprehensive test suite for People functionality\n\n")
    f.write("🤖 Generated with [Claude Code](https://claude.ai/code)\n\n")
    f.write("Co-Authored-By: Claude <noreply@anthropic.com>")

# Set environment variable for the commit message file
os.environ["GIT_COMMIT_MSG_FILE"] = "/tmp/test_commit_msg"

# Import the validation script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from validate_workflow import validate_commit_message

# Read the commit message
with open("/tmp/test_commit_msg", "r") as f:
    commit_msg = f.read().strip()

# Print debug information
print(f"Commit message: {repr(commit_msg)}")
print(f"First line: {repr(commit_msg.split('\\n')[0])}")
print(f"First 20 chars: {repr(commit_msg[:20])}")

# Check if the message starts with any of the prefixes
prefixes = ["Feature:", "Fix:", "Docs:", "Documentation:", "Refactor:", "Test:", "Chore:"]
for prefix in prefixes:
    print(f"Starts with '{prefix}': {commit_msg.startswith(prefix)}")

# Try the validation
result = validate_commit_message(commit_msg)
print(f"Validation result: {result}")
