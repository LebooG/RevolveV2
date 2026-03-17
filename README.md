# Revolve Rent

Mobile-first property management platform for Kenyan landlords. Centralizes tenant management, rent collection via M-Pesa, lease agreements, and automated SMS reminders.

---

## Architecture

```
┌─────────────────────────┐
│   React Native (Expo)   │  ← Android + iOS
│   Mobile App            │
└──────────┬──────────────┘
           │ REST API
┌──────────▼──────────────┐
│   Express.js Backend    │
│   /api/v1/*             │
├─────────────────────────┤
│ Services:               │
│ • Auth (OTP via SMS)    │
│ • Payment (M-Pesa STK)  │
│ • Tenant Ledger         │
│ • Lease Management      │
│ • Notification Engine   │
│ • SMS (HostPinnacle)    │
├─────────────────────────┤
│ Cron Jobs:              │
│ • Daily rent reminders  │
│ • Monthly charge gen    │
└──────┬─────────┬────────┘
       │         │
  ┌────▼──┐  ┌──▼───┐
  │ Postgres│  │ Redis │
  │ (data) │  │(queue)│
  └────────┘  └──────┘

External Integrations:
• Safaricom Daraja API (M-Pesa STK Push)
• HostPinnacle SMS Gateway
```

---

## Project Structure

```
revolve-rent/
├── mobile/                    # React Native (Expo) app
│   ├── App.tsx                # Entry point
│   ├── app.json               # Expo config
│   ├── src/
│   │   ├── context/           # Auth context provider
│   │   ├── navigation/        # Tab + stack navigation
│   │   ├── screens/           # All screen components
│   │   │   ├── LoginScreen    # Phone + OTP auth
│   │   │   ├── OtpScreen      # 6-digit verification
│   │   │   ├── HomeScreen     # Dashboard with property card
│   │   │   ├── TransactionsScreen  # Payment history
│   │   │   ├── MessagesScreen      # Landlord-tenant chat
│   │   │   ├── NotificationsScreen # Alert center
│   │   │   ├── PaymentScreen       # M-Pesa payment flow
│   │   │   ├── ProfileScreen       # User profile & settings
│   │   │   ├── PropertyDetailScreen
│   │   │   ├── AddPropertyScreen
│   │   │   └── AddTenantScreen
│   │   ├── services/api.ts    # Axios API client
│   │   └── utils/theme.ts     # Design tokens
│   └── package.json
│
├── backend/                   # Node.js Express API
│   ├── src/
│   │   ├── server.js          # Express app entry
│   │   ├── config/
│   │   │   ├── database.js    # Knex PostgreSQL connection
│   │   │   └── logger.js      # Winston logging
│   │   ├── controllers/       # Route handlers
│   │   │   ├── auth           # OTP request/verify + JWT
│   │   │   ├── property       # CRUD properties & units
│   │   │   ├── tenant         # Tenant management
│   │   │   ├── payment        # M-Pesa STK + callbacks
│   │   │   ├── lease          # Digital lease signing
│   │   │   ├── notification   # Alerts + messages
│   │   │   └── dashboard      # Aggregated stats
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT verification
│   │   │   └── validate.js    # Input validation
│   │   ├── services/
│   │   │   ├── mpesa.service.js       # Full Daraja API client
│   │   │   ├── sms.service.js         # HostPinnacle SMS client
│   │   │   └── payment.service.js     # Payment orchestration
│   │   ├── migrations/
│   │   │   └── run.js         # Schema creation
│   │   ├── jobs/
│   │   │   └── scheduler.js   # Cron: reminders + charges
│   │   └── routes/
│   │       └── index.js       # All API route definitions
│   ├── .env.example           # All configuration keys
│   ├── knexfile.js            # Database config
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml         # Full stack: API + Postgres + Redis
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Expo CLI (`npm install -g expo-cli`)
- Safaricom Daraja API credentials
- HostPinnacle SMS API key

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials

npm install
npm run migrate    # Create database tables
npm run dev        # Start with nodemon
```

### Mobile App Setup

```bash
cd mobile
npm install
npx expo start     # Opens Expo dev tools
# Press 'a' for Android, 'i' for iOS
```

### Docker (Production)

```bash
# Set environment variables
cp backend/.env.example .env

docker-compose up -d
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/otp/request` | Request OTP via SMS |
| POST | `/api/v1/auth/otp/verify` | Verify OTP, receive JWT |
| GET | `/api/v1/auth/profile` | Get user profile |
| PUT | `/api/v1/auth/profile` | Update profile |

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/properties` | List landlord's properties |
| GET | `/api/v1/properties/:id` | Property details + units |
| POST | `/api/v1/properties` | Create property |
| PUT | `/api/v1/properties/:id` | Update property |
| GET | `/api/v1/properties/:id/units` | List units |
| POST | `/api/v1/properties/:id/units` | Add unit |

### Tenants
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants` | List tenants |
| GET | `/api/v1/tenants/:id` | Tenant details + balance |
| POST | `/api/v1/tenants` | Add tenant to unit |
| DELETE | `/api/v1/tenants/:id` | Remove tenant |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/mpesa/initiate` | Initiate M-Pesa STK Push |
| POST | `/api/v1/payments/mpesa/callback` | M-Pesa callback (Safaricom) |
| GET | `/api/v1/payments/:id/status` | Check payment status |
| GET | `/api/v1/payments` | List payments (filterable) |
| GET | `/api/v1/payments/ledger/:tenantId` | Tenant payment ledger |

### Leases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leases` | List leases |
| POST | `/api/v1/leases` | Create lease |
| POST | `/api/v1/leases/:id/sign` | Digitally sign lease |

### Notifications & Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List notifications |
| PUT | `/api/v1/notifications/:id/read` | Mark as read |
| GET | `/api/v1/messages/conversations` | List conversations |
| GET | `/api/v1/messages/:id` | Get messages |
| POST | `/api/v1/messages/:id` | Send message |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard` | Aggregated landlord stats |

---

## M-Pesa Integration

The platform uses Safaricom's **Daraja API** for Lipa Na M-Pesa (STK Push):

1. **Initiation**: Backend sends STK Push request → tenant gets payment prompt on phone
2. **Callback**: Safaricom posts result to `/api/v1/payments/mpesa/callback`
3. **Reconciliation**: Payment service updates ledger, sends confirmation SMS

**Setup**: Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke), create an app, get Consumer Key/Secret, and configure your Paybill shortcode.

## SMS Integration

Uses **HostPinnacle** gateway for:
- OTP verification codes
- Rent payment reminders (automated, 3 days before due)
- Payment confirmation messages
- Custom notifications

---

## Business Model

Revenue: **1–3% platform fee** on each rent payment collected, configurable via `PLATFORM_FEE_PERCENT` environment variable.

---

## License

Proprietary — Confidential. See NDA disclaimer in project brief.
