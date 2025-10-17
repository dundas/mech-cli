# Hooks Implementation Guide for Mech-CLI

## Overview

This guide shows how to configure and use the hook system in mech-cli for meta-agent orchestration and approval workflows.

## Implementation Status

✅ **Core Hook System** - Complete
- HookManager service (packages/core/src/hooks/hook-manager.ts)
- Hook types and interfaces (packages/core/src/hooks/types.ts)
- Integration into CoreToolScheduler (packages/core/src/core/coreToolScheduler.ts)
- HOOK_BLOCKED error type (packages/core/src/tools/tool-error.ts)

✅ **Configuration Loading** - Complete
- `hooks` field added to settings schema (packages/cli/src/config/settingsSchema.ts)
- Hooks exported from core package (packages/core/src/index.ts)
- Hooks loaded from `settings.json` and passed to Config constructor (packages/cli/src/config/config.ts:647)

---

## How to Configure Hooks

### Option 1: Settings File (Recommended for Persistent Configuration)

**Location**: `~/.config/gemini-cli/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/me/.config/gemini-cli/hooks/log-all.sh",
            "timeout": 60000
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/me/.config/gemini-cli/hooks/approve-bash.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/me/.config/gemini-cli/hooks/report-results.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

### Option 2: Programmatic Configuration (For mech-codegen Orchestrator)

When spawning mech-cli programmatically, pass hooks via Config:

```typescript
import { Config } from '@google/gemini-cli-core';
import type { HooksConfig } from '@google/gemini-cli-core';

const hooksConfig: HooksConfig = {
  PreToolUse: [{
    matcher: "*",
    hooks: [{
      type: "command",
      command: "/path/to/mech-codegen-approval-hook.sh",
      timeout: 60000
    }]
  }],
  PostToolUse: [{
    matcher: "*",
    hooks: [{
      type: "command",
      command: "/path/to/mech-codegen-report-hook.sh",
      timeout: 5000
    }]
  }]
};

const config = new Config({
  // ... other config options
  hooks: hooksConfig  // Pass hooks here
});
```

### Option 3: Environment Variable (For Testing)

Set hooks via environment variable for quick testing:

```bash
export MECH_CLI_HOOKS_CONFIG='{"PreToolUse":[{"matcher":"*","hooks":[{"type":"command","command":"/path/to/hook.sh"}]}]}'
gemini --prompt "Do something"
```

---

## Hook Script Examples

### 1. **Approval Hook for mech-codegen**

`~/.config/gemini-cli/hooks/mech-approval.sh`:

```bash
#!/bin/bash
# Approval hook that asks mech-codegen orchestrator for permission

# Read JSON input from stdin
INPUT=$(cat)

# Parse tool info
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
TOOL_PARAMS=$(echo "$INPUT" | jq -r '.toolParams')
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId')

# Ask orchestrator for approval via API
RESPONSE=$(curl -s -X POST http://localhost:3012/api/approval \
  -H "Content-Type: application/json" \
  -d "{\"toolName\":\"$TOOL_NAME\",\"params\":$TOOL_PARAMS,\"sessionId\":\"$SESSION_ID\"}")

APPROVED=$(echo "$RESPONSE" | jq -r '.approved')

if [ "$APPROVED" = "true" ]; then
  # Approval granted
  exit 0
else
  # Approval denied - block execution
  MESSAGE=$(echo "$RESPONSE" | jq -r '.message // "Operation blocked by orchestrator"')
  cat <<EOF
{
  "block": true,
  "message": "$MESSAGE"
}
EOF
  exit 2  # Exit code 2 = block
fi
```

### 2. **Logging Hook**

`~/.config/gemini-cli/hooks/audit-log.sh`:

```bash
#!/bin/bash
# Log all tool usage for audit trail

INPUT=$(cat)

# Parse tool info
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId')

