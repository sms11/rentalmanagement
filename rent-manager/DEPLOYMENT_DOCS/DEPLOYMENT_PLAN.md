# Deployment Plan

## Detected Services

- **db**: PostgreSQL 15 database
- **server**: Node.js Express.js backend API with Prisma ORM and cron jobs
- **client**: React + Vite SPA frontend

## Recommended Platforms

| Service | Platform | Reason | Free Tier Limits |
|---------|----------|--------|-----------------|
| db | Neon | PostgreSQL-native, generous free tier, no pause on inactivity unlike Supabase | 0.5 GB storage, 190 compute hours/month |
| server | Render | Supports Node.js with cron jobs (node-cron), easy Prisma deployments | 750 hours/month, spins down after 15 min inactivity |
| client | Vercel | Optimized for Vite/React SPAs, global CDN, instant deployments | 100 GB bandwidth/month, unlimited static sites |

## Free Tier Warnings

- **Render**: Free services spin down after 15 minutes of inactivity. Cold start on next request takes ~30 seconds. The cron job will NOT run while the service is spun down.
- **Neon**: More reliable than Supabase for free tier - no automatic project pausing. However, compute is limited to 190 hours/month.
- **Vercel**: No significant limitations for static sites. Build minutes are limited to 6000/month.

## Deployment Order

1. **Database (Neon)** - Create PostgreSQL database first
2. **Backend (Render)** - Deploy server with DATABASE_URL from Neon
3. **Frontend (Vercel)** - Deploy client with VITE_API_URL pointing to Render backend

## Required Accounts

1. **Neon** (https://neon.tech) - PostgreSQL database
2. **Render** (https://render.com) - Backend hosting
3. **Vercel** (https://vercel.com) - Frontend hosting

## Environment Variable Wiring

### After deploying Neon database:
- Copy the connection string from Neon dashboard
- Set `DATABASE_URL` on Render backend service

### After deploying Render backend:
- Copy the service URL (e.g., `https://rent-manager-server.onrender.com`)
- Set `VITE_API_URL` on Vercel frontend as `https://rent-manager-server.onrender.com/api`
- Set `CLIENT_URL` on Render backend to the Vercel frontend URL

### Backend Environment Variables (Render):
```
DATABASE_URL=<from Neon>
JWT_SECRET=<generate secure random string>
JWT_EXPIRES_IN=7d
GMAIL_USER=<your gmail>
GMAIL_APP_PASSWORD=<gmail app password>
PORT=3000
NODE_ENV=production
CLIENT_URL=<Vercel frontend URL>
```

### Frontend Environment Variables (Vercel):
```
VITE_API_URL=<Render backend URL>/api
```

## Post-Deployment Steps

1. Run database migrations on Render (automatically runs via `npm start` script)
2. Seed database if needed: SSH into Render and run `npm run db:seed`
3. Verify CORS is working by testing login from frontend
4. Set up Gmail App Password if email notifications are needed

## Cron Job Note

The `node-cron` reminder job runs inside the Express server. On Render free tier, if the server spins down due to inactivity, the cron job will not execute. Consider:
- Upgrading to Render paid tier for always-on
- Using an external cron service (e.g., cron-job.org) to ping the server and keep it awake
- Accepting that reminders may not send during periods of inactivity
