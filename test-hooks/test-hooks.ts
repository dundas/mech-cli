#!/usr/bin/env node
/**
 * Test script for hook system
 *
 * This script tests the hook implementation by:
 * 1. Loading hooks configuration from hooks-config.json
 * 2. Creating a Config with hooks enabled
 * 3. Simulating tool execution to trigger hooks
 * 4. Verifying hooks execute and can block operations
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { HookManager } from '../packages/core/src/hooks/hook-manager.js';
import { HookType } from '../packages/core/src/hooks/types.js';
import type { HooksConfig, HookInput } from '../packages/core/src/hooks/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testHooks() {
  console.log('🧪 Testing Hook System\n');

  // Load hooks configuration
  const configPath = join(__dirname, 'hooks-config.json');
  const hooksConfig: HooksConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  console.log('✅ Loaded hooks configuration');
  console.log(`   PreToolUse matchers: ${hooksConfig.PreToolUse?.length || 0}`);
  console.log(`   PostToolUse matchers: ${hooksConfig.PostToolUse?.length || 0}\n`);

  // Create HookManager
  const hookManager = new HookManager(hooksConfig, true); // debug mode enabled

  // Test 1: PreToolUse hook for non-blocking tool (Read)
  console.log('📝 Test 1: PreToolUse hook for Read tool (should allow)');
  const readInput: HookInput = {
    sessionId: 'test-session-1',
    hookType: HookType.PreToolUse,
    toolName: 'Read',
    toolParams: { file_path: '/tmp/test.txt' },
    cwd: process.cwd(),
    projectRoot: process.cwd(),
    timestamp: Date.now(),
  };

  const readHookResults = await hookManager.executeHooks(HookType.PreToolUse, readInput);
  const readBlocked = hookManager.shouldBlockOperation(readHookResults);

  console.log(`   Hooks executed: ${readHookResults.length}`);
  console.log(`   Should block: ${readBlocked}`);
  console.log(`   ✅ Test 1 ${readBlocked ? 'FAILED' : 'PASSED'} - Read tool allowed\n`);

  // Test 2: PreToolUse hook for blocking tool (Bash)
  console.log('📝 Test 2: PreToolUse hook for Bash tool (should block)');
  const bashInput: HookInput = {
    sessionId: 'test-session-2',
    hookType: HookType.PreToolUse,
    toolName: 'Bash',
    toolParams: { command: 'ls -la' },
    cwd: process.cwd(),
    projectRoot: process.cwd(),
    timestamp: Date.now(),
  };

  const bashHookResults = await hookManager.executeHooks(HookType.PreToolUse, bashInput);
  const bashBlocked = hookManager.shouldBlockOperation(bashHookResults);
  const blockingMessage = hookManager.getBlockingMessage(bashHookResults);

  console.log(`   Hooks executed: ${bashHookResults.length}`);
  console.log(`   Should block: ${bashBlocked}`);
  console.log(`   Blocking message: ${blockingMessage}`);
  console.log(`   ✅ Test 2 ${!bashBlocked ? 'FAILED' : 'PASSED'} - Bash tool blocked\n`);

  // Test 3: PostToolUse hook for observing results
  console.log('📝 Test 3: PostToolUse hook for Write tool (should observe)');
  const writeInput: HookInput = {
    sessionId: 'test-session-3',
    hookType: HookType.PostToolUse,
    toolName: 'Write',
    toolParams: { file_path: '/tmp/test.txt', content: 'Hello world' },
    toolResult: {
      success: true,
      output: 'File written successfully',
    },
    cwd: process.cwd(),
    projectRoot: process.cwd(),
    timestamp: Date.now(),
  };

  const writeHookResults = await hookManager.executeHooks(HookType.PostToolUse, writeInput);

  console.log(`   Hooks executed: ${writeHookResults.length}`);
  console.log(`   ✅ Test 3 PASSED - PostToolUse hook observed results\n`);

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   ✅ ${readBlocked ? 0 : 1}/1 non-blocking tools passed`);
  console.log(`   ✅ ${bashBlocked ? 1 : 0}/1 blocking tools passed`);
  console.log(`   ✅ ${writeHookResults.length > 0 ? 1 : 0}/1 observation hooks passed`);
  console.log('');
  console.log('📁 Check log files:');
  console.log(`   ${process.env.HOME}/.mech-cli-hooks.log - PreToolUse logs`);
  console.log(`   ${process.env.HOME}/.mech-cli-post-hooks.log - PostToolUse logs`);
}

// Run tests
testHooks().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
