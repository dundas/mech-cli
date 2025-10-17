# End-to-End Testing Guide: mech-llms Integration

## Overview

This guide provides multiple approaches to test the mech-llms integration end-to-end.

## Prerequisites

1. **Build the packages**:
   ```bash
   cd /Users/kefentse/dev_env/mech/mech-cli
   npm run build
   ```

2. **Set environment variables**:
   ```bash
   export MECH_LLMS_URL="https://llm.mechdna.net"
   export MECH_LLMS_API_KEY="your-api-key"  # Optional
   ```

3. **Ensure mech-llms service is running**:
   - Default URL: https://llm.mechdna.net
   - Or run locally if you have the service

## Testing Approaches

### Option 1: Automated Test Script (Recommended)

Run the automated test script:

```bash
chmod +x test-e2e-mech-llms.sh
./test-e2e-mech-llms.sh
```

This script:
- Verifies builds exist
- Creates temporary settings with `authType: "mech-llms"`
- Tests basic prompt execution
- Tests tool usage
- Cleans up after testing

### Option 2: Manual CLI Testing

#### Step 1: Configure settings

Create a settings file at `~/.config/gemini-cli/settings.json`:

```json
{
  "authType": "mech-llms",
  "approvalMode": "default"
}
```

Or create a temporary settings file:

```bash
cat > /tmp/mech-llms-settings.json << 'EOF'
{
  "authType": "mech-llms",
  "approvalMode": "default"
}
EOF
```

#### Step 2: Run CLI with mech-llms

```bash
# Using development build
node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json "What is 2+2?"

# Or if you have npm start working
npm start -- --config-file /tmp/mech-llms-settings.json "What is 2+2?"
```

#### Step 3: Test tool execution

```bash
# Test Read tool
node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json \
  "Read the file at /tmp/mech-llms-settings.json and tell me what authType is set"

# Test Write tool
node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json \
  "Write a test file at /tmp/test.txt with the content 'Hello from mech-llms'"

# Test Bash tool
node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json \
  "Run the command 'echo Hello from mech-llms' using bash"
```

### Option 3: Programmatic Testing

Create a Node.js test script:

```javascript
// test-programmatic.js
import { MechLLMsContentGenerator } from './packages/core/dist/src/core/mechLLMsContentGenerator.js';

async function test() {
  const generator = new MechLLMsContentGenerator(
    process.env.MECH_LLMS_URL || 'https://llm.mechdna.net',
    process.env.MECH_LLMS_API_KEY
  );

  console.log('Testing generateContent...');
  const response = await generator.generateContent(
    {
      model: 'gpt-4',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'What is 2+2? Reply with just the number.' }]
        }
      ]
    },
    'test-prompt-id'
  );

  console.log('Response:', response.candidates[0].content.parts[0].text);
  console.log('Usage:', response.usageMetadata);
  console.log('✅ Test passed!');
}

test().catch(console.error);
```

Run it:

```bash
node test-programmatic.js
```

### Option 4: Interactive Session

Start an interactive session with mech-llms:

```bash
# Create settings
cat > /tmp/mech-llms-settings.json << 'EOF'
{
  "authType": "mech-llms",
  "approvalMode": "default"
}
EOF

# Start interactive mode
node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json
```

Then interact naturally:
- "What is the capital of France?"
- "Read the file at /tmp/test.txt"
- "Write a Python function to calculate fibonacci"

## Verification Checklist

- [ ] CLI starts without errors with `authType: "mech-llms"`
- [ ] Simple prompts execute and return responses
- [ ] Token usage is reported correctly
- [ ] Read tool works through mech-llms
- [ ] Write tool works through mech-llms
- [ ] Bash tool works through mech-llms
- [ ] Streaming responses work (if supported)
- [ ] Error handling works (try invalid prompts)
- [ ] API key authentication works (if configured)

## Expected Output

### Successful Execution

```
🧪 End-to-End Test: mech-cli with mech-llms
==========================================

Configuration:
  MECH_LLMS_URL: https://llm.mechdna.net
  MECH_LLMS_API_KEY: [set]

Test 1: CLI startup with USE_MECH_LLMS auth type
-------------------------------------------------
Created temporary settings at: /tmp/...

Test 2: Simple prompt execution
--------------------------------
Running: node packages/cli/dist/index.js --config-file "..." "What is 2+2?"

[Response from mech-llms]

✅ Test 2 PASSED: CLI executed prompt successfully

Test 3: Tool usage verification
--------------------------------
Running with tool prompt...

[Tool execution output]

✅ Test 3 PASSED: Tool usage works through mech-llms

==========================================
🎉 End-to-end tests completed!
```

## Troubleshooting

### Error: "mech-llms URL not configured"

**Solution**: Set the `MECH_LLMS_URL` environment variable:
```bash
export MECH_LLMS_URL="https://llm.mechdna.net"
```

### Error: "Cannot find module"

**Solution**: Rebuild the packages:
```bash
npm run build
```

### Error: "mech-llms API error (401)"

**Solution**: Check your API key:
```bash
export MECH_LLMS_API_KEY="your-valid-api-key"
```

### CLI hangs or doesn't respond

**Solution**:
1. Check mech-llms service is accessible:
   ```bash
   curl https://llm.mechdna.net/health
   ```

2. Check network connectivity
3. Verify mech-llms service is running
4. Check logs for errors

### Bundle build fails

**Note**: This is expected due to Yarn PnP conflicts. The development build (packages/cli/dist) works fine for testing.

## Next Steps

After successful end-to-end testing:

1. **Update FORK_INFO.md**: Mark Phase 5 as complete
2. **Add cost tracking**: Implement token usage monitoring
3. **Session management**: Add session persistence
4. **Meta-agent integration**: Connect to orchestrator (Phase 6)

## Additional Testing

### Performance Testing

Test response times and throughput:

```bash
time node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json \
  "Generate a 100-line Python script"
```

### Stress Testing

Test with multiple concurrent requests:

```bash
for i in {1..10}; do
  node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json \
    "Test prompt $i" &
done
wait
```

### Tool Chain Testing

Test complex tool usage:

```bash
node packages/cli/dist/index.js --config-file /tmp/mech-llms-settings.json \
  "Read package.json, extract the version, and write it to /tmp/version.txt"
```

## Documentation Links

- [mech-llms API Documentation](https://llm.mechdna.net/api-docs)
- [Gemini CLI Documentation](https://geminicli.com/docs/)
- [FORK_INFO.md](./FORK_INFO.md) - Project roadmap

---

**Built with** ❤️ **by the Mech AI team**
