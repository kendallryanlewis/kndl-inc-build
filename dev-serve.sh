#!/bin/bash

# Development startup script with CORS bypass
echo "🚀 Starting Angular development server with CORS bypass..."
echo "📍 This will allow connections from:"
echo "   - localhost:4200"
echo "   - 127.0.0.1:4200"
echo "   - kndl-inc.com"
echo "   - Any subdomain of kndl-inc.com"
echo ""

# Start Angular with CORS-friendly options
ng serve \
  --host 0.0.0.0 \
  --port 4200 \
  --disable-host-check \
  --proxy-config proxy.conf.json \
  --poll 2000

echo "✅ Server started successfully!"
echo "🌐 Available at:"
echo "   - http://localhost:4200"
echo "   - http://127.0.0.1:4200"
echo "   - http://0.0.0.0:4200"