#!/bin/bash

# Test Stripe API Keys
# Run this script after updating your .env file to test your Stripe keys

echo "🔧 Testing Stripe API Keys..."
echo ""

# Start the emulator in background
echo "Starting Firebase emulator..."
firebase emulators:start --only functions &
EMULATOR_PID=$!

# Wait for emulator to start
echo "Waiting for emulator to start..."
sleep 10

# Test the API
echo "Testing subscription API with your customer ID..."
curl -X POST "http://127.0.0.1:5001/kndl-3663b/us-central1/getCustomerSubscriptions" \
  -H "Content-Type: application/json" \
  -d '{"data": {"customerId": "cus_T98FVyO2PqjgG4", "environment": "live"}}' \
  | jq .

# Stop the emulator
echo "Stopping emulator..."
kill $EMULATOR_PID

echo ""
echo "✅ If you see subscription data above, your API keys are working!"
echo "❌ If you see authentication errors, update your .env file with real Stripe keys"