# Log to file and syslog
LOG_FILE="${HOME}/.gemini-cli-audit.log"
echo "[$TIMESTAMP] Session: $SESSION_ID | Tool: $TOOL_NAME" >> "$LOG_FILE"
logger -t gemini-cli "Tool execution: $TOOL_NAME (session: $SESSION_ID)"

# Always allow
exit 0
```

### 3. **Security Policy Hook**

`~/.config/gemini-cli/hooks/security-policy.sh`:

```bash
#!/bin/bash
# Block dangerous commands based on security policy

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
COMMAND=$(echo "$INPUT" | jq -r '.toolParams.command // empty')

# Block dangerous patterns
if [[ "$TOOL_NAME" == "Bash" ]]; then
  if [[ "$COMMAND" =~ rm\ .*-rf ]] || \
     [[ "$COMMAND" =~ sudo ]] || \
     [[ "$COMMAND" =~ chmod\ -R ]]; then
    cat <<EOF
{
  "block": true,
  "message": "Security policy blocks potentially dangerous commands. Please request approval."
}
EOF
    exit 2  # Block
  fi
fi

# Allow everything else
exit 0
```

### 4. **Results Reporting Hook (PostToolUse)**

`~/.config/gemini-cli/hooks/report-results.sh`:

```bash
#!/bin/bash
# Report tool results back to orchestrator

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
TOOL_RESULT=$(echo "$INPUT" | jq -r '.toolResult')
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId')

# Send results to orchestrator
curl -X POST http://localhost:3012/api/tool-results \
  -H "Content-Type: application/json" \
  -d "{\"toolName\":\"$TOOL_NAME\",\"result\":$TOOL_RESULT,\"sessionId\":\"$SESSION_ID\"}" \
  > /dev/null 2>&1

# PostToolUse hooks don't block
exit 0
```

---

## Hook Input/Output Protocol

### Input (via stdin as JSON)

```json
{
  "sessionId": "unique-session-id",
  "hookType": "PreToolUse",
  "toolName": "Read",
  "toolParams": {
    "file_path": "/tmp/test.txt"
  },
  "toolResult": {
    "success": true,
    "output": "..."
  },
  "cwd": "/current/working/dir",
  "projectRoot": "/project/root",
  "timestamp": 1234567890
}
```

### Output (exit code + optional JSON)

**Exit Code 0** - Allow operation:
```bash
exit 0
```

**Exit Code 2** - Block operation (PreToolUse only):
```bash
cat <<EOF
{
  "block": true,
  "message": "Operation blocked for security reasons",
  "context": {"reason": "approval_required"}
}
EOF
exit 2
```

---

## Mech-Codegen Integration Example

### Orchestrator Spawns Gemini CLI with Hooks

```typescript
// In mech-codegen orchestrator

import { spawn } from 'child_process';

function executeSubAgent(prompt: string, sessionId: string) {
  const gemini = spawn('gemini', [
    '--prompt', prompt,
    '--output-format', 'stream-json',
    '--approval-mode', 'default'  // Let hooks decide
  ], {
    env: {
      ...process.env,
      // Hooks configured via settings.json or programmatically
    }
  });

  // Monitor progress via streaming JSON
  gemini.stdout.on('data', (data) => {
    const events = data.toString().split('\n').filter(Boolean);
    events.forEach(event => {
      const parsed = JSON.parse(event);
      handleEvent(parsed);  // UI updates, logging, etc.
    });
  });

  return gemini;
}
```

### Approval Endpoint in mech-codegen

```typescript
// mech-codegen API endpoint for hook approvals

app.post('/api/approval', async (req, res) => {
  const { toolName, params, sessionId } = req.body;

  // Check orchestrator's plan/state
  const task = await getTaskForSession(sessionId);
  const shouldApprove = await checkAgainstPlan(task, toolName, params);

  if (shouldApprove) {
    res.json({ approved: true });
  } else {
    res.json({
      approved: false,
      message: `Tool ${toolName} not authorized in current task context`
    });
  }
});
```

---

## Usage Examples

### Interactive Mode with Hooks
```bash
gemini  # Hooks execute automatically based on settings.json
```

### Headless Mode with Hooks
```bash
# JSON output for parsing
gemini -p "Deploy the app" --output-format json

