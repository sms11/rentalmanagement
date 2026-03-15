# Services Map

| Service | Type | Framework | Local Port | Depends On |
|---------|------|-----------|------------|------------|
| db | Database | PostgreSQL 15 | 5432 | - |
| server | Backend API | Express.js + Prisma | 3000 | db |
| client | Frontend SPA | React + Vite | 5173 (dev) / 80 (prod) | server |

## Service Details

### db (PostgreSQL Database)
- **Image**: postgres:15-alpine
- **Purpose**: Stores all application data (users, properties, tenants, rent collections, notifications)
- **Schema**: Managed by Prisma ORM
- **Persistence**: Volume-mounted at `/var/lib/postgresql/data`

### server (Backend API)
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **ORM**: Prisma
- **Features**:
  - JWT authentication
  - REST API endpoints
  - Email notifications via Nodemailer
  - Cron job for rent reminders (runs daily at 8:00 AM)

### client (Frontend SPA)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Features**:
  - Dashboard with charts (Recharts)
  - PDF report generation (jsPDF)
  - Responsive design

## Environment Variables Per Service

### db
| Variable | Source |
|----------|--------|
| `POSTGRES_USER` | Set at deploy time |
| `POSTGRES_PASSWORD` | Set at deploy time (use strong password) |
| `POSTGRES_DB` | Set at deploy time |

### server
| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Connection string from database provider (Neon/Supabase) |
| `JWT_SECRET` | Generate secure random string (32+ chars) |
| `JWT_EXPIRES_IN` | Set value (e.g., `7d`) |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | Gmail App Password from Google account settings |
| `PORT` | Default `3000` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Frontend deployment URL (for CORS) |

### client
| Variable | Source |
|----------|--------|
| `VITE_API_URL` | Backend deployment URL + `/api` suffix |
