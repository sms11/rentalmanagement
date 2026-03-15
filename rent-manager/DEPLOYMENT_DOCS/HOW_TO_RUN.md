# How to Run Locally

## Prerequisites
- Node.js 18+ (20 recommended based on Dockerfiles)
- PostgreSQL 15+
- Gmail account with App Password (for email notifications)

## Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Environment Variables

### Server (`server/.env`)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (format: `postgresql://user:password@host:5432/dbname?schema=public`) |
| `JWT_SECRET` | Secret key for JWT token signing (minimum 32 characters recommended) |
| `JWT_EXPIRES_IN` | JWT token expiration time (e.g., `7d` for 7 days) |
| `GMAIL_USER` | Gmail address for sending email notifications |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not regular password - requires 2FA enabled) |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment mode (`development` or `production`) |
| `CLIENT_URL` | Frontend URL for CORS configuration |

### Client (build-time)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., `http://localhost:3000/api`) |

## Start Services (in order)

### 1. Start PostgreSQL Database
Ensure PostgreSQL is running locally or via Docker:
```bash
# Using Docker
docker run -d --name rent-manager-db \
  -e POSTGRES_USER=rentmanager \
  -e POSTGRES_PASSWORD=rentmanager123 \
  -e POSTGRES_DB=rent_manager \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. Set Up Database Schema
```bash
cd server
npx prisma generate
npx prisma migrate dev --name init

# (Optional) Seed sample data
npm run db:seed
```

### 3. Start Backend Server
```bash
cd server
npm run dev
```

### 4. Start Frontend Development Server
```bash
cd client
npm run dev
```

## Local URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| API Health Check | http://localhost:3000/api/health |

## Default Login Credentials (if seeded)
- **Admin**: admin@rentmanager.com / admin123
- **Staff**: staff@rentmanager.com / staff123
