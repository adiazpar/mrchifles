#!/bin/bash

# Production build script
# Run this when deploying to production

set -e  # Exit on any error

echo "========================================"
echo "Starting production build..."
echo "========================================"

# Step 1: Install dependencies
echo ""
echo "[1/3] Installing dependencies..."
npm ci --production=false

# Step 2: Run database migrations
echo ""
echo "[2/3] Running database migrations..."
./pocketbase migrate up

# Step 3: Build Next.js
echo ""
echo "[3/3] Building Next.js app..."
npm run build

echo ""
echo "========================================"
echo "Build complete!"
echo "========================================"
