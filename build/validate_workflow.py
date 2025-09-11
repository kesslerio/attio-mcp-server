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
    except Exception as e:
        return str(e), 1


def validate_commit_message_text(msg: str) -> bool:
    """Validate commit message against repo conventions.

    Rules:
    - Allow merges/reverts automatically.
    - First line must start with one of the allowed prefixes.
    - Must reference an issue like #123 somewhere (unless merge/revert).
    """
    first = (msg.splitlines()[0] if msg else "").strip()

    # Auto-allow merges/reverts/releases/cherry-picks
    if first.startswith("Merge ") or first.startswith("Revert ") or first.startswith("Release "):
        print_info("Merge/Revert/Release commit detected — skipping prefix check")
        return True

    allowed = [
        "Feature:",
        "Fix:",
        "Docs:",
        "Documentation:",
        "Refactor:",
        "Test:",
        "Chore:",
    ]

    if not any(first.lower().startswith(p.lower()) for p in allowed):
        print_error("Commit message must start with one of: " + ", ".join(allowed))
        print_error(f"First line was: '{first}'")
        return False

    # Require an issue reference
    if not re.search(r"#\d+", msg):
        print_error("Commit message must reference an issue (e.g., #123)")
        return False

    print_success("Commit message format OK")
    return True


def validate_commit_message_file(path: str) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            msg = f.read()
    except Exception as e:
        print_warning(f"Could not read commit message file '{path}': {e}")
        return False
    return validate_commit_message_text(msg)


def validate_issue_closure(issue_id: str) -> bool:
    """Validate issue closure requirements with detailed feedback.

    - Lists each unchecked Markdown task list item ("- [ ] ...")
    - Verifies required narrative sections
    - Checks presence of required label categories (priority/type/status/area)
    - Writes a rich summary to $GITHUB_STEP_SUMMARY when running in Actions
    """
    # Fetch issue data as JSON via GitHub CLI
    data_json, exit_code = run_command([
        "gh", "issue", "view", issue_id,
        "--json", "body,labels,number,title,url",
    ])
    if exit_code != 0:
        print_error(f"Failed to retrieve issue #{issue_id}: {data_json}")
        return False

    try:
        data = json.loads(data_json)
    except json.JSONDecodeError as e:
        print_error(
            f"Failed to parse JSON from gh for issue #{issue_id}: {e}\nRaw: {data_json[:200]}..."
        )
        return False

    body = (data.get("body") or "")
    labels = [(l or {}).get("name", "") for l in (data.get("labels") or [])]
    labels_lower = [l.lower() for l in labels]

    # 1) Find unchecked checklist items in the body
    # Match lines like: "- [ ] thing" possibly indented or nested
    unchecked_pattern = re.compile(r"(?m)^[\s>*-]*-\s\[\s\]\s+(.*)$")
    unchecked_items = unchecked_pattern.findall(body)

    if unchecked_items:
        print_error(f"Issue #{issue_id} has {len(unchecked_items)} unchecked criteria")
        for idx, item in enumerate(unchecked_items, 1):
            print(f"  {idx:2d}. {item}")
    else:
        print_success("All checklist items are checked")

    # 2) Required narrative sections
    comment_sections = [
        "Implementation Details",
        "Key Implementation Elements",
        "Lessons Learned",
        "Challenges/Solutions",
        "Future Considerations",
    ]
    missing_sections = []
    for section in comment_sections:
        # Look for the section title anywhere (header or plain text)
        if not re.search(rf"(?mi)^\s*(#{1,6}\s*)?{re.escape(section)}\b", body):
            missing_sections.append(section)

    if missing_sections:
        print_error(
            f"Issue #{issue_id} is missing these required sections: {', '.join(missing_sections)}"
        )
    else:
        print_success("All required narrative sections present")

    # 3) Verification statement
    verification_ok = bool(re.search(r"(?i)✅\s*VERIFICATION:\s*", body))
    if not verification_ok:
        print_error("Missing verification statement (expected '✅ VERIFICATION: ...')")
    else:
        print_success("Verification statement found")

    # 4) Required label categories (robust detection)
    has_priority = any(re.fullmatch(r"p[0-5]", l) for l in labels_lower)
    has_type = any(l.startswith("type:") for l in labels_lower) or any(
        l in [
            "bug",
            "feature",
            "enhancement",
            "documentation",
            "test",
            "chore",
            "refactor",
            "ci",
            "dependencies",
        ]
        for l in labels_lower
    )
    has_area = any(l.startswith("area:") for l in labels_lower)
    has_status = any(l.startswith("status:") for l in labels_lower)

    missing_label_categories = []
    if not has_priority:
        missing_label_categories.append("Priority (P0–P5)")
    if not has_type:
        missing_label_categories.append(
            "Type (type:bug|feature|enhancement|documentation|test|chore|refactor|ci|dependencies)"
        )
    if not has_area:
        missing_label_categories.append("Area (area:*)")
    if not has_status:
        missing_label_categories.append("Status (status:*)")

    if missing_label_categories:
        print_error(
            "Missing required label categories: " + ", ".join(missing_label_categories)
        )
    else:
        print_success("All required label categories present")

    # 5) Write GitHub Actions Step Summary if available
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        try:
            with open(summary_path, "a", encoding="utf-8") as f:
                f.write(
                    f"## Issue #{data.get('number')} — {data.get('title', '').strip()}\n\n"
                )
                if data.get("url"):
                    f.write(f"[Open in GitHub]({data['url']})\n\n")
                f.write(f"**Unchecked criteria:** {len(unchecked_items)}\n\n")
                if unchecked_items:
                    for item in unchecked_items:
                        f.write(f"- {item}\n")
                    f.write("\n")
                f.write("**Required label categories**\n")
                f.write(f"- Priority (P0–P5): {'✅' if has_priority else '❌'}\n")
                f.write(f"- Type (type:*): {'✅' if has_type else '❌'}\n")
                f.write(f"- Status (status:*): {'✅' if has_status else '❌'}\n")
                f.write(f"- Area (area:*): {'✅' if has_area else '❌'}\n\n")
                if missing_sections:
                    f.write("**Missing narrative sections**\n")
                    for s in missing_sections:
                        f.write(f"- {s}\n")
                    f.write("\n")
        except Exception as e:
            print_warning(f"Could not write step summary: {e}")

    all_ok = (
        not unchecked_items
        and not missing_sections
        and verification_ok
        and not missing_label_categories
    )

    if all_ok:
        print_success(f"Issue #{issue_id} meets all closure requirements")
        return True

    print_info(
        f"Review the issue and check off remaining items: gh issue view {issue_id} --web"
    )
    return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Attio MCP workflow requirements"
    )
    parser.add_argument(
        "--commit-msg-file",
        metavar="PATH",
        help="Validate a commit message file (Husky commit-msg hook passes $1)",
    )
    parser.add_argument(
        "--pre-commit",
        action="store_true",
        help="Backward-compatible flag; no-op because lint-staged handles formatting",
    )
    parser.add_argument(
        "--issue-close",
        metavar="ISSUE_ID",
        help="Validate issue closure requirements for the specified issue ID",
    )

    args = parser.parse_args()

    # Back-compat: some hooks may still call with --pre-commit; don't fail hard
    if args.pre_commit and not (args.commit_msg_file or args.issue_close):
        print_info("--pre-commit: no-op (use lint-staged & dedicated hooks)")
        return 0

    if args.commit_msg_file:
        ok = validate_commit_message_file(args.commit_msg_file)
        return 0 if ok else 1

    if args.issue_close:
        ok = validate_issue_closure(args.issue_close)
        return 0 if ok else 1

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
