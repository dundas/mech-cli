#!/bin/bash
# Comprehensive hook validation script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASSED=0
FAILED=0

echo "🧪 Hook System Validation"
echo "========================"
echo ""

# Test 1: Log Hook (PreToolUse - Should allow with exit 0)
echo "📝 Test 1: Log Hook (PreToolUse - Non-blocking)"
echo '{"sessionId":"validate-1","hookType":"PreToolUse","toolName":"Read","toolParams":{"file_path":"/tmp/test.txt"},"cwd":"/tmp","projectRoot":"/tmp","timestamp":1729147500}' | "${SCRIPT_DIR}/log-hook.sh" > /dev/null 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "  ✅ Exit code 0 (allow) - PASSED"
    if grep -q "validate-1" ~/.mech-cli-hooks.log; then
        echo "  ✅ Logged to ~/.mech-cli-hooks.log - PASSED"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ Not logged to file - FAILED"
        FAILED=$((FAILED + 1))
    fi
else
    echo "  ❌ Exit code $EXIT_CODE (expected 0) - FAILED"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Block Hook for Bash (Should block with exit 2)
echo "📝 Test 2: Block Hook for Bash (Should block)"
OUTPUT=$(echo '{"sessionId":"validate-2","hookType":"PreToolUse","toolName":"Bash","toolParams":{"command":"ls"},"cwd":"/tmp","projectRoot":"/tmp","timestamp":1729147600}' | "${SCRIPT_DIR}/block-shell.sh" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
    echo "  ✅ Exit code 2 (block) - PASSED"
    if echo "$OUTPUT" | grep -q '"block".*true'; then
        echo "  ✅ JSON response with 'block: true' - PASSED"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ Missing JSON block response - FAILED"
        echo "  Output: $OUTPUT"
        FAILED=$((FAILED + 1))
    fi
else
    echo "  ❌ Exit code $EXIT_CODE (expected 2) - FAILED"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Block Hook for Non-Bash (Should allow with exit 0)
echo "📝 Test 3: Block Hook for Non-Bash tools (Should allow)"
echo '{"sessionId":"validate-3","hookType":"PreToolUse","toolName":"Read","toolParams":{"file_path":"/tmp/test.txt"},"cwd":"/tmp","projectRoot":"/tmp","timestamp":1729147700}' | "${SCRIPT_DIR}/block-shell.sh" > /dev/null 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "  ✅ Exit code 0 (allow) - PASSED"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ Exit code $EXIT_CODE (expected 0) - FAILED"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Observe Hook (PostToolUse - Should always exit 0)
echo "📝 Test 4: Observe Hook (PostToolUse)"
echo '{"sessionId":"validate-4","hookType":"PostToolUse","toolName":"Write","toolParams":{"file_path":"/tmp/test.txt"},"toolResult":{"success":true},"cwd":"/tmp","projectRoot":"/tmp","timestamp":1729147800}' | "${SCRIPT_DIR}/observe-result.sh" > /dev/null 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "  ✅ Exit code 0 (observe) - PASSED"
    if grep -q "validate-4" ~/.mech-cli-post-hooks.log; then
        echo "  ✅ Logged to ~/.mech-cli-post-hooks.log - PASSED"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ Not logged to file - FAILED"
        FAILED=$((FAILED + 1))
    fi
else
    echo "  ❌ Exit code $EXIT_CODE (expected 0) - FAILED"
    FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "========================"
echo "📊 Test Summary"
echo "  ✅ Passed: $PASSED/4"
echo "  ❌ Failed: $FAILED/4"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All hook tests PASSED!"
    exit 0
else
    echo "❌ Some hook tests FAILED"
    exit 1
fi
