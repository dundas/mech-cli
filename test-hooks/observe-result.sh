#!/bin/bash
# PostToolUse hook that logs tool results

# Read JSON input from stdin
INPUT=$(cat)

# Parse tool info
TOOL_NAME=$(echo "$INPUT" | grep -o '"toolName":"[^"]*"' | cut -d'"' -f4)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log to file
LOG_FILE="${HOME}/.mech-cli-post-hooks.log"
echo "[$TIMESTAMP] PostToolUse: $TOOL_NAME" >> "$LOG_FILE"
echo "  Result: $INPUT" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# PostToolUse hooks observe but don't block
exit 0
