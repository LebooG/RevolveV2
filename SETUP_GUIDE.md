# Revolve Rent — Complete Setup Guide

**Domain:** revolverent.com
**API subdomain:** api.revolverent.com

This guide walks you through every step — from a fresh server to a running app on both Android and iOS.

---

## PHASE 1: Server Setup (VPS)

You need a Linux VPS (Ubuntu 22.04+ recommended). Providers like DigitalOcean, Hetzner, or Linode work well. Minimum specs: 2 vCPU, 2GB RAM, 40GB SSD.

### 1.1 — SSH into your server

```bash
ssh root@your-server-ip
```

### 1.2 — Update system & install essentials

```bash
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

### 1.3 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # should show v20.x
npm -v
```

### 1.4 — Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

Inside the PostgreSQL prompt:

```sql
CREATE USER revolve WITH PASSWORD 'pick_a_strong_password_here';
CREATE DATABASE revolve_rent OWNER revolve;
GRANT ALL PRIVILEGES ON DATABASE revolve_rent TO revolve;
\q
```

### 1.5 — Install Redis

```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping   # should respond PONG
```

### 1.6 — Install PM2 (process manager)

```bash
npm install -g pm2
```

---

## PHASE 2: Domain & SSL Setup

### 2.1 — DNS records

Go to your domain registrar (wherever you bought revolverent.com) and add these DNS records:

```
Type    Name    Value               TTL
A       @       your-server-ip      300
A       api     your-server-ip      300
```

This points both revolverent.com and api.revolverent.com to your server.

Wait 5–10 minutes for DNS to propagate. Test with:

```bash
ping api.revolverent.com
```

### 2.2 — Configure Nginx as reverse proxy

```bash
nano /etc/nginx/sites-available/revolverent
```

Paste this:

```nginx
# API backend — api.revolverent.com
server {
    listen 80;
    server_name api.revolverent.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Allow large file uploads (lease documents)
        client_max_body_size 10M;
    }
}

# Main website — revolverent.com (optional landing page)
server {
    listen 80;
    server_name revolverent.com www.revolverent.com;

    root /var/www/revolverent;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Enable and test:

```bash
ln -s /etc/nginx/sites-available/revolverent /etc/nginx/sites-enabled/
nginx -t         # should say "syntax is ok"
systemctl restart nginx
```

### 2.3 — Get SSL certificates (free, via Let's Encrypt)

```bash
certbot --nginx -d revolverent.com -d www.revolverent.com -d api.revolverent.com
```

Follow the prompts (enter your email, agree to terms). Certbot will auto-configure HTTPS in Nginx.

Verify SSL auto-renewal:

```bash
certbot renew --dry-run
```

### 2.4 — Configure firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status    # verify SSH, HTTP, HTTPS are allowed
```

---

## PHASE 3: Deploy the Backend

### 3.1 — Upload your project

From your local machine:

```bash
scp -r revolve-rent/backend root@your-server-ip:/var/www/revolve-rent-api
```

Or use Git:

```bash
cd /var/www
git clone your-repo-url revolve-rent-api
```

### 3.2 — Install dependencies

```bash
cd /var/www/revolve-rent-api
npm install
```

### 3.3 — Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in these values with your actual details:

```env
PORT=3000
NODE_ENV=production
API_BASE_URL=https://api.revolverent.com

DB_HOST=localhost
DB_PORT=5432
DB_NAME=revolve_rent
DB_USER=revolve
DB_PASSWORD=the_password_you_set_in_step_1.4

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=generate_with_command_below

MPESA_CONSUMER_KEY=your_key_from_daraja
MPESA_CONSUMER_SECRET=your_secret_from_daraja
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CALLBACK_URL=https://api.revolverent.com/api/v1/payments/mpesa/callback
MPESA_TIMEOUT_URL=https://api.revolverent.com/api/v1/payments/mpesa/timeout

HOSTPINNACLE_USER_ID=GERSHON
HOSTPINNACLE_PASSWORD=your_password
HOSTPINNACLE_SENDER_ID=REVOLVERENT
HOSTPINNACLE_BASE_URL=https://smsportal.hostpinnacle.co.ke
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as your JWT_SECRET value.

### 3.4 — Run database migrations

```bash
cd /var/www/revolve-rent-api
node src/migrations/run.js
```

You should see "All migrations completed successfully."

### 3.5 — Test the server

```bash
node src/server.js
```

In another terminal:

```bash
curl https://api.revolverent.com/health
```

You should get:

```json
{"status":"ok","service":"revolve-rent-api","version":"1.0.0"}
```

Press Ctrl+C to stop the test.

### 3.6 — Run with PM2 (keeps it alive)

```bash
cd /var/www/revolve-rent-api
pm2 start src/server.js --name revolve-rent-api
pm2 save
pm2 startup    # follow the instructions it prints
```

Useful PM2 commands:

```bash
pm2 status              # check if running
pm2 logs revolve-rent-api   # view logs
pm2 restart revolve-rent-api # restart after changes
pm2 monit               # live monitoring dashboard
```

---

## PHASE 4: Test the Integrations

### 4.1 — Test HostPinnacle SMS

```bash
curl -X POST https://api.revolverent.com/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678"}'
```

Replace 254712345678 with your actual phone number. You should receive an SMS with a 6-digit code.

### 4.2 — Test OTP verification

```bash
curl -X POST https://api.revolverent.com/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678", "code": "123456"}'
```

Replace the code with the one you received. You'll get back a JWT token.

### 4.3 — Test M-Pesa (sandbox)

First, get a token from step 4.2, then:

```bash
curl -X POST https://api.revolverent.com/api/v1/payments/mpesa/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "tenantId": "tenant-uuid-here",
    "amount": 1,
    "phone": "254708374149",
    "description": "Test payment"
  }'
