# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Gemini CLI** (forked as mech-cli), an open-source AI agent that brings the power of Gemini directly into your terminal. It's a comprehensive monorepo built with TypeScript and Node.js.

**Key Purpose**: Provide lightweight, terminal-first access to Gemini with built-in tools for file operations, shell commands, web fetching, and extensibility via MCP (Model Context Protocol).

## Architecture

### Monorepo Structure

This is a **workspace-based monorepo** with packages managed via npm workspaces:

- **`packages/core/`**: Core logic - tools, content generation, configuration, hooks system
- **`packages/cli/`**: CLI interface - UI components (Ink/React), command parsing, settings
- **`packages/a2a-server/`**: Agent-to-agent server for programmatic integration
- **`packages/test-utils/`**: Shared testing utilities
- **`packages/vscode-ide-companion/`**: VS Code extension integration
- **`integration-tests/`**: End-to-end integration tests

### Key Architectural Patterns

1. **Tool System** (`packages/core/src/tools/`):
   - Base classes: `BaseDeclarativeTool`, `BaseToolInvocation`
   - Built-in tools: `Edit`, `Write`, `Shell`, `Grep`, `WebFetch`, etc.
   - MCP tool discovery and execution via `DiscoveredMCPTool`
   - Tool registry for dynamic tool management

2. **Hooks System** (`packages/core/src/hooks/`):
   - Integration with Claude Code hook system
   - Hook types: `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, etc.
   - Hook execution via stdin/stdout with JSON payloads
   - Block operations with exit code 2

3. **Content Generation**:
   - `ContentGenerator` (standard) - in `packages/core/src/core/contentGenerator.ts`
   - `MechLLMsContentGenerator` (mech-llms integration) - in `packages/core/src/core/mechLLMsContentGenerator.ts`
   - Streaming responses with token tracking
   - Tool scheduling and execution orchestration

4. **Configuration System** (`packages/cli/src/config/`):
   - Settings loaded from `~/.gemini/settings.json`
   - Policy engine for tool approval modes
   - Folder trust and security controls
   - Extension management and enablement

5. **Memory & Context**:
   - Hierarchical GEMINI.md file discovery
   - Tree or flat import formats
   - File filtering and discovery service
   - Custom context files from extensions

## Common Commands

### Development

```bash
# Install dependencies
npm ci

# Build all packages
npm run build

# Build specific package
npm run build --workspace @google/gemini-cli-core

# Start development mode
npm start

# Start with debugging
npm run debug

# Run all tests
npm test

# Run tests in specific workspace
npm run test --workspace @google/gemini-cli-core

# Run integration tests (no sandbox)
npm run test:integration:sandbox:none

# Run integration tests (with Docker sandbox)
npm run test:integration:sandbox:docker

# E2E tests with verbose output
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format
```

### Building & Bundling

```bash
# Generate git commit info
npm run generate

# Bundle for distribution
npm run bundle

# Build sandbox image
npm run build:sandbox

# Build VS Code extension
npm run build:vscode

# Build everything
npm run build:all
```

### Testing Individual Components

```bash
# Run single test file
npx vitest run packages/core/src/tools/edit.test.ts

# Run single test in watch mode
npx vitest packages/cli/src/config/config.test.ts

# Run integration test
npx vitest integration-tests/file-system.test.ts
```

### Extension Management

```bash
# List extensions
gemini extensions list

# Install extension
gemini extensions install <extension-name>

# Uninstall extension
gemini extensions uninstall <extension-name>

# Create new extension
gemini extensions new <extension-name>
```

### MCP Server Management

```bash
# List MCP servers
gemini mcp list

# Add MCP server
gemini mcp add <server-name> <command>

