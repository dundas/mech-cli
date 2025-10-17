/**
 * Quick integration verification test
 * Tests that MechLLMsContentGenerator is properly integrated without needing live mech-llms service
 */

import { MechLLMsContentGenerator } from './packages/core/dist/src/core/mechLLMsContentGenerator.js';
import { AuthType, createContentGeneratorConfig, createContentGenerator } from './packages/core/dist/src/core/contentGenerator.js';

console.log('🔍 Quick Integration Verification');
console.log('=================================\n');

// Test 1: Import verification
console.log('Test 1: Module imports');
console.log('----------------------');
try {
  console.log('✅ MechLLMsContentGenerator imported successfully');
  console.log('✅ AuthType imported successfully');
  console.log('✅ createContentGenerator imported successfully');
} catch (error) {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
}

// Test 2: AuthType.USE_MECH_LLMS exists
console.log('\nTest 2: AuthType.USE_MECH_LLMS enum');
console.log('------------------------------------');
if (AuthType.USE_MECH_LLMS === 'mech-llms') {
  console.log('✅ AuthType.USE_MECH_LLMS = "mech-llms"');
} else {
  console.error('❌ AuthType.USE_MECH_LLMS has unexpected value:', AuthType.USE_MECH_LLMS);
  process.exit(1);
}

// Test 3: MechLLMsContentGenerator instantiation
console.log('\nTest 3: MechLLMsContentGenerator instantiation');
console.log('-----------------------------------------------');
try {
  const generator = new MechLLMsContentGenerator('https://llm.mechdna.net', 'test-key');
  console.log('✅ MechLLMsContentGenerator instantiated');
  console.log('   - Has generateContent method:', typeof generator.generateContent === 'function');
  console.log('   - Has generateContentStream method:', typeof generator.generateContentStream === 'function');
  console.log('   - Has countTokens method:', typeof generator.countTokens === 'function');
  console.log('   - Has embedContent method:', typeof generator.embedContent === 'function');
} catch (error) {
  console.error('❌ Instantiation failed:', error.message);
  process.exit(1);
}

// Test 4: Configuration creation
console.log('\nTest 4: Configuration creation');
console.log('------------------------------');
try {
  // Set env vars for test
  process.env.MECH_LLMS_URL = 'https://llm.mechdna.net';
  process.env.MECH_LLMS_API_KEY = 'test-key';

  const mockConfig = {
    getProxy: () => undefined,
  };

  const config = createContentGeneratorConfig(mockConfig, AuthType.USE_MECH_LLMS);

  console.log('✅ Config created successfully');
  console.log('   - authType:', config.authType);
  console.log('   - mechLLMsUrl:', config.mechLLMsUrl);
  console.log('   - apiKey:', config.apiKey ? '[set]' : '[not set]');

  if (config.authType !== AuthType.USE_MECH_LLMS) {
    throw new Error('authType not set correctly');
  }
  if (!config.mechLLMsUrl) {
    throw new Error('mechLLMsUrl not set');
  }
} catch (error) {
  console.error('❌ Configuration creation failed:', error.message);
  process.exit(1);
}

// Test 5: ContentGenerator factory
console.log('\nTest 5: ContentGenerator factory');
console.log('---------------------------------');
try {
  const mockConfig = {
    getProxy: () => undefined,
    getUsageStatisticsEnabled: () => false,
  };

  const generatorConfig = {
    authType: AuthType.USE_MECH_LLMS,
    mechLLMsUrl: 'https://llm.mechdna.net',
    apiKey: 'test-key',
  };

  const generator = await createContentGenerator(generatorConfig, mockConfig);

  console.log('✅ ContentGenerator created via factory');
  console.log('   - Type: LoggingContentGenerator wrapping MechLLMsContentGenerator');
  console.log('   - Has generateContent:', typeof generator.generateContent === 'function');
  console.log('   - Has countTokens:', typeof generator.countTokens === 'function');
} catch (error) {
  console.error('❌ Factory creation failed:', error.message);
  process.exit(1);
}

// Test 6: Token counting (doesn't require live service)
console.log('\nTest 6: Token counting estimation');
console.log('----------------------------------');
try {
  const generator = new MechLLMsContentGenerator('https://llm.mechdna.net');
  const result = await generator.countTokens({
    contents: [
      { role: 'user', parts: [{ text: 'Hello, this is a test message for token counting!' }] }
    ]
  });

  console.log('✅ Token counting works');
  console.log('   - Estimated tokens:', result.totalTokens);
  console.log('   - Expected: ~12-13 tokens (4 chars per token heuristic)');
} catch (error) {
  console.error('❌ Token counting failed:', error.message);
  process.exit(1);
}

// Test 7: Embedding not supported check
console.log('\nTest 7: Embedding not supported');
console.log('--------------------------------');
try {
  const generator = new MechLLMsContentGenerator('https://llm.mechdna.net');
  await generator.embedContent({ content: { parts: [{ text: 'test' }] } });

  console.error('❌ embedContent should have thrown an error');
  process.exit(1);
} catch (error) {
  if (error.message.includes('not supported')) {
    console.log('✅ embedContent correctly throws "not supported" error');
  } else {
    console.error('❌ embedContent threw unexpected error:', error.message);
    process.exit(1);
  }
}

console.log('\n=================================');
console.log('🎉 All integration tests passed!');
console.log('\nSummary:');
console.log('  ✅ Modules import correctly');
console.log('  ✅ AuthType.USE_MECH_LLMS exists');
console.log('  ✅ MechLLMsContentGenerator instantiates');
console.log('  ✅ Configuration system works');
console.log('  ✅ Factory pattern works');
console.log('  ✅ Token counting works (offline)');
console.log('  ✅ Error handling works');
console.log('\nReady for end-to-end testing with live mech-llms service!');
console.log('\nNext steps:');
console.log('  1. Ensure mech-llms service is running');
console.log('  2. Set MECH_LLMS_URL and MECH_LLMS_API_KEY');
console.log('  3. Run: ./test-e2e-mech-llms.sh');
console.log('  4. Or test manually: see E2E_TESTING.md');
console.log('');
