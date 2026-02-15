#!/bin/bash

# One-time server setup script for Vultr VPS (Ubuntu 22.04)
# Optimized for Santiago, Chile datacenter (low latency to Peru)
# Run this once when setting up a new server
# Usage: curl -fsSL https://raw.githubusercontent.com/adiazpar/mrchifles/main/scripts/setup-server.sh | bash

set -e  # Exit on any error

echo "========================================"
echo "Setting up server for Mr. Chifles..."
echo "Vultr VPS - Santiago, Chile"
echo "========================================"

# Update system
echo ""
echo "[1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo ""
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo ""
echo "[3/6] Installing PM2..."
sudo npm install -g pm2

# Install Caddy
echo ""
echo "[4/6] Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y

# Create app directory
echo ""
echo "[5/6] Setting up app directory..."
sudo mkdir -p /var/www/mrchifles
sudo chown $USER:$USER /var/www/mrchifles

# Clone repo
echo ""
echo "[6/6] Cloning repository..."
cd /var/www/mrchifles
git clone https://github.com/adiazpar/mrchifles.git .

# Download PocketBase
echo ""
echo "Downloading PocketBase..."
npm run pb:download

echo ""
echo "========================================"
echo "Server setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Create .env.local with your production settings:"
echo "   nano .env.local"
echo ""
echo "2. Configure Caddy with your domain:"
echo "   sudo nano /etc/caddy/Caddyfile"
echo "   (Copy the template from Caddyfile in this repo)"
echo ""
echo "3. Restart Caddy:"
echo "   sudo systemctl restart caddy"
echo ""
echo "4. Initialize the database and deploy:"
echo "   npm run db:reset"
echo "   npm run build"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup  # Follow instructions to enable auto-start"
echo ""
echo "For future deployments, just run: npm run deploy"
echo ""