# Remove MCP server
gemini mcp remove <server-name>
```

## Important Technical Details

### Hook Integration (Mech-Specific)

This fork includes integration with mech-llms and custom hooks:

- **Hook types defined in**: `packages/core/src/hooks/types.ts`
- **Hook manager**: `packages/core/src/hooks/hook-manager.ts`
- **Hook execution**: Hooks receive JSON via stdin, respond via stdout/stderr
- **Blocking**: Exit code 2 blocks operation, exit code 0 allows it

### Configuration Loading

1. Settings loaded from `~/.gemini/settings.json` via `packages/cli/src/config/settings.ts`
2. CLI args parsed in `packages/cli/src/config/config.ts`
3. Config merged in `loadCliConfig()` function
4. Extensions annotated and filtered based on enablement

### Tool Execution Flow

1. Model requests tool via function call
2. Tool registry resolves tool by name
3. `shouldConfirmExecute()` checks if approval needed
4. Policy engine determines auto-approval based on mode
5. Tool invocation executes via `execute()` method
6. Hooks fire at PreToolUse and PostToolUse stages
7. Result returned to model as function response

### Extension System

- Extensions defined in `~/.gemini/extensions/` or installed via npm
- Extension manifest: `extension.json` with name, version, tools, context files, MCP servers
- Extensions can be enabled/disabled per workspace
- Workspace-specific settings in `.gemini/workspace.json`

### Mech-LLMs Integration

This fork includes integration with mech-llms service:

- **Content generator**: `packages/core/src/core/mechLLMsContentGenerator.ts`
- Used when `MECH_LLMS_API_URL` environment variable is set
- Provides alternative to Google Gemini API
- Supports same tool and hook infrastructure

### Testing Patterns

- Unit tests: `*.test.ts` files colocated with source
- Integration tests: `integration-tests/*.test.ts`
- Use `@google/gemini-cli-test-utils` for test helpers
- Mock MCP servers for testing tool discovery
- Use `vitest` for all testing

### Sandbox Support

- Docker and Podman sandbox execution
- Sandbox config in `packages/cli/src/config/sandboxConfig.ts`
- Image URI configured in package.json `config.sandboxImageUri`
- Security isolation for shell tool execution

## Key Files to Understand

- `packages/core/src/config/config.ts` - Core configuration class
- `packages/cli/src/config/config.ts` - CLI config loading and merging
- `packages/core/src/core/coreToolScheduler.ts` - Tool execution orchestration
- `packages/core/src/tools/tools.ts` - Base tool classes and interfaces
- `packages/cli/src/nonInteractiveCli.ts` - Non-interactive/headless mode
- `packages/core/src/hooks/hook-manager.ts` - Hook execution system

## Development Tips

1. **When adding new tools**: Extend `BaseDeclarativeTool` and implement `createInvocation()`
2. **When modifying config**: Update both settings schema (`settingsSchema.ts`) and config class
3. **When adding hooks**: Follow hook types in `packages/core/src/hooks/types.ts`
4. **When debugging**: Use `DEBUG=1` or `--debug` flag for verbose logging
5. **When testing tools**: Use abort signal support for proper cancellation
6. **Build before testing**: Core package must be built before CLI tests run

## Authentication Options

- **OAuth (Login with Google)**: Free tier with 60 req/min, 1000 req/day
- **Gemini API Key**: Set `GEMINI_API_KEY` environment variable
- **Vertex AI**: Set `GOOGLE_API_KEY` and `GOOGLE_GENAI_USE_VERTEXAI=true`
- **Mech-LLMs**: Set `MECH_LLMS_API_URL` for custom LLM service

## Release Workflow

- **Nightly**: Published daily at UTC 0000 from main branch (`@nightly` tag)
- **Preview**: Published weekly Tuesday at UTC 2359 (`@preview` tag)
- **Stable**: Published weekly Tuesday at UTC 2000 (`@latest` tag)
- Version managed via `npm run release:version`

## Important Notes

- This is a **fork** - see `FORK_INFO.md` for fork-specific details
- Custom mech-llms integration - see `MECH_LLMS_INTEGRATION.md`
- Hooks implementation - see `HOOKS_IMPLEMENTATION_GUIDE.md`
- Node.js >= 20 required
- Uses `esbuild` for bundling (see `esbuild.config.js`)
- Lint-staged enforces code quality on commits