```

Note: In sandbox mode, use the Safaricom test number 254708374149. The STK push prompt will appear on the M-Pesa simulator at developer.safaricom.co.ke.

---

## PHASE 5: Mobile App Setup (Local Development)

### 5.1 — Prerequisites on your computer

Install these on your development machine (Mac, Windows, or Linux):

```bash
# Install Node.js 18+ (from nodejs.org)
# Install Expo CLI
npm install -g expo-cli eas-cli

# For iOS testing: install Xcode (Mac only)
# For Android testing: install Android Studio
```

### 5.2 — Install dependencies

```bash
cd revolve-rent/mobile
npm install
```

### 5.3 — Start development

```bash
npx expo start
```

This opens the Expo dev tools. Then:

- Press **a** to open on Android emulator
- Press **i** to open on iOS simulator (Mac only)
- Scan the QR code with **Expo Go** app on your physical phone

### 5.4 — Test on your physical phone

1. Install "Expo Go" from Google Play Store or Apple App Store
2. Make sure your phone is on the same Wi-Fi as your computer
3. Scan the QR code shown in the terminal

---

## PHASE 6: Build & Publish the Mobile App

### 6.1 — Create an Expo account

```bash
eas login
# or sign up at https://expo.dev
```

### 6.2 — Configure EAS Build

```bash
cd revolve-rent/mobile
eas build:configure
```

This creates an `eas.json` file. Update it:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 6.3 — Build for Android (APK)

```bash
eas build --platform android --profile production
```

This takes 10–15 minutes. When done, you'll get a download link for your .apk file. You can install this directly on Android phones.

### 6.4 — Build for Google Play Store (AAB)

Change `eas.json` production android to:

```json
"android": {
  "buildType": "app-bundle"
}
```

Then:

```bash
eas build --platform android --profile production
```

Upload the resulting .aab file to Google Play Console (https://play.google.com/console).

### 6.5 — Build for iOS

```bash
eas build --platform ios --profile production
```

You'll need an Apple Developer account ($99/year at developer.apple.com). EAS will guide you through provisioning profiles and certificates.

Upload to App Store via EAS Submit:

```bash
eas submit --platform ios
```

---

## PHASE 7: Go Live with M-Pesa Production

When you're ready to accept real payments:

### 7.1 — Apply for M-Pesa Go-Live

1. Go to https://developer.safaricom.co.ke
2. Navigate to your app → "Go Live"
3. Fill in the application form:
   - Business short code (your Paybill number)
   - Callback URLs: https://api.revolverent.com/api/v1/payments/mpesa/callback
   - Business name: Revolve Rent
4. Safaricom reviews in 2–5 business days

### 7.2 — Update production credentials

Once approved, update your .env on the server:

```env
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_PASSKEY=your_production_passkey_from_safaricom
MPESA_SHORTCODE=your_paybill_number
MPESA_ENVIRONMENT=production
MPESA_BASE_URL=https://api.safaricom.co.ke
```

Then restart:

```bash
pm2 restart revolve-rent-api
```

---

## Quick Reference — Common Commands

```bash
# Server status
pm2 status
pm2 logs revolve-rent-api --lines 50

# Restart after code changes
cd /var/www/revolve-rent-api
git pull                        # if using git
pm2 restart revolve-rent-api

# Database access
sudo -u postgres psql revolve_rent

# Check SSL certificate expiry
certbot certificates

# View Nginx error logs
tail -f /var/log/nginx/error.log

# Check disk/memory
df -h
free -m
```

---

## Architecture Overview

```
┌──────────────────────┐     ┌──────────────────────┐
│  Android / iOS App   │     │   revolverent.com     │
│  (Expo / React       │     │   (Landing Page)      │
│   Native)            │     └──────────┬───────────┘
└──────────┬───────────┘                │
           │ HTTPS                      │ HTTPS
           ▼                            ▼
┌──────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy + SSL)          │
│              api.revolverent.com → :3000          │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│           Express.js Backend (:3000)              │
│                                                   │
│  Auth ─── Properties ─── Tenants ─── Payments     │
│  Leases ── Messages ── Notifications ── Dashboard │
└──────┬──────────┬─────────┬──────────┬───────────┘
       │          │         │          │
  ┌────▼───┐ ┌───▼──┐ ┌───▼────┐ ┌───▼──────────┐
  │Postgres│ │Redis │ │M-Pesa  │ │HostPinnacle  │
  │  (DB)  │ │(jobs)│ │(Daraja)│ │   (SMS)      │
  └────────┘ └──────┘ └────────┘ └──────────────┘
```

---

## Troubleshooting

**"Cannot connect to database"**
→ Check PostgreSQL is running: `systemctl status postgresql`
→ Verify credentials in .env match what you set in psql

**"SMS not sending"**
→ Check HostPinnacle credit balance at smsportal.hostpinnacle.co.ke
→ Check logs: `pm2 logs revolve-rent-api --lines 100`
→ Verify Sender ID is approved in HostPinnacle portal

**"M-Pesa STK push not appearing"**
→ In sandbox: use test number 254708374149
→ Check Daraja app status at developer.safaricom.co.ke
→ Verify callback URL is reachable: `curl https://api.revolverent.com/health`

**"App can't reach API"**
→ Check the API URL in mobile/src/services/api.ts is https://api.revolverent.com/api/v1
→ Verify Nginx is running: `systemctl status nginx`
→ Check SSL: `curl -I https://api.revolverent.com/health`

**"502 Bad Gateway"**
→ Backend is not running: `pm2 status` → if stopped, `pm2 restart revolve-rent-api`
→ Check logs: `pm2 logs revolve-rent-api`
