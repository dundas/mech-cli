#!/bin/bash
# Hook that blocks Bash tool execution with exit code 2

# Read JSON input from stdin
INPUT=$(cat)

# Parse tool name
TOOL_NAME=$(echo "$INPUT" | grep -o '"toolName":"[^"]*"' | cut -d'"' -f4)

# Block if it's the Bash tool
if [ "$TOOL_NAME" = "Bash" ]; then
  # Output JSON response with blocking message
  cat <<EOF
{
  "block": true,
  "message": "Bash tool execution is blocked by security policy. Please request approval first."
}
EOF
  exit 2  # Exit code 2 means block
fi

# Allow other tools
exit 0
