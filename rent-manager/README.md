# Rent Manager

A web-based rent record keeping and reminder application for office use with multi-user support, email notifications, and comprehensive reporting.

## Features

- **Property Management**: Add, edit, and manage multiple properties
- **Tenant Management**: Track tenant details, lease dates, rent amounts
- **Rent Collections**: Record payments, track due dates, assign collectors
- **Automated Reminders**: Email + in-app notifications at 7, 3, and 1 day before due date
- **Dashboard**: Visual overview with charts and statistics
- **Logbook**: Complete transaction history with filtering
- **Reports**: Generate PDF reports by year/month
- **User Roles**: Admin and Staff roles with different permissions

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT
- **Email**: Nodemailer (Gmail)
- **PDF Export**: jsPDF

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Gmail account (for email notifications)

## Setup

### 1. Clone and Install Dependencies

```bash
cd rent-manager

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

#### Server (.env)

```bash
cd server
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/rent_manager?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Email (Gmail) - Optional
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"

# Server
PORT=3000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

**Note**: To use Gmail for notifications:
1. Enable 2-Step Verification in your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use that password as GMAIL_APP_PASSWORD

### 3. Set Up Database

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed sample data
npm run db:seed
```

### 4. Start the Application

In two separate terminals:

```bash
# Terminal 1 - Start Backend
cd server
npm run dev
```

```bash
# Terminal 2 - Start Frontend
cd client
npm run dev
```

Access the application at: http://localhost:5173

## Default Credentials (if seeded)

- **Admin**: admin@rentmanager.com / admin123
- **Staff**: staff@rentmanager.com / staff123

## User Roles

### Admin
- Full access to all features
- Manage users, properties, tenants
- Create and delete collections
- View all reports

### Staff
- View properties, tenants, collections
- Record payments
- Update collection assignments
- View reports

## Project Structure

```
rent-manager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # Auth & notification context
│   │   ├── services/       # API service layer
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── services/       # Email service
│   │   ├── jobs/           # Cron jobs
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### Properties
- GET `/api/properties` - List all properties
- POST `/api/properties` - Create property (Admin)
- PUT `/api/properties/:id` - Update property (Admin)
- DELETE `/api/properties/:id` - Delete property (Admin)

### Tenants
- GET `/api/tenants` - List all tenants
- POST `/api/tenants` - Create tenant (Admin)
- PUT `/api/tenants/:id` - Update tenant (Admin)
- DELETE `/api/tenants/:id` - Delete tenant (Admin)

### Collections
- GET `/api/collections` - List collections
- POST `/api/collections` - Create collection (Admin)
- POST `/api/collections/generate` - Generate monthly collections (Admin)
- PUT `/api/collections/:id/pay` - Record payment

### Dashboard
- GET `/api/dashboard/summary` - Get summary stats
- GET `/api/dashboard/trend` - Get monthly trend

### Reports
- GET `/api/reports/collections` - Collections report
- GET `/api/reports/tenants` - Tenant report
- GET `/api/reports/properties` - Property report

## Reminder System

The system automatically sends reminders:
- **7 days** before due date
- **3 days** before due date
- **1 day** before due date
- **On due date**

Reminders are sent via:
- Email (to tenant if email configured)
- In-app notification (to assigned staff and all admins)

The cron job runs daily at 8:00 AM.

## Currency

The application uses NPR (Nepalese Rupee) as the default currency. This can be modified in the frontend components.

## License

MIT
