/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import type {
  HookType,
  HookInput,
  HookResult,
  HooksConfig,
  HookCommand,
  HookResponse,
} from './types.js';
import {
  DEFAULT_HOOK_TIMEOUT,
  BLOCKING_EXIT_CODE,
} from './types.js';

/**
 * Hook Manager - Executes hooks similar to Claude Code
 * Hooks are shell commands that receive JSON via stdin and return results via exit codes or stdout
 */
export class HookManager {
  constructor(
    private readonly hooksConfig: HooksConfig | undefined,
    private readonly debugMode: boolean = false,
  ) {}

  /**
   * Execute hooks for a specific event type
   * @param hookType Type of hook to execute
   * @param input Hook input data
   * @returns Array of hook results (one per matching hook)
   */
  async executeHooks(
    hookType: HookType,
    input: HookInput,
  ): Promise<HookResult[]> {
    if (!this.hooksConfig) {
      return []; // No hooks configured
    }

    const matchers = this.hooksConfig[hookType];
    if (!matchers || matchers.length === 0) {
      return []; // No hooks registered for this event type
    }

    const results: HookResult[] = [];

    // Execute all matching hooks in parallel
    const executions = matchers.flatMap((matcher) =>
      this.matchesPattern(matcher.matcher, input.toolName ?? '*')
        ? matcher.hooks.map((hook) => this.executeHook(hook, input))
        : [],
    );

    if (executions.length > 0) {
      const settled = await Promise.allSettled(executions);
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Hook execution failed - create error result
          results.push({
            exitCode: 1,
            stdout: '',
            stderr: String(result.reason),
            shouldBlock: false,
          });
        }
      }
    }

    return results;
  }

  /**
   * Check if any hook requested to block the operation
   * @param results Array of hook results
   * @returns true if any hook requested blocking
   */
  shouldBlockOperation(results: HookResult[]): boolean {
    return results.some((result) => result.shouldBlock);
  }

  /**
   * Get combined error messages from hook results
   * @param results Array of hook results
   * @returns Combined error message
   */
  getBlockingMessage(results: HookResult[]): string {
    const blockingResults = results.filter((r) => r.shouldBlock);
    if (blockingResults.length === 0) {
      return '';
    }

    return blockingResults
      .map((r) => {
        if (r.response?.message) {
          return r.response.message;
        }
        if (r.stderr) {
          return r.stderr;
        }
        if (r.stdout) {
          return r.stdout;
        }
        return 'Hook blocked operation (no message provided)';
      })
      .join('\n');
  }

  /**
   * Execute a single hook command
   * @param hook Hook command configuration
   * @param input Hook input data
   * @returns Hook execution result
   */
  private async executeHook(
    hook: HookCommand,
    input: HookInput,
  ): Promise<HookResult> {
    const timeout = hook.timeout ?? DEFAULT_HOOK_TIMEOUT;

    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      if (this.debugMode) {
        console.log(`[Hook] Executing: ${hook.command}`);
        console.log(`[Hook] Input:`, JSON.stringify(input, null, 2));
      }

      // Spawn shell command
      const child = spawn(hook.command, {
        shell: true,
        cwd: input.cwd,
        env: {
          ...process.env,
          GEMINI_SESSION_ID: input.sessionId,
          GEMINI_PROJECT_ROOT: input.projectRoot,
        },
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        if (this.debugMode) {
          console.warn(
            `[Hook] Timeout after ${timeout}ms: ${hook.command}`,
          );
        }
      }, timeout);

      // Send JSON input via stdin
      try {
        child.stdin.write(JSON.stringify(input));
        child.stdin.end();
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          exitCode: 1,
          stdout: '',
          stderr: `Failed to write to stdin: ${error}`,
          shouldBlock: false,
        });
        return;
      }

      // Collect stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (exitCode) => {
        clearTimeout(timeoutId);

        const actualExitCode = timedOut ? 1 : (exitCode ?? 1);
        const shouldBlock = actualExitCode === BLOCKING_EXIT_CODE;

        // Try to parse JSON response from stdout
        let response: HookResponse | undefined;
        try {
          if (stdout.trim()) {
            response = JSON.parse(stdout) as HookResponse;
            // If response explicitly says block, honor it regardless of exit code
            if (response.block !== undefined) {
              resolve({
                exitCode: actualExitCode,
                stdout,
                stderr,
                shouldBlock: response.block,
                response,
              });
              return;
            }
          }
        } catch {
          // Not JSON - that's okay, treat stdout as plain text
        }

        const duration = Date.now() - startTime;
        if (this.debugMode) {
          console.log(
            `[Hook] Completed in ${duration}ms with exit code ${actualExitCode}`,
          );
          if (shouldBlock) {
            console.warn(`[Hook] BLOCKED operation`);
          }
        }

        resolve({
          exitCode: actualExitCode,
          stdout,
          stderr: timedOut ? `Hook timed out after ${timeout}ms\n${stderr}` : stderr,
          shouldBlock,
          response,
        });
      });

      // Handle spawn errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        if (this.debugMode) {
          console.error(`[Hook] Spawn error:`, error);
        }
        resolve({
          exitCode: 1,
          stdout: '',
          stderr: `Failed to spawn hook: ${error.message}`,
          shouldBlock: false,
        });
      });
    });
  }

  /**
   * Check if a tool name matches a pattern
   * @param pattern Regex pattern or '*' for all tools
   * @param toolName Tool name to match
   * @returns true if pattern matches
   */
  private matchesPattern(pattern: string, toolName: string): boolean {
    if (pattern === '*') {
      return true;
    }

    try {
      const regex = new RegExp(pattern);
      return regex.test(toolName);
    } catch (error) {
      if (this.debugMode) {
        console.warn(`[Hook] Invalid pattern "${pattern}":`, error);
      }
      return false;
    }
  }
}
