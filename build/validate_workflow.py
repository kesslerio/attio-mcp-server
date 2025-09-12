#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import re
import subprocess
import sys
from typing import List, Tuple


class Color:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"


def _disable_colors():
    Color.RED = ""
    Color.GREEN = ""
    Color.YELLOW = ""
    Color.BLUE = ""
    Color.BOLD = ""
    Color.END = ""


def print_error(message: str) -> None:
    print(f"{Color.RED}{Color.BOLD}ERROR:{Color.END} {message}")


def print_warning(message: str) -> None:
    print(f"{Color.YELLOW}{Color.BOLD}WARNING:{Color.END} {message}")


def print_success(message: str) -> None:
    print(f"{Color.GREEN}{Color.BOLD}SUCCESS:{Color.END} {message}")


def print_info(message: str) -> None:
    print(f"{Color.BLUE}{Color.BOLD}INFO:{Color.END} {message}")


def run_command(command: List[str]) -> Tuple[str, int]:
    try:
        result = subprocess.run(
            command,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        return result.stdout.strip(), result.returncode
    except FileNotFoundError:
        return "", 127
    except Exception as e:
        return str(e), 1


# ------------------------ Commit Message Validation ------------------------- #

def _allowed_prefixes_from_env(defaults: List[str]) -> List[str]:
    raw = os.environ.get("ALLOWED_PREFIXES", "")
    if not raw:
        return defaults
    # Split on comma or space, keep suffix ':' if provided; normalize spacing
    toks = [t.strip() for t in re.split(r"[\s,]+", raw) if t.strip()]
    # Ensure they end with ':' for our startswith check
    norm = [t if t.endswith(":") else t + ":" for t in toks]
    return norm or defaults


def validate_commit_message_text(msg: str, allow_no_issue: bool = False) -> bool:
    """Validate commit message against repo conventions.

    Accepts either our "Prefix: subject" style or Conventional Commits (e.g.,
    "feat(scope): subject"). Requires an issue reference unless bypassed.
    """
    first = (msg.splitlines()[0] if msg else "").strip()
    max_len = int(os.environ.get("COMMIT_TITLE_MAXLEN", "0"))  # 0 = disabled
    if max_len and len(first) > max_len:
        print_warning(f"Commit title is {len(first)} chars (>{max_len}). Consider tightening.")

    # Auto-allow merges/reverts/releases
    if first.startswith("Merge ") or first.startswith("Revert ") or first.startswith("Release "):
        print_info("Merge/Revert/Release commit detected — skipping prefix check")
        return True

    # 1) Prefix style (configurable)
    default_prefixes = [
        "Feature:", "Fix:", "Docs:", "Documentation:", "Refactor:",
        "Test:", "Chore:", "CI:", "Build:", "Perf:", "Hotfix:", "Release:",
    ]
    allowed_prefixes = _allowed_prefixes_from_env(default_prefixes)

    prefix_ok = any(first.lower().startswith(p.lower()) for p in allowed_prefixes)

    # 2) Conventional Commits style (type(scope)!?: ...)
    cc_types = (
        "feat|fix|docs|refactor|test|chore|ci|build|perf|revert|release|style"
    )
    cc_re = re.compile(rf"^(?:{cc_types})(?:\([^)]+\))?!?:\s+.+", re.IGNORECASE)
    cc_ok = bool(cc_re.match(first))

    if not (prefix_ok or cc_ok):
        print_error(
            "Commit message must start with one of: "
            + ", ".join(allowed_prefixes)
            + "  OR match Conventional Commits (e.g., 'feat: ...')."
        )
        print_error(f"First line was: '{first}'")
        return False

    # Issue reference requirement
    allow_no_issue = allow_no_issue or os.environ.get("ALLOW_NO_ISSUE", "").lower() in {"1", "true", "yes"}
    if not allow_no_issue:
        # Accept #123, ISSUE-123 (case-insensitive), or ABC-123 (Jira)
        issue_ok = bool(re.search(r"(#[0-9]+|issue-[0-9]+|[A-Z][A-Z0-9]+-[0-9]+)", msg, re.IGNORECASE))
        if not issue_ok:
            print_error("Commit message must reference an issue (e.g., #123, issue-123, or ABC-123)")
            return False

    print_success("Commit message format OK")
    return True


def validate_commit_message_file(path: str, allow_no_issue: bool = False) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            msg = f.read()
    except Exception as e:
        print_warning(f"Could not read commit message file '{path}': {e}")
        return False
    return validate_commit_message_text(msg, allow_no_issue=allow_no_issue)


# --------------------------- Branch Name Validation ------------------------- #

def get_current_branch() -> str:
    """Return the current git branch name (or 'HEAD' if detached)."""
    out, code = run_command(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    if code != 0 or not out:
        print_warning(f"Could not determine current branch: {out}")
        return ""
    return out.strip()


def validate_branch_name_text(name: str) -> bool:
    """Validate branch name against repo conventions.

    Allowed:
      - protected branches: main, master, develop, staging, production
      - type/TICKET[-slug]
          where type ∈ {feature, fix, hotfix, chore, docs, documentation, refactor, test, ci, perf, build, release}
          and TICKET ∈ {issue-<n>, <JIRAKEY>-<n>, <n>}
          slug is optional and may contain [a-z0-9._-]
    """
    protected = {"main", "master", "develop", "staging", "production"}
    if name in protected or name == "HEAD":
        print_success(f"Branch '{name}' is allowed")
        return True

    if " " in name:
        print_error("Branch name must not contain spaces")
        return False

    allowed_types = (
        "feature|fix|hotfix|chore|docs|documentation|refactor|test|ci|perf|build|release"
    )
    pattern = re.compile(
        rf"^(?:{allowed_types})/(?:issue-\d+|[A-Z][A-Z0-9]+-\d+|\d+)(?:-[a-z0-9._-]+)*$"
    )
    if pattern.fullmatch(name):
        print_success(f"Branch '{name}' matches naming convention")
        return True

    print_error(
        "Invalid branch name. Expected 'type/TICKET[-slug]' where type is one of "
        "feature, fix, hotfix, chore, docs, documentation, refactor, test, ci, perf, build, release "
        "and TICKET is issue-<n> / ABC-<n> / <n>."
    )

    lowered = name.lower()
    if lowered != name:
        print_info(f"Suggestion: use lowercase for the slug → '{lowered}'")

    parts = re.split(r"[/_-]", name)
    guess_issue = next((p for p in parts if p.isdigit()), "123")
    print_info("Examples: feature/issue-" + guess_issue + "-short-slug  |  fix/ABC-" + guess_issue)
    return False


# ---------------------------- Issue Closure Check --------------------------- #

def _ensure_gh() -> bool:
    out, code = run_command(["gh", "--version"])
    if code in (0,):
        return True
    print_error("GitHub CLI ('gh') not found. Install it or ensure it's on PATH.")
    return False

def _append_summary(lines: List[str]) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except Exception:
        pass

def validate_issue_closure(issue_id: str) -> bool:
    """Validate issue closure requirements with detailed feedback.

    - Lists each unchecked Markdown task list item ("- [ ] ...")
    - Verifies required narrative sections
    - Checks presence of required label categories (priority/type/status/area)
    - Writes a rich summary to $GITHUB_STEP_SUMMARY when running in Actions
    """
    if not _ensure_gh():
        return False

    # Get issue details using GitHub CLI
    output, exit_code = run_command(["gh", "issue", "view", issue_id])
    if exit_code != 0:
        print_error(f"Failed to retrieve issue #{issue_id}: {output}")
        return False

    # Parse labels (JSON) once for policy decisions
    labels_output, _ = run_command(["gh", "issue", "view", issue_id, "--json", "labels,body,title,number"])
    try:
        labels_data = json.loads(labels_output)
        label_names = [label["name"] for label in labels_data.get("labels", [])]
        issue_body = labels_data.get("body", "") or ""
    except (json.JSONDecodeError, KeyError) as e:
        print_error(f"Failed to parse labels for issue #{issue_id}: {e}")
        return False

    labels_lower = [l.lower() for l in label_names]

    # Label categories
    has_priority = any(re.fullmatch(r"p[0-5]", l) for l in labels_lower)
    has_type = any(l.startswith("type:") for l in labels_lower) or any(
        l in ["bug", "feature", "enhancement", "documentation", "test", "chore", "refactor", "ci", "dependencies"]
        for l in labels_lower
    )
    has_area = any(l.startswith("area:") for l in labels_lower)
    has_status = any(l.startswith("status:") for l in labels_lower)

    missing_label_categories = []
    if not has_priority:
        missing_label_categories.append("Priority (P0–P5)")
    if not has_type:
        missing_label_categories.append("Type (type:bug|feature|enhancement|documentation|test|chore|refactor|ci|dependencies)")
    if not has_area:
        missing_label_categories.append("Area (area:*)")
    if not has_status:
        missing_label_categories.append("Status (status:*)")

    if missing_label_categories:
        _append_summary([
            f"### Issue #{issue_id} validation",
            f"- ❌ Missing label categories: {', '.join(missing_label_categories)}"
        ])
        print_error(f"Issue #{issue_id} is missing required label categories: {', '.join(missing_label_categories)}")
        return False

    # ----- Acceptance Criteria policy -----
    # AC is enforced based on strict-mode and priority
    # Determine priority bucket
    priority = next((l.lower() for l in label_names if re.fullmatch(r"P[0-5]", l, re.I)), "").lower()
    is_high_priority = priority in ("p0", "p1", "p2")

    # Count checkboxes if any are present
    task_any = re.compile(r"(?m)^\s*[-*]\s*\[[ xX]\]\s+")
    task_open = re.compile(r"(?m)^\s*[-*]\s*\[\s\]\s+")
    total_boxes = len(task_any.findall(issue_body))
    unchecked_boxes = len(task_open.findall(issue_body))

    # Read global args from env to keep function signature simple
    strict_mode = os.environ.get("AC_STRICT_MODE", "auto")  # off|auto|strict
    require_sections = os.environ.get("REQUIRE_SECTIONS", "")  # comma-separated
    require_verification = os.environ.get("REQUIRE_VERIFICATION", "false").lower() == "true"

    def is_strict() -> bool:
        if strict_mode == "strict":
            return True
        if strict_mode == "off":
            return False
        # auto mode
        return is_high_priority or ("enforce:strict" in [l.lower() for l in label_names])

    # Enforce sections only if provided
    if require_sections:
        sections = [s.strip() for s in require_sections.split(",") if s.strip()]
        missing = [s for s in sections if s not in issue_body]
        if missing:
            if is_strict():
                print_error(f"Issue #{issue_id} missing required sections: {', '.join(missing)}")
                return False
            else:
                print_warning(f"Issue #{issue_id} missing optional sections: {', '.join(missing)}")

    # Enforce verification phrase only if requested
    if require_verification:
        if not re.search(r"(✅\s*)?verification\s*:", issue_body, re.IGNORECASE):
            if is_strict():
                print_error(f"Issue #{issue_id} missing verification section")
                return False
            else:
                print_warning(f"Issue #{issue_id} missing verification section")

    # Acceptance Criteria enforcement
    if total_boxes > 0 and unchecked_boxes > 0:
        msg = f"Issue #{issue_id} has {unchecked_boxes} unchecked acceptance criteria"
        if is_strict():
            print_error(msg)
            return False
        else:
            print_warning(msg)

    _append_summary([
        f"### Issue #{issue_id} validation",
        f"- Labels OK: {', '.join(label_names)}",
        f"- Acceptance criteria: {'OK' if unchecked_boxes == 0 else f'{unchecked_boxes} unchecked'}",
    ])

    print_success(f"Issue #{issue_id} meets all closure requirements")
    return True

# ---------------------------------- Main ----------------------------------- #

def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Attio MCP workflow requirements")
    parser.add_argument("--commit-msg-file", metavar="PATH", help="Validate a commit message file (Husky commit-msg hook passes $1)")
    parser.add_argument("--pre-commit", action="store_true", help="Run pre-commit validations")
    parser.add_argument("--validate-branch", action="store_true", help="Validate current git branch name")
    parser.add_argument("--issue-close", help="Validate issue closure requirements for the specified issue ID")
    parser.add_argument("--strict-mode", choices=["off","auto","strict"], default="auto")
    parser.add_argument("--require-sections", nargs="*", default=[])
    parser.add_argument("--require-verification", action="store_true")
    parser.add_argument("--allow-no-issue", action="store_true", help="Allow commit messages without issue references (or set ALLOW_NO_ISSUE=1)")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colors (or set NO_COLOR=1)")
    parser.add_argument("--print-config", action="store_true", help="Print current validation config and exit")

    args = parser.parse_args()

    # Color control
    if args.no_color or os.environ.get("NO_COLOR") or not sys.stdout.isatty():
        _disable_colors()

    if args.print_config:
        defaults = [
            "Feature:", "Fix:", "Docs:", "Documentation:", "Refactor:",
            "Test:", "Chore:", "CI:", "Build:", "Perf:", "Hotfix:", "Release:",
        ]
        print_info("Allowed commit prefixes: " + ", ".join(_allowed_prefixes_from_env(defaults)))
        print_info("Conventional Commit types allowed: feat, fix, docs, refactor, test, chore, ci, build, perf, revert, release, style")
        print_info("Require issue reference: " + ("no" if args.allow_no_issue or os.environ.get("ALLOW_NO_ISSUE", "").lower() in {"1", "true", "yes"} else "yes"))
        print_info(f"Strict-mode: {args.strict_mode}")
        if args.require_sections:
            print_info("Required sections: " + ", ".join(args.require_sections))
        print_info("Require verification: " + ("yes" if args.require_verification else "no"))
        return 0

    # Back-compat: tolerate --pre-commit alone
    if args.pre_commit and not (args.commit_msg_file or args.issue_close or args.validate_branch):
        print_info("--pre-commit: no-op (use lint-staged & dedicated hooks)")
        return 0

    if args.validate_branch:
        branch = get_current_branch()
        if not branch:
            return 1
        ok = validate_branch_name_text(branch)
        return 0 if ok else 1

    if args.commit_msg_file:
        ok = validate_commit_message_file(args.commit_msg_file, allow_no_issue=args.allow_no_issue)
        return 0 if ok else 1

    elif args.issue_close:
        # Pass policy via env (keeps current function signature)
        os.environ["AC_STRICT_MODE"] = args.strict_mode
        os.environ["REQUIRE_SECTIONS"] = ",".join(args.require_sections or [])
        os.environ["REQUIRE_VERIFICATION"] = "true" if args.require_verification else "false"
        if validate_issue_closure(args.issue_close):
            return 0
        else:
            return 1

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())