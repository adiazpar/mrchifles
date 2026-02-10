# Deployment Guide

Complete guide to deploying the Mr. Chifles application to production.

## Architecture Overview

```
                    Internet
                       |
                       v
              +----------------+
              |   Cloudflare   |  <-- DNS + CDN + DDoS Protection
              |   (Free tier)  |
              +----------------+
                       |
                       v
              +----------------+
              |  Hetzner VPS   |  <-- Your server (EUR 3.49/month)
              |    (CX22)      |
              +----------------+
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
   +--------+    +---------+    +----------+
   | Caddy  |    | Next.js |    |PocketBase|
   | :443   |--->| :3000   |    | :8090    |
   +--------+    +---------+    +----------+
        |                            |
        +----------------------------+
                       |
                       v
              +----------------+
              |    SQLite      |
              |  (pb_data/)    |
              +----------------+
```

---

## Prerequisites

Before starting, you need:

1. **Domain name** (from Cloudflare Registrar)
2. **Hetzner Cloud account** (https://www.hetzner.com/cloud)
3. **SSH key pair** (for secure server access)
4. **Local machine with SSH client**

---

## Step 1: Purchase Domain (Cloudflare)

### 1.1 Create Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Create account with email/password

### 1.2 Register Domain
1. Go to **Registrar** > **Register Domains**
2. Search for your domain (e.g., `mrchifles.pe` or `mrchifles.com`)
3. Purchase (prices are at-cost, no markup)

### 1.3 Note Your Domain
Your domain: `_______________.___`

---

## Step 2: Create Hetzner VPS

### 2.1 Create Hetzner Account
1. Go to https://www.hetzner.com/cloud
2. Sign up and verify email
3. Add payment method

### 2.2 Create SSH Key (if you don't have one)

On your local machine:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "your-email@example.com"

# View your public key (copy this)
cat ~/.ssh/id_ed25519.pub
```

### 2.3 Add SSH Key to Hetzner
1. Go to **Security** > **SSH Keys**
2. Click **Add SSH Key**
3. Paste your public key
4. Name it (e.g., "MacBook Pro")

### 2.4 Create Server
1. Go to **Servers** > **Add Server**
2. Configure:

| Setting | Value |
|---------|-------|
| **Location** | Ashburn, VA (closest to Lima) |
| **Image** | Ubuntu 24.04 |
| **Type** | CX22 (2 vCPU, 4GB RAM, EUR 3.49/mo) |
| **SSH Key** | Select your key |
| **Name** | mrchifles-prod |

3. Click **Create & Buy Now**
4. Note the IP address: `___.___.___.__`

---

## Step 3: Configure DNS (Cloudflare)

### 3.1 Add DNS Records
1. Go to your domain in Cloudflare
2. Click **DNS** > **Records**
3. Add these records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_SERVER_IP | Off (DNS only) |
| A | www | YOUR_SERVER_IP | Off (DNS only) |

**Important**: Keep proxy OFF initially so Caddy can get SSL certificates.

---

## Step 4: Server Setup

### 4.1 Connect to Server

```bash
ssh root@YOUR_SERVER_IP
```

### 4.2 Update System

```bash
apt update && apt upgrade -y
```

### 4.3 Create Non-Root User

```bash
# Create user
adduser chifles

# Add to sudo group
usermod -aG sudo chifles

# Copy SSH key to new user
mkdir -p /home/chifles/.ssh
cp ~/.ssh/authorized_keys /home/chifles/.ssh/
chown -R chifles:chifles /home/chifles/.ssh
chmod 700 /home/chifles/.ssh
chmod 600 /home/chifles/.ssh/authorized_keys
```

### 4.4 Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Verify
ufw status
```

### 4.5 Disable Root Login (Security)

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Change these lines:
PermitRootLogin no
PasswordAuthentication no

# Restart SSH
systemctl restart sshd
```

### 4.6 Reconnect as New User

```bash
# From your local machine
ssh chifles@YOUR_SERVER_IP
```

---

## Step 5: Install Dependencies

### 5.1 Install Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version
```

### 5.2 Install Caddy

```bash
# Add Caddy repository
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Install
sudo apt update
sudo apt install caddy

# Verify
caddy version
```

### 5.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Step 6: Deploy Application

### 6.1 Clone Repository

```bash
cd ~
git clone https://github.com/adiazpar/mrchifles.git
cd mrchifles
```

### 6.2 Install Dependencies

```bash
npm install
```

### 6.3 Download PocketBase

```bash
npm run pb:download
```

### 6.4 Build Next.js

```bash
npm run build
```

### 6.5 Create Environment File

```bash
nano .env.local
```

Add:
```
POCKETBASE_URL=https://YOUR_DOMAIN.com
```

---

## Step 7: Configure Caddy

### 7.1 Create Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Add (replace YOUR_DOMAIN.com):

```
YOUR_DOMAIN.com {
    # PocketBase API and Admin
    handle /api/* {
        reverse_proxy localhost:8090
    }
    handle /_/* {
        reverse_proxy localhost:8090
    }

    # Next.js app
    handle {
        reverse_proxy localhost:3000
    }
}

www.YOUR_DOMAIN.com {
    redir https://YOUR_DOMAIN.com{uri} permanent
}
```

### 7.2 Restart Caddy

```bash
sudo systemctl restart caddy

# Check status
sudo systemctl status caddy
```

---

## Step 8: Configure PM2 (Process Manager)

### 8.1 Create PM2 Ecosystem File

```bash
cd ~/mrchifles
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [
    {
      name: 'nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/home/chifles/mrchifles',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'pocketbase',
      script: './pocketbase',
      args: 'serve --http=127.0.0.1:8090',
      cwd: '/home/chifles/mrchifles'
    }
  ]
}
```

### 8.2 Start Applications

```bash
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### 8.3 Verify

```bash
pm2 status
```

Should show both `nextjs` and `pocketbase` as "online".

---

## Step 9: Setup PocketBase Admin

1. Open `https://YOUR_DOMAIN.com/_/`
2. Create admin account
3. Create collections (see CLAUDE.md for schemas)

---

## Step 10: Configure Backups

### 10.1 Create Backup Script

```bash
mkdir -p ~/backups
nano ~/backup.sh
```

Add:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/chifles/backups"
DB_PATH="/home/chifles/mrchifles/pb_data/data.db"

# Create backup
cp "$DB_PATH" "$BACKUP_DIR/data_$DATE.db"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "data_*.db" -mtime +7 -delete

echo "Backup completed: data_$DATE.db"
```

```bash
chmod +x ~/backup.sh
```

### 10.2 Schedule Daily Backups

```bash
crontab -e
```

Add:

```
0 3 * * * /home/chifles/backup.sh >> /home/chifles/backups/backup.log 2>&1
```

---

## Step 11: Enable Cloudflare Proxy (Optional)

After SSL is working, you can enable Cloudflare proxy for:
- DDoS protection
- CDN caching
- Analytics

1. Go to Cloudflare DNS
2. Toggle proxy to ON (orange cloud) for A records
3. Go to **SSL/TLS** > Set mode to **Full (strict)**

---

## Maintenance Commands

### View Logs

```bash
# Next.js logs
pm2 logs nextjs

# PocketBase logs
pm2 logs pocketbase

# Caddy logs
sudo journalctl -u caddy -f
```

### Restart Services

```bash
# Restart all
pm2 restart all

# Restart specific
pm2 restart nextjs
pm2 restart pocketbase

# Restart Caddy
sudo systemctl restart caddy
```

### Deploy Updates

```bash
cd ~/mrchifles
git pull
npm install
npm run build
pm2 restart nextjs
```

### Manual Backup

```bash
~/backup.sh
```

---

## Troubleshooting

### Caddy not starting
```bash
sudo systemctl status caddy
sudo journalctl -u caddy --no-pager -n 50
```

### SSL certificate issues
- Make sure DNS is pointing to server
- Disable Cloudflare proxy temporarily
- Check Caddy logs

### PocketBase not accessible
```bash
pm2 logs pocketbase
curl http://127.0.0.1:8090/api/health
```

### Next.js errors
```bash
pm2 logs nextjs
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Hetzner CX22 | EUR 3.49 (~$3.80) |
| Cloudflare | Free |
| Let's Encrypt | Free |
| **Total** | **~$3.80/month** |

---

## Security Checklist

- [ ] SSH key authentication only (no passwords)
- [ ] Root login disabled
- [ ] Firewall enabled (UFW)
- [ ] HTTPS enforced (Caddy handles this)
- [ ] PocketBase admin has strong password
- [ ] Regular backups configured
- [ ] Server updated regularly

---

## Quick Reference

| Service | URL |
|---------|-----|
| App | https://YOUR_DOMAIN.com |
| PocketBase Admin | https://YOUR_DOMAIN.com/_/ |
| PocketBase API | https://YOUR_DOMAIN.com/api/ |

| Command | Purpose |
|---------|---------|
| `pm2 status` | Check app status |
| `pm2 logs` | View all logs |
| `pm2 restart all` | Restart apps |
| `~/backup.sh` | Manual backup |
| `sudo systemctl restart caddy` | Restart web server |
