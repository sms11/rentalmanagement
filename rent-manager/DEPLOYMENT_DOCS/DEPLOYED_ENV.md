# Deployed Environment

## Service URLs

| Service | URL | Platform |
|---------|-----|----------|
| Frontend | https://client-red-chi-90.vercel.app | Vercel |
| Backend API | https://rent-manager-api-ybls.onrender.com | Render |
| API Health | https://rent-manager-api-ybls.onrender.com/api/health | Render |
| Database | Neon PostgreSQL (aws-us-east-1) | Neon |

## Dashboard Links

| Platform | URL |
|----------|-----|
| Vercel | https://vercel.com/sms11s-projects/client |
| Render | https://dashboard.render.com/web/srv-d6re774r85hc73a39rdg |
| Neon | https://console.neon.tech/app/projects/dawn-wind-71176277 |
| GitHub | https://github.com/sms11/rentalmanagement |

## Login Credentials

- **Admin**: admin@rentmanager.com / admin123
- **Staff**: staff@rentmanager.com / staff123

## Environment Variables

### Backend (Render)
- `DATABASE_URL`: PostgreSQL connection string (Neon)
- `JWT_SECRET`: JWT signing key
- `JWT_EXPIRES_IN`: 7d
- `NODE_ENV`: production
- `PORT`: 3000
- `CLIENT_URL`: https://client-red-chi-90.vercel.app

### Frontend (Vercel)
- `VITE_API_URL`: https://rent-manager-api-ybls.onrender.com/api

## Free Tier Notes

- **Render**: Server spins down after 15 minutes of inactivity. First request after idle takes ~30 seconds.
- **Neon**: 190 compute hours/month, 0.5 GB storage
- **Vercel**: 100 GB bandwidth/month

## Deployed On
2026-03-15
