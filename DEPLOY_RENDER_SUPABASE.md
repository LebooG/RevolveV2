# Deploy Revolve Rent — Render + Supabase (Free Tier)

Step-by-step guide to get the API running in under 15 minutes.

---

## Step 1: Create Supabase Database (5 min)

1. Go to **https://supabase.com** and sign up / log in
2. Click **New Project**
   - Name: `revolve-rent`
   - Database password: pick something strong, **save it**
   - Region: pick the closest to Kenya (e.g. `West EU` or `Central EU`)
   - Click **Create new project** and wait ~2 minutes
3. Go to **Project Settings** (gear icon, bottom left)
4. Click **Database** in the sidebar
5. Under **Connection string**, click the **URI** tab
6. Copy the connection string — it looks like:
   ```
   postgresql://postgres.[your-ref]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with the database password you set in step 2
8. **Save this URL** — you'll need it for Render

---

## Step 2: Push Code to GitHub (2 min)

If you haven't already:

```bash
cd revolve-rent
git init
git add .
git commit -m "initial commit"
```

Create a repo at **https://github.com/new** (can be private), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/revolve-rent.git
git branch -M main
git push -u origin main
```

**Important:** Make sure `.env` is in `.gitignore` so your secrets don't get pushed:

```bash
echo ".env" >> .gitignore
echo "node_modules" >> .gitignore
echo "logs" >> .gitignore
git add .gitignore
git commit -m "add gitignore"
git push
```

---

## Step 3: Deploy Backend on Render (5 min)

1. Go to **https://dashboard.render.com** and sign up / log in
2. Click **New +** > **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `revolve-rent-api`
   - **Region:** Frankfurt (closest to Kenya)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Instance Type:** Free

5. Click **Advanced** and add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(paste your Supabase connection string from Step 1)* |
| `JWT_SECRET` | *(generate: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and paste the output)* |
| `MPESA_CONSUMER_KEY` | *(your Daraja key)* |
| `MPESA_CONSUMER_SECRET` | *(your Daraja secret)* |
| `MPESA_PASSKEY` | `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` |
| `MPESA_SHORTCODE` | `174379` |
| `MPESA_BASE_URL` | `https://sandbox.safaricom.co.ke` |
| `MPESA_CALLBACK_URL` | `https://revolve-rent-api.onrender.com/api/v1/payments/mpesa/callback` |
| `MPESA_TIMEOUT_URL` | `https://revolve-rent-api.onrender.com/api/v1/payments/mpesa/timeout` |
| `HOSTPINNACLE_USER_ID` | `GERSHON` |
| `HOSTPINNACLE_PASSWORD` | *(your password)* |
| `HOSTPINNACLE_SENDER_ID` | `REVOLVERENT` |
| `HOSTPINNACLE_BASE_URL` | `https://smsportal.hostpinnacle.co.ke` |
| `PLATFORM_FEE_PERCENT` | `2` |

6. Click **Create Web Service**
7. Wait for the build to complete (2-3 min)

Your API will be live at: **https://revolve-rent-api.onrender.com**

---

## Step 4: Run Database Migrations (1 min)

Once the service is deployed, you need to create the tables. Go to the Render dashboard:

1. Click your service **revolve-rent-api**
2. Click the **Shell** tab (top right)
3. Run:
   ```bash
   node src/migrations/run.js
   ```
4. You should see: `All migrations completed successfully.`

Alternatively, run locally against Supabase:

```bash
cd backend
DATABASE_URL="your_supabase_url" node src/migrations/run.js
```

---

## Step 5: Test the API (2 min)

### Health check
```bash
curl https://revolve-rent-api.onrender.com/health
```

Expected response:
```json
{"status":"ok","service":"revolve-rent-api","version":"1.0.0"}
```

### Send OTP to your phone
```bash
curl -X POST https://revolve-rent-api.onrender.com/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "254XXXXXXXXX"}'
```
*(replace with your real number)*

### Verify OTP
```bash
curl -X POST https://revolve-rent-api.onrender.com/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "254XXXXXXXXX", "code": "123456"}'
```
*(use the code you received via SMS)*

Save the `token` from the response — you'll need it for authenticated requests.

### Test M-Pesa STK Push (sandbox)
```bash
curl -X POST https://revolve-rent-api.onrender.com/api/v1/payments/mpesa/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 1, "phone": "254708374149", "description": "Test"}'
```
*(254708374149 is the Safaricom sandbox test number)*

---

## Step 6: Point Mobile App at Render (1 min)

Update the API URL in `mobile/src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://revolve-rent-api.onrender.com/api/v1';
```

Then run:
```bash
cd mobile
npx expo start
```

---

## Important Notes for Free Tier

**Render free tier:**
- Service spins down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds (cold start)
- 750 free hours/month (enough for testing)
- Upgrade to Starter ($7/mo) for always-on when going to production

**Supabase free tier:**
- 500 MB database storage
- 2 GB bandwidth
- Project pauses after 1 week of inactivity (just click "restore" to resume)
- Enough for development and testing

**M-Pesa sandbox:**
- STK push prompts go to the Safaricom simulator, not real phones
- Use test number 254708374149
- Test at: https://developer.safaricom.co.ke > APIs > Mpesa Express > Simulator

---

## Troubleshooting

**Build fails on Render**
- Check that Root Directory is set to `backend` (not the repo root)
- Check the deploy logs for the specific error

**"Missing environment variables"**
- The server validates all env vars at startup — check Render's Environment tab

**Database connection fails**
- Verify your Supabase connection string has the correct password
- Check Supabase project isn't paused (dashboard > project > restore)
- Try appending `?sslmode=require` to the DATABASE_URL if SSL errors

**OTP SMS not arriving**
- Check HostPinnacle credit balance at smsportal.hostpinnacle.co.ke
- Check Render logs: Dashboard > revolve-rent-api > Logs

**Cold start slow (30s)**
- Normal on free tier — Render spins down after 15 min idle
- Use https://uptimerobot.com to ping /health every 14 min to keep it awake
