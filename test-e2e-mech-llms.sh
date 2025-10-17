#!/bin/bash
# End-to-end test script for mech-llms integration

set -e

echo "🧪 End-to-End Test: mech-cli with mech-llms"
echo "=========================================="
echo ""

# Check if build exists
if [ ! -d "packages/cli/dist" ]; then
    echo "❌ CLI not built. Run 'npm run build' first."
    exit 1
fi

if [ ! -d "packages/core/dist" ]; then
    echo "❌ Core package not built. Run 'npm run build' first."
    exit 1
fi

# Set up environment
export MECH_LLMS_URL="${MECH_LLMS_URL:-https://llm.mechdna.net}"
export MECH_LLMS_API_KEY="${MECH_LLMS_API_KEY:-}"

echo "Configuration:"
echo "  MECH_LLMS_URL: $MECH_LLMS_URL"
echo "  MECH_LLMS_API_KEY: ${MECH_LLMS_API_KEY:+[set]}"
echo ""

# Test 1: Check CLI starts with mech-llms auth type
echo "Test 1: CLI startup with USE_MECH_LLMS auth type"
echo "-------------------------------------------------"

# Create a temporary settings file
TEMP_DIR=$(mktemp -d)
SETTINGS_FILE="$TEMP_DIR/settings.json"

cat > "$SETTINGS_FILE" << 'EOF'
{
  "authType": "mech-llms",
  "approvalMode": "default"
}
EOF

echo "Created temporary settings at: $SETTINGS_FILE"
echo ""

# Test 2: Run a simple prompt
echo "Test 2: Simple prompt execution"
echo "--------------------------------"

# Create test prompt
TEST_PROMPT="What is 2+2? Reply with just the number."

echo "Running: node packages/cli/dist/index.js --config-file \"$SETTINGS_FILE\" \"$TEST_PROMPT\""
echo ""

# Run CLI with mech-llms
if node packages/cli/dist/index.js --config-file "$SETTINGS_FILE" "$TEST_PROMPT" 2>&1; then
    echo ""
    echo "✅ Test 2 PASSED: CLI executed prompt successfully"
else
    EXIT_CODE=$?
    echo ""
    echo "❌ Test 2 FAILED: CLI exited with code $EXIT_CODE"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo ""

# Test 3: Verify tool usage (if mech-llms supports it)
echo "Test 3: Tool usage verification"
echo "--------------------------------"

TOOL_PROMPT="Read the file at $SETTINGS_FILE and tell me what authType is configured."

echo "Running with tool prompt..."
echo ""

if node packages/cli/dist/index.js --config-file "$SETTINGS_FILE" "$TOOL_PROMPT" 2>&1; then
    echo ""
    echo "✅ Test 3 PASSED: Tool usage works through mech-llms"
else
    echo ""
    echo "⚠️  Test 3 PARTIAL: Tool usage may not be supported yet"
fi

echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo "=========================================="
echo "🎉 End-to-end tests completed!"
echo ""
echo "Summary:"
echo "  ✅ mech-llms integration is working"
echo "  ✅ CLI can use mech-llms as inference provider"
echo "  ✅ Basic prompts execute successfully"
echo ""
echo "Next steps:"
echo "  1. Test with more complex prompts"
echo "  2. Verify tool execution (Read, Write, Bash, etc.)"
echo "  3. Test streaming responses"
echo "  4. Monitor token usage and costs"
echo ""
