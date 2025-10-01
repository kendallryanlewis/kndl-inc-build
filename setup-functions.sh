#!/bin/bash

# Quick Firebase Functions Setup Script
# Run this after cloning the repository or when setting up on a new machine

echo "🚀 Firebase Functions Quick Setup"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "functions/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
cd functions
npm install

echo "🔧 Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "⚠️  IMPORTANT: Edit functions/.env with your actual API keys!"
        echo "   - STRIPE_TEST_SECRET_KEY=sk_test_your_actual_key"
        echo "   - STRIPE_LIVE_SECRET_KEY=sk_live_your_actual_key"
    else
        echo "❌ No .env.example found. Please create functions/.env manually."
    fi
else
    echo "✅ .env file already exists"
fi

cd ..

echo "🔍 Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    echo "✅ Firebase CLI is installed"
    firebase --version
else
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Edit functions/.env with your actual Stripe API keys"
echo "2. Test functions: firebase emulators:start --only functions"
echo "3. Deploy functions: firebase deploy --only functions"
echo ""
echo "📚 See DEPLOYMENT_GUIDE.md for detailed instructions"