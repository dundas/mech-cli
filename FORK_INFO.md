# Mech-CLI - Gemini CLI Fork

**Fork of**: [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
**Fork repository**: [dundas/mech-cli](https://github.com/dundas/mech-cli)
**Status**: ✅ Successfully built from source

## Fork Purpose

Create **mech-cli**, a customized version of Google's Gemini CLI optimized for:
- Meta-agent orchestration
- Integration with mech-llms (centralized LLM access)
- Cost tracking and optimization
- Session management
- External hook system for approval workflow

## Why Fork Gemini CLI?

### Cost Comparison
- **Claude Code**: $0.05 per task → $50/day for 1000 tasks (NOT sustainable)
- **Gemini FREE tier**: 60 req/min, 1000 req/day with personal Google account → $0/day

### Key Advantages
- 🎯 **Free tier**: 60 requests/min and 1,000 requests/day with personal Google account
- 🧠 **Powerful Gemini 2.5 Pro**: 1M token context window
- 🔧 **Built-in tools**: Read, Edit, Bash, Glob, Grep, Web fetch, Google Search grounding
- 🔌 **Extensible**: MCP (Model Context Protocol) support for custom integrations
- 💻 **Terminal-first**: Designed for developers who live in the command line
- 🛡️ **Open source**: Apache 2.0 licensed

## Original Features (Keeping)

### ✅ Core Features
- **File System Tools**: Read, Edit, Write with workspace awareness
- **Shell Commands**: Full bash execution with sandbox support
- **Web Tools**: Fetch and search with Google Search grounding
- **Extensions**: Plugin system for custom functionality
- **MCP Servers**: Connect external tools and services
- **Checkpointing**: Save and resume conversation state
- **Approval Modes**: default, auto_edit, yolo
- **Sandbox**: macOS Seatbelt, Docker, Podman support

## Planned Customizations

### 🔄 Meta-Agent Integration
- Hook system compatible with mech-codegen orchestrator
- Bidirectional communication for approval workflow
- Event-driven architecture for tool execution

### 💰 Cost Tracking
- Track token usage and API costs per session
- Cost reporting and optimization suggestions
- Budget limits and alerts

### 📊 Session Management
- Persistent session storage in MongoDB
- Session resume across restarts
- Session analytics and history

### 🪝 External Hook System
- Pre-tool-use hooks for approval workflow
- Post-tool-use hooks for result validation
- Task-level hooks for orchestration

### 🔗 mech-llms Integration
- Optional routing through mech-llms for centralized access
- Fallback to direct Gemini API
- Multi-provider support (Gemini, Claude, GPT-4)

## Build Setup

### ✅ Successful Build Configuration

**Location**: `/Users/kefentse/dev_env/mech/mech-cli`
**Version**: `0.11.0-nightly.20251015.203bad7c`
**Node**: `v20.19.0` (required for development)
**Package Manager**: **npm** (NOT Yarn)

### Built Packages
- ✅ `gemini-cli` (CLI) - Main command-line interface
- ✅ `gemini-cli-core` - Core backend logic
- ✅ `gemini-cli-a2a-server` - Agent-to-Agent server
- ✅ `gemini-cli-test-utils` - Testing utilities
- ✅ `vscode-ide-companion` - VS Code integration

### Build Commands
```bash
cd /Users/kefentse/dev_env/mech/mech-cli

# Install dependencies (uses npm, NOT yarn)
npm install

# Build all packages
npm run build

# Test the CLI
node bundle/gemini.js --version
node bundle/gemini.js --help
```

### Important: Yarn Workspace Isolation

**Issue**: The parent directory (`/Users/kefentse/dev_env/mech/`) has Yarn 4.6.0 workspace configuration with `.pnp.cjs` files that can interfere with npm-based builds.

**Solution**: Added `.yarnrc.yml` to disable Yarn PnP in this directory:
```yaml
# Disable Yarn in this directory - this project uses npm
enableGlobalCache: false
nodeLinker: node-modules
pnpMode: loose
```

This ensures mech-cli builds use npm's node_modules resolution, not Yarn's Plug'n'Play.

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration:sandbox:none

# Linting
npm run lint

# Full preflight check
npm run preflight
```

## Running the CLI

```bash
# Development mode
npm start

# Production mode (after build)
node bundle/gemini.js

# Or create an alias
alias mech-cli="node /Users/kefentse/dev_env/mech/mech-cli/bundle/gemini.js"
```

## Upstream Synchronization

```bash
# Fetch updates from upstream
git remote add upstream https://github.com/google-gemini/gemini-cli.git
git fetch upstream

# Merge upstream changes
git merge upstream/main
```

## Hook System (Phase 2) ✅

**Status**: COMPLETE (including configuration loading)

The hook system provides Claude Code-compatible hooks for intercepting and controlling tool execution. This enables approval workflows, audit logging, and integration with external orchestrators like mech-codegen.

Hooks can be configured via:
- Settings file (`~/.config/gemini-cli/settings.json`)
- Programmatic configuration (passing HooksConfig to Config constructor)
- Environment variables (for testing)

### Supported Hook Types

- ✅ **PreToolUse** - Execute before tool runs (can block execution)
- ✅ **PostToolUse** - Execute after tool completes (observation only)
- 🔄 **SessionStart** - Execute when session starts (planned)
- 🔄 **SessionEnd** - Execute when session ends (planned)
- 🔄 **UserPromptSubmit** - Execute when user submits prompt (planned)
- 🔄 **Notification** - System notifications (planned)
- 🔄 **Stop** - Execute when stopping (planned)
- 🔄 **SubagentStop** - Execute when subagent stops (planned)
- 🔄 **PreCompact** - Execute before conversation compaction (planned)

### Hook Configuration

Hooks are configured via JSON passed to Config constructor:

```json
{
  "PreToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "/path/to/hook.sh",
          "timeout": 60000
        }
      ]
    },
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "/path/to/block-bash.sh",
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
          "command": "/path/to/observe-results.sh",
          "timeout": 5000
        }
      ]
    }
  ]
}
```

### Hook Protocol

**Input** (via stdin as JSON):
```json
{
  "sessionId": "unique-session-id",
  "hookType": "PreToolUse",
  "toolName": "Read",
  "toolParams": {"file_path": "/tmp/test.txt"},
  "toolResult": {"success": true, "output": "..."},
  "cwd": "/current/working/dir",
  "projectRoot": "/project/root",
  "timestamp": 1234567890
}
```

**Output** (exit code + optional JSON):
- **Exit code 0**: Allow operation (PreToolUse) or success (PostToolUse)
- **Exit code 2**: Block operation (PreToolUse only)
- **JSON response** (optional):
  ```json
  {
    "block": true,
    "message": "Operation blocked for security reasons",
    "context": {"reason": "approval_required"}
  }
  ```

### Implementation Details

- **HookManager** (`packages/core/src/hooks/hook-manager.ts`) - Shell command executor with timeout
- **CoreToolScheduler integration** (`packages/core/src/core/coreToolScheduler.ts:997-1104`) - Hook execution points
- **Pattern matching** - Regex-based tool name matching (use `*` for all tools)
- **Timeout** - Default 60 seconds, configurable per hook
- **Environment variables** - `GEMINI_SESSION_ID`, `GEMINI_PROJECT_ROOT` passed to hooks

### Example Hooks

See `test-hooks/` directory for sample implementations:
- `log-hook.sh` - Log all tool usage
- `block-shell.sh` - Block Bash tool execution
- `observe-result.sh` - Log tool results

### Test Results

All tests passing ✅ - See `test-hooks/TEST_RESULTS.md` for details.

## Next Steps

1. ✅ **Phase 1: Build from source** - COMPLETE
2. ✅ **Phase 2: Add hook system** - COMPLETE
3. 📊 **Phase 3: Add cost tracking**
4. 💾 **Phase 4: Add session management**
5. 🔗 **Phase 5: Integrate with mech-llms**
6. 🤖 **Phase 6: Connect to meta-agent orchestrator**

## Documentation

- Original README: [README.md](./README.md)
- Contributing Guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Official Docs: https://geminicli.com/docs/

## License

Apache License 2.0 (inherited from upstream)

---

**Built with** ❤️ **by the Mech AI team**
