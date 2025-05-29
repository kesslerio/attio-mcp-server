#!/bin/bash
# Automated PR review script using claude -p with allowedTools support
# Usage: ./scripts/review-pr.sh <PR_NUMBER>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <PR_NUMBER>"
    echo "Example: $0 123"
    exit 1
fi

PR_NUMBER=$1

echo "🤖 Starting automated review for PR #$PR_NUMBER..."

# Verify required tools
for tool in gh jq claude; do
    if ! command -v $tool &> /dev/null; then
        echo "❌ $tool is required but not installed"
        exit 1
    fi
done

# Verify PR exists
if ! gh pr view $PR_NUMBER >/dev/null 2>&1; then
    echo "❌ PR #$PR_NUMBER not found"
    exit 1
fi

echo "📋 Fetching comprehensive PR details..."

# Get comprehensive PR information
PR_INFO=$(gh pr view $PR_NUMBER --json title,body,files,additions,deletions,author,createdAt,baseRefName,headRefName)
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
PR_BODY=$(echo "$PR_INFO" | jq -r '.body // ""')
PR_AUTHOR=$(echo "$PR_INFO" | jq -r '.author.login')
PR_CREATED=$(echo "$PR_INFO" | jq -r '.createdAt')
BASE_BRANCH=$(echo "$PR_INFO" | jq -r '.baseRefName')
HEAD_BRANCH=$(echo "$PR_INFO" | jq -r '.headRefName')
FILES_COUNT=$(echo "$PR_INFO" | jq -r '.files | length')
ADDITIONS=$(echo "$PR_INFO" | jq -r '.additions')
DELETIONS=$(echo "$PR_INFO" | jq -r '.deletions')

# Get all changed files
FILES_CHANGED=$(echo "$PR_INFO" | jq -r '.files[].path')

# Get file stats to determine review approach
DIFF_SIZE=$(gh pr diff $PR_NUMBER | wc -c)
echo "📊 Diff size: $DIFF_SIZE characters"

# Determine allowed tools and review approach
if [ $DIFF_SIZE -gt 100000 ]; then
    echo "⚠️ Large PR detected - using focused review approach"
    # For large PRs: get file summaries instead of full diff
    FILE_STATS=$(echo "$PR_INFO" | jq -r '.files[] | "\(.path): +\(.additions)/-\(.deletions)"')
    # Get just the diff headers and key changes
    PR_DIFF_SAMPLE=$(gh pr diff $PR_NUMBER | grep -E "^(diff|@@|\+\+\+|---|\+[^+]|\-[^-])" | head -200)
    REVIEW_TYPE="LARGE_PR_SUMMARY"
else
    echo "📝 Small/Medium PR - using detailed review approach"
    # For smaller PRs: get full diff
    PR_DIFF=$(gh pr diff $PR_NUMBER)
    REVIEW_TYPE="FULL_ANALYSIS"
fi

echo "🔍 Running Claude analysis ($REVIEW_TYPE)..."

# Create comprehensive review prompt
cat > /tmp/pr_review_prompt_${PR_NUMBER}.md << EOF
You are an expert code reviewer for the Attio MCP Server project.

Perform a comprehensive review of this Pull Request and provide output in the exact format below:

🎯 **Overview**
Brief summary of what this PR accomplishes and its scope

✅ **Strengths** 
- Key positive aspects and good practices followed
- Well-implemented features and patterns
- Good TypeScript usage and type safety

⚠️ **Critical Issues**
- Bugs or problems that must be fixed before merge
- Breaking changes or compatibility issues
- Security vulnerabilities or concerns

💡 **Suggestions**
- Code improvements and optimizations
- MCP schema compliance (avoid oneOf/allOf/anyOf at top level)
- TypeScript best practices and error handling
- Performance considerations

🧪 **Testing Requirements**
- What needs testing before merge
- Specific test scenarios to validate
- Integration test considerations

📋 **Action Items**
- [ ] Required changes for approval
- [ ] Recommended improvements
- [ ] Documentation updates needed

**Recommendation**: [APPROVE / REQUEST CHANGES / NEEDS DISCUSSION]

Focus on Attio MCP Server project conventions from CLAUDE.md, TypeScript standards, MCP protocol compliance, error handling, and actionable feedback.
EOF

# Create data file for claude -p
if [ "$REVIEW_TYPE" = "LARGE_PR_SUMMARY" ]; then
cat > /tmp/pr_data_${PR_NUMBER}.md << EOF
# PR #${PR_NUMBER} Review Data (Large PR - Summary Analysis)

## PR Information
**Title:** ${PR_TITLE}
**Author:** ${PR_AUTHOR}
**Created:** ${PR_CREATED}
**Branch:** ${HEAD_BRANCH} → ${BASE_BRANCH}
**Files Changed:** ${FILES_COUNT}
**Lines:** +${ADDITIONS}/-${DELETIONS}

**Description:**
${PR_BODY}

**File Change Summary:**
${FILE_STATS}

