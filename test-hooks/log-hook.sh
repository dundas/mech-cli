#!/bin/bash
# Simple logging hook - logs all tool usage to a file

# Read JSON input from stdin
INPUT=$(cat)

# Parse hook type and tool name
HOOK_TYPE=$(echo "$INPUT" | grep -o '"hookType":"[^"]*"' | cut -d'"' -f4)
TOOL_NAME=$(echo "$INPUT" | grep -o '"toolName":"[^"]*"' | cut -d'"' -f4)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log to file
LOG_FILE="${HOME}/.mech-cli-hooks.log"
echo "[$TIMESTAMP] $HOOK_TYPE: $TOOL_NAME" >> "$LOG_FILE"
echo "  Input: $INPUT" >> "$LOG_FILE"

# Exit with success (don't block)
exit 0
