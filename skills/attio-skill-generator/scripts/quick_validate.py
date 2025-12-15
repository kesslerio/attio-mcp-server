#!/usr/bin/env python3
"""
Quick validation of SKILL.md frontmatter.

Forked from anthropics/skills/skill-creator (Apache 2.0)
See LICENSE.txt for attribution.

Usage:
    python quick_validate.py <skill-path>

Example:
    python quick_validate.py ./my-lead-qualification
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any

# Constraints from Claude Skills specification
MAX_NAME_LENGTH = 64
MAX_DESCRIPTION_LENGTH = 1024
NAME_PATTERN = re.compile(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
ALLOWED_FRONTMATTER_KEYS = {'name', 'description', 'license', 'allowed-tools', 'metadata'}


def parse_frontmatter(content: str) -> Tuple[Dict[str, Any], str]:
    """
    Parse YAML frontmatter from SKILL.md content.

    Expected format:
        ---
        name: skill-name
        description: Skill description
        ---

    Args:
        content: Full SKILL.md file content

    Returns:
        Tuple of (frontmatter_dict, body_content)

    Raises:
        ValueError: If frontmatter is malformed
    """
    if not content.startswith('---'):
        raise ValueError("SKILL.md must start with '---' frontmatter delimiter")

    # Find closing delimiter
    end_match = re.search(r'\n---\s*\n', content[3:])
    if not end_match:
        raise ValueError("SKILL.md frontmatter missing closing '---' delimiter")

    frontmatter_text = content[3:end_match.start() + 3]
    body = content[end_match.end() + 3:]

    # Parse YAML manually (avoid external dependency)
    frontmatter = {}
    current_key = None
    current_value_lines = []

    for line in frontmatter_text.split('\n'):
        # Skip empty lines
        if not line.strip():
            continue

        # Check for key: value pattern
        key_match = re.match(r'^([a-z][a-z0-9-]*)\s*:\s*(.*)$', line)
        if key_match:
            # Save previous key if exists
            if current_key:
                frontmatter[current_key] = '\n'.join(current_value_lines).strip()

            current_key = key_match.group(1)
            current_value_lines = [key_match.group(2)]
        elif current_key and line.startswith('  '):
            # Continuation of multi-line value
            current_value_lines.append(line.strip())

    # Save last key
    if current_key:
        frontmatter[current_key] = '\n'.join(current_value_lines).strip()

    return frontmatter, body


def validate_frontmatter(frontmatter: Dict[str, Any]) -> List[str]:
    """
    Validate frontmatter against Claude Skills requirements.

    Checks:
    - Required fields: name, description
    - name: hyphen-case, max 64 chars
    - description: max 1024 chars, no angle brackets
    - No unexpected keys

    Args:
        frontmatter: Parsed frontmatter dictionary

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    # Check for unexpected keys
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_FRONTMATTER_KEYS
    if unexpected_keys:
        errors.append(f"Unexpected frontmatter keys: {', '.join(sorted(unexpected_keys))}")

    # Validate name
    if 'name' not in frontmatter:
        errors.append("Missing required field: name")
    else:
        name = frontmatter['name']
        if not isinstance(name, str):
            errors.append("Field 'name' must be a string")
        else:
            if len(name) > MAX_NAME_LENGTH:
                errors.append(f"Name exceeds {MAX_NAME_LENGTH} characters: {len(name)}")
            if not NAME_PATTERN.match(name):
                if name[0].isupper():
                    errors.append("Name must start with lowercase letter")
                elif '--' in name:
                    errors.append("Name cannot contain consecutive hyphens")
                elif name.startswith('-') or name.endswith('-'):
                    errors.append("Name cannot start or end with hyphen")
                else:
                    errors.append("Name must be hyphen-case (lowercase, digits, hyphens)")

    # Validate description
    if 'description' not in frontmatter:
        errors.append("Missing required field: description")
    else:
        description = frontmatter['description']
        if not isinstance(description, str):
            errors.append("Field 'description' must be a string")
        else:
            if len(description) > MAX_DESCRIPTION_LENGTH:
                errors.append(f"Description exceeds {MAX_DESCRIPTION_LENGTH} characters: {len(description)}")
            if '<' in description or '>' in description:
                errors.append("Description cannot contain angle brackets (< or >)")

    return errors


def validate_skill_structure(skill_path: Path) -> List[str]:
    """
    Validate skill directory structure.

    Checks:
    - SKILL.md exists
    - resources/ directory exists (optional but recommended)
    - No broken internal links

    Args:
        skill_path: Path to skill directory

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        errors.append(f"Missing required file: SKILL.md")
        return errors  # Can't continue without SKILL.md

    # Check for resources directory
    resources_dir = skill_path / 'resources'
    if not resources_dir.exists():
        errors.append("Warning: resources/ directory not found (recommended)")

    return errors


def validate_skill(skill_path: str) -> Tuple[bool, List[str]]:
    """
    Perform complete skill validation.

    Args:
        skill_path: Path to skill directory

    Returns:
        Tuple of (is_valid, list of error/warning messages)
    """
    path = Path(skill_path).resolve()
    all_messages = []

    # Check path exists
    if not path.exists():
        return False, [f"Path does not exist: {path}"]

    if not path.is_dir():
        return False, [f"Path is not a directory: {path}"]

    # Validate structure
    structure_errors = validate_skill_structure(path)
    all_messages.extend(structure_errors)

    # If SKILL.md exists, validate content
    skill_md = path / 'SKILL.md'
    if skill_md.exists():
        try:
            content = skill_md.read_text()
            frontmatter, _ = parse_frontmatter(content)
            frontmatter_errors = validate_frontmatter(frontmatter)
            all_messages.extend(frontmatter_errors)
        except ValueError as e:
            all_messages.append(f"Frontmatter error: {e}")

    # Separate errors from warnings
    errors = [m for m in all_messages if not m.startswith('Warning')]
    warnings = [m for m in all_messages if m.startswith('Warning')]

    is_valid = len(errors) == 0

    # Combine with warnings at the end
    return is_valid, errors + warnings


def main():
    """CLI entry point for skill validation."""
    parser = argparse.ArgumentParser(
        description='Validate Attio workflow skill structure and frontmatter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
    python quick_validate.py ./my-lead-qualification
    python quick_validate.py ./generated-skills/acme-deal-management

Validation checks:
    - SKILL.md exists and has valid frontmatter
    - name: hyphen-case, max 64 characters
    - description: max 1024 characters, no angle brackets
    - Recommended: resources/ directory exists
        '''
    )

    parser.add_argument(
        'skill_path',
        help='Path to skill directory'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Only output errors, no success message'
    )

    args = parser.parse_args()

    is_valid, messages = validate_skill(args.skill_path)

    if messages:
        for msg in messages:
            prefix = "Warning" if msg.startswith("Warning") else "Error"
            if not msg.startswith("Warning"):
                prefix = "Error"
            print(f"  {msg}")

    if is_valid:
        if not args.quiet:
            print(f"Validation passed: {args.skill_path}")
        return 0
    else:
        print(f"Validation failed: {args.skill_path}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
