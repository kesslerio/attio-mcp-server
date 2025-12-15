#!/usr/bin/env python3
"""
Validate and package Attio workflow skill as .skill (ZIP) file.

Forked from anthropics/skills/skill-creator (Apache 2.0)
See LICENSE.txt for attribution.

Usage:
    python package_skill.py <skill-path> [output-dir]

Example:
    python package_skill.py ./my-lead-qualification
    python package_skill.py ./my-lead-qualification ./dist
"""

import argparse
import os
import sys
import zipfile
from pathlib import Path
from typing import List, Tuple

# Add script directory to path for imports when run from different directories
sys.path.insert(0, str(Path(__file__).parent))
from quick_validate import validate_skill


def get_files_to_package(skill_path: Path) -> List[Path]:
    """
    Get list of files to include in the skill package.

    Includes all files in the skill directory except:
    - Hidden files (starting with .)
    - __pycache__ directories
    - .pyc files

    Args:
        skill_path: Path to skill directory

    Returns:
        List of file paths relative to skill directory
    """
    files = []

    for root, dirs, filenames in os.walk(skill_path):
        # Skip hidden directories and __pycache__
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']

        for filename in filenames:
            # Skip hidden files and compiled Python
            if filename.startswith('.') or filename.endswith('.pyc'):
                continue

            file_path = Path(root) / filename
            files.append(file_path)

    return files


def create_package(skill_path: Path, output_dir: Path) -> Tuple[Path, List[str]]:
    """
    Create .skill ZIP package from skill directory.

    Args:
        skill_path: Path to skill directory
        output_dir: Directory for output .skill file

    Returns:
        Tuple of (package_path, list of packaged files)

    Raises:
        ValueError: If validation fails
    """
    # Validate first
    is_valid, messages = validate_skill(str(skill_path))
    if not is_valid:
        raise ValueError(f"Validation failed:\n" + "\n".join(f"  - {m}" for m in messages))

    # Get skill name from directory
    skill_name = skill_path.name
    package_name = f"{skill_name}.skill"
    package_path = output_dir / package_name

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get files to package
    files = get_files_to_package(skill_path)

    if not files:
        raise ValueError("No files to package")

    # Create ZIP package
    packaged_files = []
    with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in files:
            # Calculate archive path (relative to skill directory parent)
            # This preserves the skill directory name in the archive
            arcname = file_path.relative_to(skill_path.parent)
            zf.write(file_path, arcname)
            packaged_files.append(str(arcname))

    return package_path, packaged_files


def main():
    """CLI entry point for skill packaging."""
    parser = argparse.ArgumentParser(
        description='Package Attio workflow skill as .skill file',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
    python package_skill.py ./my-lead-qualification
    python package_skill.py ./my-lead-qualification ./dist

The output .skill file is a ZIP archive that can be imported into Claude.
        '''
    )

    parser.add_argument(
        'skill_path',
        help='Path to skill directory'
    )
    parser.add_argument(
        'output_dir',
        nargs='?',
        default='.',
        help='Output directory for .skill file (default: current directory)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show list of packaged files'
    )

    args = parser.parse_args()

    skill_path = Path(args.skill_path).resolve()
    output_dir = Path(args.output_dir).resolve()

    # Check skill path exists
    if not skill_path.exists():
        print(f"Error: Skill path does not exist: {skill_path}", file=sys.stderr)
        return 1

    if not skill_path.is_dir():
        print(f"Error: Skill path is not a directory: {skill_path}", file=sys.stderr)
        return 1

    try:
        print(f"Validating skill: {skill_path}")
        package_path, packaged_files = create_package(skill_path, output_dir)

        print(f"Package created: {package_path}")
        print(f"  Files included: {len(packaged_files)}")

        if args.verbose:
            print("\nPackaged files:")
            for f in sorted(packaged_files):
                print(f"  - {f}")

        print(f"\nTo use this skill, import {package_path} into Claude.")
        return 0

    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
