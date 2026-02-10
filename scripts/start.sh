#!/bin/bash

# Production start script
# Starts both PocketBase and Next.js

set -e  # Exit on any error

echo "Starting production servers..."

# Start PocketBase in background
./pocketbase serve --http=127.0.0.1:8090 &
PB_PID=$!
echo "PocketBase started (PID: $PB_PID)"

# Start Next.js
npm run start &
NEXT_PID=$!
echo "Next.js started (PID: $NEXT_PID)"

echo ""
echo "========================================"
echo "Servers running:"
echo "  PocketBase: http://127.0.0.1:8090"
echo "  Next.js:    http://127.0.0.1:3000"
echo "========================================"

# Wait for both processes
wait $PB_PID $NEXT_PID