**Key Diff Patterns (Sample - 200 lines):**
\`\`\`diff
${PR_DIFF_SAMPLE}
\`\`\`

**Note:** This is a large PR (${DIFF_SIZE} chars). Review focuses on architecture, patterns, and high-level changes rather than line-by-line analysis.
EOF
else
cat > /tmp/pr_data_${PR_NUMBER}.md << EOF
# PR #${PR_NUMBER} Review Data

## PR Information
**Title:** ${PR_TITLE}
**Author:** ${PR_AUTHOR}
**Created:** ${PR_CREATED}
**Branch:** ${HEAD_BRANCH} → ${BASE_BRANCH}
**Files Changed:** ${FILES_COUNT}
**Lines:** +${ADDITIONS}/-${DELETIONS}

**Description:**
${PR_BODY}

**Files Modified:**
${FILES_CHANGED}

**Complete Diff:**
\`\`\`diff
${PR_DIFF}
\`\`\`
EOF
fi

# Run claude with the prompt and data using the allowed-tools flag
# Note: --allowedTools automatically outputs JSON conversation logs
claude -p /tmp/pr_review_prompt_${PR_NUMBER}.md --allowedTools "mcp__mcp-sequentialthinking-tools__sequentialthinking_tools" < /tmp/pr_data_${PR_NUMBER}.md > /tmp/review_output_json_${PR_NUMBER}.md

# Extract the actual review content from the JSON conversation log
# The --allowedTools flag causes Claude to output an array of conversation objects
# We need to find the last object with "type":"result" and extract its "result" field

# First, check if the output is valid JSON
if ! cat /tmp/review_output_json_${PR_NUMBER}.md | jq empty >/dev/null 2>&1; then
    echo "⚠️ Output is not valid JSON, treating as plain text"
    cp /tmp/review_output_json_${PR_NUMBER}.md /tmp/review_output_${PR_NUMBER}.md
elif cat /tmp/review_output_json_${PR_NUMBER}.md | jq -e '. | type == "array"' >/dev/null 2>&1; then
    # Extract from conversation log array - get the last result object
    RESULT_CONTENT=$(cat /tmp/review_output_json_${PR_NUMBER}.md | jq -r '.[] | select(.type == "result") | .result' | tail -1)
    if [ -n "$RESULT_CONTENT" ] && [ "$RESULT_CONTENT" != "null" ]; then
        echo "$RESULT_CONTENT" > /tmp/review_output_${PR_NUMBER}.md
    else
        echo "⚠️ No result content found in conversation log, using raw output"
        cp /tmp/review_output_json_${PR_NUMBER}.md /tmp/review_output_${PR_NUMBER}.md
    fi
else
    # Fallback: if it's not an array, try direct text extraction
    if cat /tmp/review_output_json_${PR_NUMBER}.md | jq -e '. | type == "string"' >/dev/null 2>&1; then
        cat /tmp/review_output_json_${PR_NUMBER}.md | jq -r '.' > /tmp/review_output_${PR_NUMBER}.md
    else
        # Last resort: use raw content (might be plain text that looks like JSON)
        cp /tmp/review_output_json_${PR_NUMBER}.md /tmp/review_output_${PR_NUMBER}.md
    fi
fi

# Check if review extraction succeeded
if [ ! -s /tmp/review_output_${PR_NUMBER}.md ]; then
    echo "⚠️ Failed to extract review content from Claude output."
    echo "Raw output saved to /tmp/review_output_json_${PR_NUMBER}.md for debugging"
    echo "First 200 characters of raw output:"
    head -c 200 /tmp/review_output_json_${PR_NUMBER}.md
    echo
    exit 1
fi

# Additional check: ensure the extracted content looks like a review (not empty or just JSON)
EXTRACTED_SIZE=$(wc -c < /tmp/review_output_${PR_NUMBER}.md)
if [ $EXTRACTED_SIZE -lt 50 ]; then
    echo "⚠️ Extracted review content seems too short ($EXTRACTED_SIZE chars)"
    echo "Content preview:"
    cat /tmp/review_output_${PR_NUMBER}.md
    echo
    echo "This may indicate a parsing issue. Raw output saved to /tmp/review_output_json_${PR_NUMBER}.md"
fi

echo "📝 Posting review to PR..."

# Post review as comment
gh pr comment $PR_NUMBER --body-file /tmp/review_output_${PR_NUMBER}.md

# Add automated review label
gh pr edit $PR_NUMBER --add-label "automated-review" 2>/dev/null || true

echo "✅ Review completed and posted to PR #$PR_NUMBER"
echo "🔗 View at: $(gh pr view $PR_NUMBER --json url -q .url)"

# Cleanup
rm /tmp/pr_review_prompt_${PR_NUMBER}.md /tmp/pr_data_${PR_NUMBER}.md /tmp/review_output_${PR_NUMBER}.md /tmp/review_output_json_${PR_NUMBER}.md

echo ""
echo "💡 Full detailed analysis completed using claude -p"
