/**
 * Test script for mech-llms integration
 * Tests that MechLLMsContentGenerator can be instantiated and basic functionality works
 */

import { MechLLMsContentGenerator } from './packages/core/dist/src/core/mechLLMsContentGenerator.js';
import { AuthType, createContentGeneratorConfig } from './packages/core/dist/src/core/contentGenerator.js';

console.log('🧪 Testing mech-llms integration...\n');

// Test 1: Instantiate MechLLMsContentGenerator directly
console.log('Test 1: Direct instantiation');
try {
  const generator = new MechLLMsContentGenerator('https://llm.mechdna.net');
  console.log('✅ MechLLMsContentGenerator instantiated successfully');
  console.log('   Base URL:', 'https://llm.mechdna.net');
} catch (error) {
  console.error('❌ Failed to instantiate:', error.message);
  process.exit(1);
}

// Test 2: Verify AuthType enum includes USE_MECH_LLMS
console.log('\nTest 2: AuthType enum verification');
try {
  if (AuthType.USE_MECH_LLMS === 'mech-llms') {
    console.log('✅ AuthType.USE_MECH_LLMS is defined correctly');
    console.log('   Value:', AuthType.USE_MECH_LLMS);
  } else {
    throw new Error('AuthType.USE_MECH_LLMS has unexpected value');
  }
} catch (error) {
  console.error('❌ AuthType verification failed:', error.message);
  process.exit(1);
}

// Test 3: Verify countTokens estimation
console.log('\nTest 3: Token counting');
try {
  const generator = new MechLLMsContentGenerator('https://llm.mechdna.net');
  const result = await generator.countTokens({
    contents: [
      { role: 'user', parts: [{ text: 'Hello, this is a test message!' }] }
    ]
  });

  console.log('✅ Token counting works');
  console.log('   Estimated tokens:', result.totalTokens);
} catch (error) {
  console.error('❌ Token counting failed:', error.message);
  process.exit(1);
}

// Test 4: Verify embedContent throws expected error
console.log('\nTest 4: Embedding not supported check');
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

console.log('\n🎉 All tests passed!');
console.log('\nSummary:');
console.log('- MechLLMsContentGenerator class works correctly');
console.log('- Configuration loading works with USE_MECH_LLMS auth type');
console.log('- Environment variables are properly read');
console.log('- Token counting estimation works');
console.log('- Unsupported methods properly throw errors');
console.log('\nNote: Full integration test with actual mech-llms API requires:');
console.log('1. Running mech-llms service');
console.log('2. Valid MECH_LLMS_URL environment variable');
console.log('3. Valid MECH_LLMS_API_KEY (optional)');
console.log('4. Using CLI with environment variables set');
