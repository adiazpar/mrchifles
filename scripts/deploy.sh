#!/bin/bash

# One-command deployment script
# Usage: ./scripts/deploy.sh

set -e  # Exit on any error

echo "========================================"
echo "Deploying Mr. Chifles..."
echo "========================================"

# Pull latest code
echo ""
echo "[1/4] Pulling latest code..."
git pull

# Install dependencies
echo ""
echo "[2/4] Installing dependencies..."
npm ci --production=false

# Run migrations (preserves existing data)
echo ""
echo "[3/4] Running database migrations..."
./pocketbase migrate up

# Build Next.js
echo ""
echo "[4/4] Building Next.js..."
npm run build

# Restart servers with PM2
echo ""
echo "Restarting servers..."
if pm2 list | grep -q "pocketbase\|nextjs"; then
    pm2 restart all
else
    # First time - start PM2
    pm2 start ecosystem.config.js
    pm2 save
    echo ""
    echo "First deployment detected!"
    echo "Run 'pm2 startup' and follow instructions to enable auto-start on reboot."
fi

echo ""
echo "========================================"
echo "Deployment complete!"
echo "========================================"
pm2 status
