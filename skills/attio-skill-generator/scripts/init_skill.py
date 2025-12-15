#!/usr/bin/env python3
"""
Initialize a new Attio workflow skill directory structure.

Forked from anthropics/skills/skill-creator (Apache 2.0)
See LICENSE.txt for attribution.

Usage:
    python init_skill.py <skill-name> [--path <output-dir>]

Example:
    python init_skill.py my-lead-qualification --path ./generated-skills
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Tuple

# Constraints from Claude Skills specification
MAX_NAME_LENGTH = 64
NAME_PATTERN = re.compile(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$')


def validate_skill_name(name: str) -> Tuple[bool, str]:
    """
    Validate skill name against Claude Skills requirements.

    Requirements:
    - Hyphen-case (lowercase letters, digits, hyphens)
    - Max 64 characters
    - Must start with a letter
    - No consecutive hyphens
    - Cannot start or end with hyphen

    Args:
        name: Proposed skill name

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not name:
        return False, "Skill name cannot be empty"

    if len(name) > MAX_NAME_LENGTH:
        return False, f"Skill name must be {MAX_NAME_LENGTH} characters or less (got {len(name)})"

    if not NAME_PATTERN.match(name):
        if name[0].isupper() or name[0].isdigit():
            return False, "Skill name must start with a lowercase letter"
        if '--' in name:
            return False, "Skill name cannot contain consecutive hyphens"
        if name.startswith('-') or name.endswith('-'):
            return False, "Skill name cannot start or end with a hyphen"
        return False, "Skill name must be hyphen-case (lowercase letters, digits, hyphens only)"

    return True, ""


def create_skill_directory(skill_name: str, output_path: str) -> Path:
    """
    Create skill directory with Attio-specific structure.

    Creates:
        skill-name/
        ├── SKILL.md
        ├── resources/
        │   └── [placeholder files]
        └── references/
            └── [placeholder files]

    Args:
        skill_name: Validated skill name (hyphen-case)
        output_path: Parent directory for the skill

    Returns:
        Path to created skill directory
    """
    # Validate name
    is_valid, error = validate_skill_name(skill_name)
    if not is_valid:
        raise ValueError(error)

    # Create base directory
    output_dir = Path(output_path).resolve()
    skill_dir = output_dir / skill_name

    if skill_dir.exists():
        raise FileExistsError(f"Directory already exists: {skill_dir}")

    # Create directory structure
    skill_dir.mkdir(parents=True)
    (skill_dir / 'resources').mkdir()
    (skill_dir / 'references').mkdir()

    # Create SKILL.md template
    skill_md_content = f'''---
name: {skill_name}
description: TODO: Add a description for your skill (max 1024 characters)
---

# {skill_name.replace('-', ' ').title()}

TODO: Add your skill content here.

## When to Use This Skill

TODO: Describe when this skill should be used.

## Quick Links

- [Resources](resources/) - Supporting documentation
- [References](references/) - Reference materials

## Key Features

TODO: List the key features of this skill.

## Usage

TODO: Describe how to use this skill.
'''

    (skill_dir / 'SKILL.md').write_text(skill_md_content)

    # Create placeholder resource file
    resources_readme = '''# Resources

This directory contains supporting documentation for the skill.

## Files

TODO: Add your resource files here.

Common resource types:
- Workflow guides
- Tool references
- Example interactions
- Validation checklists
'''
    (skill_dir / 'resources' / 'README.md').write_text(resources_readme)

    # Create placeholder reference file
    references_readme = '''# References

This directory contains reference materials for the skill.

## Files

TODO: Add your reference files here.

Common reference types:
- API documentation
- Integration guides
- Technical specifications
'''
    (skill_dir / 'references' / 'README.md').write_text(references_readme)

    return skill_dir


def main():
    """CLI entry point for skill initialization."""
    parser = argparse.ArgumentParser(
        description='Initialize a new Attio workflow skill directory',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
    python init_skill.py my-lead-qualification
    python init_skill.py acme-deal-management --path ./custom-output

Skill names must be:
    - Hyphen-case (lowercase, digits, hyphens)
    - Max 64 characters
    - Start with a letter
        '''
    )

    parser.add_argument(
        'skill_name',
        help='Skill name (hyphen-case, max 64 chars)'
    )
    parser.add_argument(
        '--path',
        default='.',
        help='Output directory (default: current directory)'
    )

    args = parser.parse_args()

    try:
        skill_dir = create_skill_directory(args.skill_name, args.path)
        print(f"Skill initialized successfully: {skill_dir}")
        print()
        print("Next steps:")
        print(f"  1. Edit {skill_dir}/SKILL.md with your skill content")
        print(f"  2. Add resources to {skill_dir}/resources/")
        print(f"  3. Validate: python quick_validate.py {skill_dir}")
        print(f"  4. Package: python package_skill.py {skill_dir}")
        return 0
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except FileExistsError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
