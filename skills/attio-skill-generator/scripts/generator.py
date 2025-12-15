#!/usr/bin/env python3
"""
Attio Workflow Skill Generator.

Generates use-case-specific Attio workflow skills by:
1. Loading use-case configuration (YAML)
2. Receiving workspace schema (JSON from Claude)
3. Rendering Handlebars templates with workspace data
4. Creating skill directory structure

This script is designed to be called by Claude after it has discovered
the workspace schema via MCP tools. The Python scripts are sandboxed
and cannot access APIs directly.

Usage:
    python generator.py --use-case lead-qualification --name my-skill --workspace-schema '<json>'

Example:
    python generator.py \\
        --use-case lead-qualification \\
        --name acme-lead-qualification \\
        --workspace-schema '{"objects": {...}, "lists": [...]}' \\
        --output ./generated-skills
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Try to import chevron for Handlebars templating
# If not available, use simple string replacement
try:
    import chevron
    HAS_CHEVRON = True
except ImportError:
    HAS_CHEVRON = False
    print("Warning: chevron not installed. Using basic template rendering.", file=sys.stderr)
    print("Install with: pip install chevron", file=sys.stderr)

# Try to import yaml
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("Warning: pyyaml not installed. Cannot load use-case configs.", file=sys.stderr)
    print("Install with: pip install pyyaml", file=sys.stderr)


# Available use cases
USE_CASES = {
    'lead-qualification': {
        'name': 'Lead Qualification',
        'description': 'Qualify and score inbound leads',
        'primary_object': 'companies',
        'secondary_objects': ['people'],
        'config_file': 'lead-qualification.yaml'
    },
    'deal-management': {
        'name': 'Deal Management',
        'description': 'Manage deals through pipeline stages',
        'primary_object': 'deals',
        'secondary_objects': ['companies'],
        'config_file': 'deal-management.yaml'
    },
    'customer-onboarding': {
        'name': 'Customer Onboarding',
        'description': 'Onboard new customers with structured workflows',
        'primary_object': 'companies',
        'secondary_objects': ['people', 'deals'],
        'config_file': 'customer-onboarding.yaml'
    }
}


def validate_skill_name(skill_name: str) -> None:
    """
    Validate skill name for security and format.

    Args:
        skill_name: The skill name to validate

    Raises:
        ValueError: If skill name is invalid or contains path traversal characters
    """
    # Security check: prevent path traversal
    if '/' in skill_name or '\\' in skill_name or '..' in skill_name:
        raise ValueError("Skill name cannot contain path separators or '..'")

    # Format check: must be hyphen-case
    if not re.match(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$', skill_name):
        if skill_name[0].isupper():
            raise ValueError("Skill name must start with lowercase letter")
        elif '--' in skill_name:
            raise ValueError("Skill name cannot contain consecutive hyphens")
        elif skill_name.startswith('-') or skill_name.endswith('-'):
            raise ValueError("Skill name cannot start or end with hyphen")
        else:
            raise ValueError("Skill name must be hyphen-case (lowercase, digits, hyphens only)")

    # Length check
    if len(skill_name) > 64:
        raise ValueError(f"Skill name exceeds 64 characters: {len(skill_name)}")


def get_script_dir() -> Path:
    """Get the directory containing this script."""
    return Path(__file__).parent.resolve()


def get_resources_dir() -> Path:
    """Get the resources directory (sibling to scripts)."""
    return get_script_dir().parent / 'resources'


def load_use_case_config(use_case: str) -> Dict[str, Any]:
    """
    Load use-case configuration from YAML file.

    Args:
        use_case: Use-case key (e.g., 'lead-qualification')

    Returns:
        Use-case configuration dictionary

    Raises:
        ValueError: If use-case not found or YAML not available
    """
    if use_case not in USE_CASES:
        available = ', '.join(USE_CASES.keys())
        raise ValueError(f"Unknown use case: {use_case}. Available: {available}")

    if not HAS_YAML:
        # Return basic config without YAML file
        return USE_CASES[use_case]

    config_file = get_resources_dir() / 'use-cases' / USE_CASES[use_case]['config_file']

    if not config_file.exists():
        # Fall back to basic config
        return USE_CASES[use_case]

    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)

    # Merge with base config, protecting critical fields
    # Only allow YAML to override specific fields, not core identity
    base = USE_CASES[use_case].copy()
    protected_fields = {'config_file'}  # Fields that should not be overwritten

    for key, value in config.items():
        if key not in protected_fields:
            base[key] = value

    return base


def load_template(template_name: str) -> str:
    """
    Load a Handlebars template file.

    Args:
        template_name: Template filename (e.g., 'SKILL.template.md')

    Returns:
        Template content as string

    Raises:
        FileNotFoundError: If template not found
    """
    template_path = get_resources_dir() / 'templates' / template_name

    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")

    return template_path.read_text()


def render_template(template: str, context: Dict[str, Any]) -> str:
    """
    Render a Handlebars template with the given context.

    Args:
        template: Template string
        context: Context dictionary for rendering

    Returns:
        Rendered template string
    """
    if HAS_CHEVRON:
        return chevron.render(template, context)

    # Basic fallback: simple variable replacement
    # This handles {{variable}} but not {{#each}} or {{#if}}
    result = template
    for key, value in _flatten_context(context).items():
        placeholder = '{{' + key + '}}'
        if isinstance(value, str):
            result = result.replace(placeholder, value)
        elif isinstance(value, (int, float)):
            result = result.replace(placeholder, str(value))

    return result


def _flatten_context(context: Dict[str, Any], prefix: str = '') -> Dict[str, Any]:
    """Flatten nested dictionary for simple template replacement."""
    result = {}
    for key, value in context.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(_flatten_context(value, full_key))
        else:
            result[full_key] = value
    return result


def build_context(
    use_case_config: Dict[str, Any],
    workspace_schema: Dict[str, Any],
    skill_name: str
) -> Dict[str, Any]:
    """
    Build the template rendering context.

    Args:
        use_case_config: Use-case configuration
        workspace_schema: Workspace schema from Claude
        skill_name: Name for the generated skill

    Returns:
        Context dictionary for template rendering
    """
    # Extract objects from workspace schema
    objects = workspace_schema.get('objects', {})
    lists = workspace_schema.get('lists', [])

    # Build object list for templates
    object_list = []
    for slug, obj_data in objects.items():
        obj_entry = {
            'slug': slug,
            'display_name': obj_data.get('display_name', slug.title()),
            'attributes': obj_data.get('attributes', [])
        }
        object_list.append(obj_entry)

    # Get primary object data
    primary_obj = use_case_config.get('primary_object', 'companies')
    primary_object_data = objects.get(primary_obj, {})

    return {
        'skill_name': skill_name,
        'skill_name_title': skill_name.replace('-', ' ').title(),
        'use_case': use_case_config,
        'workspace': {
            'objects': object_list,
            'lists': lists,
            'primary_object': primary_obj,
            'primary_object_data': primary_object_data
        },
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'generator_version': '1.0.0',
            'use_case_key': use_case_config.get('config_file', '').replace('.yaml', '')
        }
    }


def generate_skill(
    use_case: str,
    skill_name: str,
    workspace_schema: Dict[str, Any],
    output_dir: Path
) -> Path:
    """
    Generate a complete skill directory.

    Args:
        use_case: Use-case key
        skill_name: Name for the generated skill
        workspace_schema: Workspace schema dictionary
        output_dir: Output directory for the skill

    Returns:
        Path to generated skill directory
    """
    # Load use-case config
    use_case_config = load_use_case_config(use_case)

    # Validate skill name (security + format)
    validate_skill_name(skill_name)

    # Require chevron for full template rendering
    if not HAS_CHEVRON:
        raise RuntimeError(
            "chevron package required for template rendering. "
            "Install with: pip install chevron"
        )

    # Build context
    context = build_context(use_case_config, workspace_schema, skill_name)

    # Create skill directory
    skill_dir = output_dir / skill_name
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / 'resources').mkdir(exist_ok=True)
    (skill_dir / 'references').mkdir(exist_ok=True)

    # Generate SKILL.md
    try:
        skill_template = load_template('SKILL.template.md')
        skill_content = render_template(skill_template, context)
    except FileNotFoundError:
        # Generate basic SKILL.md if template not found
        skill_content = generate_basic_skill_md(context)

    (skill_dir / 'SKILL.md').write_text(skill_content)

    # Generate workflows.md
    try:
        workflows_template = load_template('workflows.template.md')
        workflows_content = render_template(workflows_template, context)
        (skill_dir / 'resources' / 'workflows.md').write_text(workflows_content)
    except FileNotFoundError:
        pass  # Optional file

    # Generate tool-reference.md
    try:
        tool_ref_template = load_template('tool-reference.template.md')
        tool_ref_content = render_template(tool_ref_template, context)
        (skill_dir / 'resources' / 'tool-reference.md').write_text(tool_ref_content)
    except FileNotFoundError:
        pass  # Optional file

    # Generate examples.md
    try:
        examples_template = load_template('examples.template.md')
        examples_content = render_template(examples_template, context)
        (skill_dir / 'resources' / 'examples.md').write_text(examples_content)
    except FileNotFoundError:
        pass  # Optional file

    return skill_dir


def generate_basic_skill_md(context: Dict[str, Any]) -> str:
    """
    Generate basic SKILL.md without templates.

    Used as fallback when templates are not available.
    """
    use_case = context['use_case']
    skill_name = context['skill_name']
    primary_obj = context['workspace'].get('primary_object', 'companies')

    return f'''---
name: {skill_name}
description: {use_case.get('description', 'Generated Attio workflow skill')} for your workspace. Use when working with {primary_obj}.
---

# {context['skill_name_title']}

{use_case.get('description', 'Generated workflow skill')}.

## When to Use This Skill

Use this skill when you need to work with {primary_obj} records in your Attio workspace.

## Primary Object: {primary_obj}

This workflow primarily operates on **{primary_obj}** records.

## Related Skills

- **attio-mcp-usage** - Universal MCP tool patterns and error prevention
- **attio-workspace-schema** - Your workspace-specific attribute slugs and option values

## Workflow Overview

{_generate_workflow_overview(use_case)}

---

*Generated by attio-skill-generator on {context['metadata']['generated_at']}*
'''


def _generate_workflow_overview(use_case: Dict[str, Any]) -> str:
    """Generate workflow overview section."""
    steps = use_case.get('workflow_steps', [])
    if not steps:
        return "See the use-case configuration for workflow details."

    overview = ""
    for i, step in enumerate(steps, 1):
        name = step.get('name', f'Step {i}')
        description = step.get('description', '')
        overview += f"### {i}. {name}\n\n{description}\n\n"

    return overview


def interactive_mode():
    """Interactive skill generation with prompts."""
    print("=== Attio Workflow Skill Generator ===\n")

    # 1. Use-case selection
    print("Available use cases:")
    for i, (key, config) in enumerate(USE_CASES.items(), 1):
        print(f"  {i}. {config['name']} - {config['description']}")

    while True:
        choice = input("\nSelect use case (1-3): ").strip()
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(USE_CASES):
                use_case = list(USE_CASES.keys())[idx]
                break
        except ValueError:
            pass
        print("Invalid choice. Enter 1, 2, or 3.")

    # 2. Skill name
    default_name = f"my-{use_case}"
    skill_name = input(f"\nSkill name [{default_name}]: ").strip() or default_name

    # Validate name immediately (security + format check)
    try:
        validate_skill_name(skill_name)
    except ValueError as e:
        print(f"Error: {e}")
        return

    # 3. Output directory
    output_dir = input("\nOutput directory [./generated-skills]: ").strip() or "./generated-skills"

    # 4. Workspace schema
    print("\n--- Workspace Schema ---")
    print("Tip: For large schemas, use CLI mode with --workspace-schema-file instead")
    print("\nPaste your workspace schema JSON (or press Enter for empty schema):")
    print("(End with an empty line)")

    schema_lines = []
    while True:
        line = input()
        if not line:
            break
        schema_lines.append(line)

    schema_text = '\n'.join(schema_lines).strip()
    if schema_text:
        try:
            workspace_schema = json.loads(schema_text)
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid JSON, using empty schema. Error: {e}")
            workspace_schema = {"objects": {}, "lists": []}
    else:
        workspace_schema = {"objects": {}, "lists": []}

    # 5. Generate
    print(f"\nGenerating {skill_name} skill...")

    skill_path = generate_skill(
        use_case=use_case,
        skill_name=skill_name,
        workspace_schema=workspace_schema,
        output_dir=Path(output_dir)
    )

    print(f"\nSkill generated at: {skill_path}")
    print("\nNext steps:")
    print(f"  1. Review and customize: {skill_path}/SKILL.md")
    print(f"  2. Validate: python quick_validate.py {skill_path}")
    print(f"  3. Package: python package_skill.py {skill_path}")


def main():
    """CLI entry point."""
    # Fail fast if required dependency is missing
    if not HAS_CHEVRON:
        print("Error: chevron package required for template rendering.", file=sys.stderr)
        print("Install with: pip install chevron", file=sys.stderr)
        return 1

    parser = argparse.ArgumentParser(
        description='Generate Attio workflow skills from templates',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
    # Interactive mode
    python generator.py --interactive

    # CLI mode with workspace schema
    python generator.py \\
        --use-case lead-qualification \\
        --name my-lead-skill \\
        --workspace-schema '{"objects": {...}}' \\
        --output ./generated-skills

Available use cases:
    - lead-qualification: Qualify and score inbound leads
    - deal-management: Manage deals through pipeline stages
    - customer-onboarding: Onboard new customers
        '''
    )

    parser.add_argument(
        '--use-case', '-u',
        choices=list(USE_CASES.keys()),
        help='Use case to generate'
    )
    parser.add_argument(
        '--name', '-n',
        help='Skill name (hyphen-case, max 64 chars)'
    )
    parser.add_argument(
        '--workspace-schema', '-w',
        help='Workspace schema as JSON string'
    )
    parser.add_argument(
        '--workspace-schema-file', '-f',
        help='Path to workspace schema JSON file'
    )
    parser.add_argument(
        '--output', '-o',
        default='./generated-skills',
        help='Output directory (default: ./generated-skills)'
    )
    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Interactive mode with prompts'
    )

    args = parser.parse_args()

    # Interactive mode
    if args.interactive or (not args.use_case and not args.name):
        interactive_mode()
        return 0

    # Validate required args for CLI mode
    if not args.use_case:
        print("Error: --use-case is required in CLI mode", file=sys.stderr)
        return 1

    if not args.name:
        args.name = f"my-{args.use_case}"

    # Load workspace schema
    workspace_schema = {"objects": {}, "lists": []}

    if args.workspace_schema_file:
        try:
            with open(args.workspace_schema_file) as f:
                workspace_schema = json.load(f)
        except Exception as e:
            print(f"Error loading schema file: {e}", file=sys.stderr)
            return 1
    elif args.workspace_schema:
        try:
            workspace_schema = json.loads(args.workspace_schema)
        except json.JSONDecodeError as e:
            print(f"Error parsing schema JSON: {e}", file=sys.stderr)
            return 1

    # Generate skill
    try:
        skill_path = generate_skill(
            use_case=args.use_case,
            skill_name=args.name,
            workspace_schema=workspace_schema,
            output_dir=Path(args.output)
        )

        print(f"Skill generated: {skill_path}")
        print("\nNext steps:")
        print(f"  1. Review: cat {skill_path}/SKILL.md")
        print(f"  2. Validate: python quick_validate.py {skill_path}")
        print(f"  3. Package: python package_skill.py {skill_path}")
        return 0

    except Exception as e:
        print(f"Error generating skill: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