# Streaming JSON for real-time monitoring
gemini -p "Build and test" --output-format stream-json

# Hooks still execute and can block operations!
```

### Testing Hooks
```bash
# Test individual hooks
echo '{"toolName":"Bash","toolParams":{"command":"ls"},"sessionId":"test","hookType":"PreToolUse","cwd":"/tmp","projectRoot":"/tmp","timestamp":1234567890}' | ~/.config/gemini-cli/hooks/security-policy.sh
echo "Exit code: $?"

# Test in real session
gemini -p "List files" --debug  # Debug mode shows hook execution
```

---

## Testing the Implementation

Now that hooks are fully implemented and integrated, you can test them in three ways:

### 1. Test via Settings File

```bash
cd /Users/kefentse/dev_env/mech/mech-cli

# Add hooks to settings
cat > ~/.config/gemini-cli/settings.json <<EOF
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "$PWD/test-hooks/log-hook.sh",
        "timeout": 5000
      }]
    }]
  }
}
EOF

# Test
npm run build
node bundle/gemini.js -p "What is 2+2?" --debug
```

### 2. Test via Programmatic Configuration

```typescript
import { Config, HooksConfig } from '@google/gemini-cli-core';

const hooksConfig: HooksConfig = {
  PreToolUse: [{
    matcher: "*",
    hooks: [{
      type: "command",
      command: "/path/to/hook.sh",
      timeout: 60000
    }]
  }]
};

const config = new Config({
  hooks: hooksConfig,
  // ... other config
});
```

### 3. Test via Environment Variable

```bash
export MECH_CLI_HOOKS_CONFIG='{"PreToolUse":[{"matcher":"*","hooks":[{"type":"command","command":"/path/to/hook.sh"}]}]}'
node bundle/gemini.js -p "Test prompt"
```

---

## Debugging Hooks

### Enable Debug Mode
```bash
gemini -p "Test" --debug
```

Hook execution is logged to stderr:
```
[Hook] Executing: /path/to/hook.sh
[Hook] Input: {"toolName":"Read",...}
[Hook] Completed in 42ms with exit code 0
```

### Check Hook Logs
```bash
# View audit log
tail -f ~/.gemini-cli-audit.log

# View PreToolUse logs
tail -f ~/.mech-cli-hooks.log

# View PostToolUse logs
tail -f ~/.mech-cli-post-hooks.log
```

---

## Security Considerations

1. **Hook Scripts Must Be Executable**
   ```bash
   chmod +x ~/.config/gemini-cli/hooks/*.sh
   ```

2. **Hook Timeouts** - Default 60 seconds, configurable:
   ```json
   {
     "hooks": [{
       "type": "command",
       "command": "/path/to/slow-hook.sh",
       "timeout": 120000  // 2 minutes
     }]
   }
   ```

3. **Untrusted Workspaces** - Hooks from workspace settings.json are disabled in untrusted folders

4. **Environment Variables** - Hooks receive:
   - `GEMINI_SESSION_ID` - Unique session identifier
   - `GEMINI_PROJECT_ROOT` - Project root directory
   - All parent process environment variables

---

## Summary

The hook system is fully implemented at the core level. To use it:

**For Testing (Now)**:
1. Create hook scripts in `test-hooks/` directory
2. Make them executable: `chmod +x test-hooks/*.sh`
3. Pass hooks programmatically to Config constructor

**For Production (After Config Integration)**:
1. Add `hooks` to settings schema
2. Configure hooks in `~/.config/gemini-cli/settings.json`
3. Hooks automatically load and execute

**For mech-codegen Integration**:
1. Create approval hook that calls mech-codegen API
2. Configure via settings.json or programmatically
3. Use headless mode with streaming JSON for monitoring
4. Hooks provide active control, streaming provides passive observation
