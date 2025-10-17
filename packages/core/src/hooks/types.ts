/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hook types matching Claude Code hook system
 * @see https://docs.claude.com/en/docs/claude-code/hooks
 */
export enum HookType {
  PreToolUse = 'PreToolUse',
  PostToolUse = 'PostToolUse',
  Notification = 'Notification',
  UserPromptSubmit = 'UserPromptSubmit',
  Stop = 'Stop',
  SubagentStop = 'SubagentStop',
  PreCompact = 'PreCompact',
  SessionStart = 'SessionStart',
  SessionEnd = 'SessionEnd',
}

/**
 * Hook execution result
 */
export interface HookResult {
  /** Exit code from hook (0 = success, 2 = blocking error) */
  exitCode: number;
  /** Standard output from hook */
  stdout: string;
  /** Standard error from hook */
  stderr: string;
  /** Whether the hook requests to block the operation */
  shouldBlock: boolean;
  /** Optional JSON response from hook */
  response?: HookResponse;
}

/**
 * Advanced hook response format (optional JSON output)
 */
export interface HookResponse {
  /** Whether to block the operation */
  block?: boolean;
  /** Message to display to user */
  message?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Hook input data (sent via stdin as JSON)
 */
export interface HookInput {
  /** Session identifier */
  sessionId: string;
  /** Hook type being executed */
  hookType: HookType;
  /** Tool name (for tool-related hooks) */
  toolName?: string;
  /** Tool parameters (for tool-related hooks) */
  toolParams?: Record<string, unknown>;
  /** Tool result (for PostToolUse hooks) */
  toolResult?: Record<string, unknown>;
  /** User prompt (for UserPromptSubmit hooks) */
  userPrompt?: string;
  /** Additional event-specific data */
  eventData?: Record<string, unknown>;
  /** Current working directory */
  cwd: string;
  /** Project root directory */
  projectRoot: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Hook command configuration
 */
export interface HookCommand {
  /** Command type (only 'command' supported for now) */
  type: 'command';
  /** Shell command to execute */
  command: string;
  /** Optional timeout in milliseconds (default: 60000) */
  timeout?: number;
}

/**
 * Hook matcher configuration
 */
export interface HookMatcher {
  /** Regex pattern to match tool names (or '*' for all tools) */
  matcher: string;
  /** List of hook commands to execute */
  hooks: HookCommand[];
}

/**
 * Hooks configuration (mirroring Claude Code format)
 */
export interface HooksConfig {
  PreToolUse?: HookMatcher[];
  PostToolUse?: HookMatcher[];
  Notification?: HookMatcher[];
  UserPromptSubmit?: HookMatcher[];
  Stop?: HookMatcher[];
  SubagentStop?: HookMatcher[];
  PreCompact?: HookMatcher[];
  SessionStart?: HookMatcher[];
  SessionEnd?: HookMatcher[];
}

/**
 * Default hook timeout (60 seconds, matching Claude Code)
 */
export const DEFAULT_HOOK_TIMEOUT = 60000;

/**
 * Blocking exit code (exit code 2 means block)
 */
export const BLOCKING_EXIT_CODE = 2;

/**
 * Success exit code
 */
export const SUCCESS_EXIT_CODE = 0;
