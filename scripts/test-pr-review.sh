#!/bin/bash
# Test script for PR review functionality
# This script tests the JSON parsing functionality of review-pr.sh without actually posting to GitHub

set -e

echo "🧪 Testing PR review JSON extraction..."

# Create a sample JSON output similar to what Claude would produce
cat > /tmp/sample_claude_json.md << EOF
{
  "type": "result",
  "subtype": "success",
  "cost_usd": 0.12345,
  "is_error": false,
  "duration_ms": 12345,
  "duration_api_ms": 12345,
  "num_turns": 3,
  "result": "## Test PR Review\n\nThis is a test review to verify JSON extraction is working properly.\n\n### ✅ Strengths\n- Properly extracts content\n- Handles JSON format\n- Provides fallback\n\n**Recommendation: APPROVE**",
  "total_cost": 0.12345,
  "session_id": "test-session-id"
}
EOF

# Test the extraction with jq
echo "Testing JSON extraction..."
cat /tmp/sample_claude_json.md | jq -r '.result' > /tmp/extracted_review.md

# Verify the result
if grep -q "Test PR Review" /tmp/extracted_review.md && grep -q "Recommendation: APPROVE" /tmp/extracted_review.md; then
    echo "✅ Test passed: JSON extraction working properly"
    cat /tmp/extracted_review.md
else
    echo "❌ Test failed: JSON extraction did not produce expected output"
    echo "Expected content about PR Review and recommendation"
    echo "Actual content:"
    cat /tmp/extracted_review.md
fi

# Test fallback with malformed JSON
echo "Testing fallback with malformed JSON..."
echo "{malformed json" > /tmp/malformed_json.md
cat /tmp/malformed_json.md | jq -r '.result' 2>/dev/null > /tmp/extracted_malformed.md || true

if [ ! -s /tmp/extracted_malformed.md ]; then
    echo "✅ Test passed: Empty file detection works for fallback"
else
    echo "❌ Test failed: Expected empty file for malformed JSON"
fi

# Cleanup
echo "Cleaning up test files..."
rm /tmp/sample_claude_json.md /tmp/extracted_review.md /tmp/malformed_json.md /tmp/extracted_malformed.md

echo "✅ All tests completed"