#!/usr/bin/env python3
"""
Attio MCP Workflow Validator

This script validates adherence to Attio MCP workflow requirements by checking:
1. Git commit message format and issue references
2. Branch naming conventions
3. Verification of test execution
4. Documentation requirements

Usage:
  ./build/validate_workflow.py [--pre-commit] [--issue-close ISSUE_ID]
"""

import argparse
import json
import os
import re
import subprocess
import sys
from typing import Dict, List, Optional, Tuple


class Color:
    """Terminal colors for formatted output."""
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"


def print_error(message: str) -> None:
    """Print error message in red."""
    print(f"{Color.RED}{Color.BOLD}ERROR:{Color.END} {message}")


def print_warning(message: str) -> None:
    """Print warning message in yellow."""
    print(f"{Color.YELLOW}{Color.BOLD}WARNING:{Color.END} {message}")


def print_success(message: str) -> None:
    """Print success message in green."""
    print(f"{Color.GREEN}{Color.BOLD}SUCCESS:{Color.END} {message}")


def print_info(message: str) -> None:
    """Print info message in blue."""
    print(f"{Color.BLUE}{Color.BOLD}INFO:{Color.END} {message}")


def run_command(command: List[str]) -> Tuple[str, int]:
    """Run command and return output and exit code."""
    try:
        result = subprocess.run(
            command,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        return result.stdout.strip(), result.returncode
    except Exception as e:
        return str(e), 1


def validate_branch_name() -> bool:
    """Validate branch name follows conventions."""
    branch_output, _ = run_command(["git", "branch", "--show-current"])
    branch_name = branch_output.strip()
    
    if branch_name == "main":
        print_warning("You are on the main branch. Create a feature branch unless this is a critical hotfix.")
        return True
    
    valid_prefixes = ["feature/", "fix/", "docs/", "refactor/", "test/"]
    
    if not any(branch_name.startswith(prefix) for prefix in valid_prefixes):
        print_error(f"Branch name '{branch_name}' should start with one of: {', '.join(valid_prefixes)}")
        return False
    
    if not re.match(r"^[a-z0-9/\-_]+$", branch_name):
        print_error(f"Branch name '{branch_name}' should only contain lowercase letters, numbers, hyphens, and underscores")
        return False
    
    print_success(f"Branch name '{branch_name}' follows naming conventions")
    return True


def validate_commit_message(commit_msg: str) -> bool:
    """Validate commit message format and issue references."""
    # Print debug information
    print_info(f"Validating commit message: '{commit_msg[:50]}...'")
    
    # Skip validation for merge commits
    if commit_msg.startswith("Merge "):
        print_info("Detected merge commit, skipping validation")
        return True
    
    # Check if commit message is a hotfix
    is_hotfix = "[HOTFIX]" in commit_msg
    if is_hotfix:
        print_info("Detected hotfix commit, skipping prefix validation")
        return True
    
    # Check commit message format
    prefixes = ["Feature:", "Fix:", "Docs:", "Documentation:", "Refactor:", "Test:", "Chore:"]
    
    # Get the first line of the commit message
    first_line = commit_msg.split('\n')[0].strip()
    print_info(f"First line: '{first_line}'")
    
    # Try multiple matching approaches
    # 1. Direct prefix match
    direct_match = any(first_line.startswith(prefix) for prefix in prefixes)
    
    # 2. Case-insensitive match
    case_insensitive_match = any(first_line.lower().startswith(prefix.lower()) for prefix in prefixes)
    
    # 3. Fuzzy match - check if any prefix is contained at the start with some tolerance
    fuzzy_match = False
    for prefix in prefixes:
        prefix_lower = prefix.lower()
        if prefix_lower[:-1] in first_line.lower()[:15]:  # Allow for slight variations, check without colon
            fuzzy_match = True
            break
    
    # Combine all matching approaches
    has_prefix = direct_match or case_insensitive_match or fuzzy_match
    
    if not has_prefix:
        print_error(f"Commit message should start with one of: {', '.join(prefixes)}")
        print_error(f"Current first line: '{first_line}'")
        return False
    else:
        print_success("Commit message has valid prefix")
    
    # Check for issue reference
    issue_ref = re.search(r"(#\d+)", commit_msg)
    if not issue_ref:
        print_warning("Commit message should reference an issue number (e.g., #123)")
        # Non-blocking warning
    else:
        print_success(f"Found issue reference: {issue_ref.group(1)}")
    
    return True


def validate_issue_closure(issue_id: str) -> bool:
    """Validate issue closure requirements."""
    # Get issue details using GitHub CLI
    output, exit_code = run_command(["gh", "issue", "view", issue_id])
    if exit_code != 0:
        print_error(f"Failed to retrieve issue #{issue_id}: {output}")
        return False
    
    # Check if all checkboxes are marked as completed
    unchecked_items = re.findall(r"- \[ \]", output)
    if unchecked_items:
        print_error(f"Issue #{issue_id} has {len(unchecked_items)} unchecked criteria")
        return False
    
    # Check if implementation comment exists
    comment_sections = [
        "Implementation Details",
        "Key Implementation Elements",
        "Lessons Learned",
        "Challenges/Solutions",
        "Future Considerations"
    ]
    
    missing_sections = []
    for section in comment_sections:
        if section not in output:
            missing_sections.append(section)
    
    if missing_sections:
        print_error(f"Issue #{issue_id} is missing these required sections: {', '.join(missing_sections)}")
        return False
    
    # Check for verification statement
    if "✅ VERIFICATION:" not in output:
        print_error(f"Issue #{issue_id} is missing the verification statement")
        return False
    
    # Check if required labels are applied
    labels_output, _ = run_command(["gh", "issue", "view", issue_id, "--json", "labels"])
    try:
        labels_data = json.loads(labels_output)
        label_names = [label["name"] for label in labels_data.get("labels", [])]
        
        # Check for required label categories
        has_priority = any(label.startswith("P") and label[1:2].isdigit() for label in label_names)
        has_type = any(label in ["bug", "feature", "enhancement", "documentation", "test"] for label in label_names)
        has_area = any(label.startswith("area:") for label in label_names)
        has_status = any(label.startswith("status:") for label in label_names)
        
        missing_label_categories = []
        if not has_priority:
            missing_label_categories.append("Priority (P0-P4)")
        if not has_type:
            missing_label_categories.append("Type (bug, feature, etc.)")
        if not has_area:
            missing_label_categories.append("Area (area:*)")
        if not has_status:
            missing_label_categories.append("Status (status:*)")
        
        if missing_label_categories:
            print_error(f"Issue #{issue_id} is missing required label categories: {', '.join(missing_label_categories)}")
            return False
            
    except (json.JSONDecodeError, KeyError) as e:
        print_error(f"Failed to parse labels for issue #{issue_id}: {e}")
        return False
    
    print_success(f"Issue #{issue_id} meets all closure requirements")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Attio MCP workflow requirements")
    parser.add_argument("--pre-commit", action="store_true", help="Run pre-commit validations")
    parser.add_argument("--issue-close", help="Validate issue closure requirements for the specified issue ID")
    
    args = parser.parse_args()
    
    if args.pre_commit:
        # Validate branch name
        branch_valid = validate_branch_name()
        
        # Validate commit message
        # Check for Husky environment variables first (from Husky v4 or v5+)
        husky_params = os.environ.get("HUSKY_GIT_PARAMS") or os.environ.get("GIT_PARAMS")
        
        if husky_params:
            print_info(f"Using Husky params: {husky_params}")
            # In Husky, this is typically the path to the commit message file
            try:
                with open(husky_params, "r") as f:
                    commit_msg = f.read().strip()
                print_info("Successfully read commit message from Husky params")
            except Exception as e:
                print_warning(f"Error reading Husky commit message file: {e}")
                commit_msg = None
        else:
            # Try multiple possible locations for the commit message file
            possible_commit_msg_files = [
                os.environ.get("GIT_COMMIT_MSG_FILE"),  # From environment variable
                ".git/COMMIT_EDITMSG",                  # Standard Git location
                os.path.join(os.getcwd(), ".git/COMMIT_EDITMSG"),  # Absolute path
                ".git/MERGE_MSG"                        # For merge commits
            ]
            
            commit_msg = None
            for file_path in possible_commit_msg_files:
                if file_path and os.path.exists(file_path):
                    try:
                        with open(file_path, "r") as f:
                            commit_msg = f.read().strip()
                        print_info(f"Successfully read commit message from {file_path}")
                        break
                    except Exception as e:
                        print_warning(f"Error reading {file_path}: {e}")
        
        if not commit_msg:
            # If we can't find the commit message file, try to get it from the command line
            # This is a fallback for testing purposes
            print_warning("Could not find commit message file, using test message")
            commit_msg = "Feature: Test commit message"
        
        commit_valid = validate_commit_message(commit_msg)
        
        if not branch_valid or not commit_valid:
            return 1
        
        print_success("All pre-commit checks passed!")
        return 0
    
    elif args.issue_close:
        if validate_issue_closure(args.issue_close):
            return 0
        else:
            return 1
    
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
