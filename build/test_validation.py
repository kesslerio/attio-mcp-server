#!/usr/bin/env python3
"""
Test script for the validate_workflow.py's commit message validation
"""

from validate_workflow import validate_commit_message, Color

# Test cases with expected results (message, should_pass)
test_cases = [
    ("Feature: Implement People object support #2", True),
    ("feature: Implement People object support #2", True),
    (" Feature: Implement People object support #2", True),
    ("Feature:Implement People object support #2", True),
    ("Fix: Bug in API rate limiting #3", True),
    ("Docs: Update API documentation #4", True),
    ("Documentation: Add new usage examples #5", True),
    ("Refactor: Clean up error handling #6", True),
    ("Test: Add unit tests for rate limiter #7", True),
    ("Chore: Update dependencies #8", True),
    ("Adding new functionality", False),
    ("[HOTFIX] Critical security fix", True),
]

# Run tests
print(f"{Color.BOLD}Testing commit message validation...{Color.END}")
print("-" * 50)

passed = 0
failed = 0

for i, (message, expected) in enumerate(test_cases, 1):
    result = validate_commit_message(message)
    
    if result == expected:
        status = f"{Color.GREEN}PASS{Color.END}"
        passed += 1
    else:
        status = f"{Color.RED}FAIL{Color.END}"
        failed += 1
    
    print(f"Test {i}: {status} - \"{message}\"")
    print(f"  Expected: {expected}, Got: {result}")
    print()

print("-" * 50)
print(f"Results: {Color.GREEN}{passed} passed{Color.END}, {Color.RED}{failed} failed{Color.END} of {len(test_cases)} tests")
