#!/bin/bash
# Test mech-llms API directly

echo "🧪 Testing mech-llms API at https://llm.mechdna.net"
echo "=================================================="
echo ""

# Test with gpt-4o-mini (fastest, cheapest for testing)
curl -s https://llm.mechdna.net/api/chat \
  -H "Content-Type: application/json" \
  -H "X-App-ID: app_71034084-48e9-4bbf-aeb3-828c75ccd747" \
  -H "X-API-Key: ak_299b445e-6e01-4973-a1da-014e1f1c92a3" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hello in exactly 3 words"}],"max_tokens":50}' | jq .

echo ""
echo "Test complete!"
