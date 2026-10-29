# Dhwani Backend - Complete Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd BACKEND
npm install
```

### 2. Configure Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Neon PostgreSQL (Get from Neon Dashboard)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dhwani?sslmode=require"

# Azure Speech AI (Get from Azure Portal)
AZURE_SPEECH_KEY="your_azure_speech_subscription_key"
AZURE_SPEECH_REGION="eastus"

# Azure Blob Storage (Get from Azure Portal)
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=dhwanistorage;AccountKey=xxx;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER="audio-recordings"

# JWT Secret (Generate a random 32+ character string)
JWT_SECRET="your_super_secret_jwt_key_min_32_chars"

# Server
PORT=5000
FRONTEND_URL="http://localhost:8443"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed assessment tests
npx ts-node prisma/seed.ts
```

### 4. Start Backend Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

Server runs on: `http://localhost:5000`

---

## 📋 How to Get Azure Credentials

### Azure Speech AI

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a **Speech Service** resource
3. Copy **Key 1** and **Region**
4. Paste into `.env`:
   ```
   AZURE_SPEECH_KEY="your_key_here"
   AZURE_SPEECH_REGION="eastus"
   ```

### Azure Blob Storage

1. In Azure Portal, create **Storage Account**
2. Go to **Access Keys**
3. Copy **Connection String**
4. Create container named `audio-recordings`
5. Paste into `.env`:
   ```
   AZURE_STORAGE_CONNECTION_STRING="..."
   ```

---

## 📋 How to Get Neon PostgreSQL URL

1. Go to [Neon Console](https://console.neon.tech)
2. Select your `dhwani` database
3. Copy **Connection String** (with password)
4. Paste into `.env`:
   ```
   DATABASE_URL="postgresql://..."
   ```

---

## 🧪 Test API Endpoints

### Health Check
```bash
curl http://localhost:5000/health
```

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Assessment Tests (requires token)
```bash
curl http://localhost:5000/api/assessments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📁 Project Structure

```
BACKEND/
├── src/
│   ├── server.ts                    # Express app entry point
│   ├── config/
│   │   └── database.ts              # Prisma client
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT authentication
│   │   └── errorHandler.ts          # Error handling
│   ├── routes/
│   │   ├── auth.routes.ts           # Signup/Login
│   │   ├── assessment.routes.ts     # Assessment CRUD
│   │   ├── response.routes.ts       # Submit responses + audio
│   │   ├── results.routes.ts        # Risk calculation
│   │   └── dashboard.routes.ts      # User dashboard
│   └── services/
│       └── azureSpeech.service.ts   # Azure Speech AI integration
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── seed.ts                      # Seed 10 assessment tests
├── uploads/                         # Temporary audio storage
├── .env                             # Environment variables
└── package.json                     # Dependencies & scripts
```

---

## 🔌 API Endpoints Reference

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/forgot-password` - Request password reset

### Assessments
- `GET /api/assessments` - Get all tests (protected)
- `GET /api/assessments/:slug` - Get specific test
- `POST /api/assessments/session` - Start assessment session
- `GET /api/assessments/session/:id` - Get session details
- `PATCH /api/assessments/session/:id/complete` - Mark complete

### Responses
- `POST /api/responses` - Submit choice/blend answer
- `POST /api/responses/audio` - Upload audio (with Azure processing)
- `GET /api/responses/session/:sessionId` - Get all responses

### Results
- `POST /api/results/calculate` - Calculate dyslexia risk
- `GET /api/results/:sessionId` - Get result by session
- `GET /api/results/user/:userId` - Get user's all results

### Dashboard
- `GET /api/dashboard/progress` - Get user progress
- `GET /api/dashboard/recommendations` - Get personalized activities
- `GET /api/dashboard/summary` - Get dashboard summary

---

## 🔐 Authentication Flow

1. User signs up → receives JWT token
2. Store token in frontend (localStorage)
3. Send token in `Authorization` header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 🎤 Audio Processing Flow

1. Frontend records audio (MediaRecorder API)
2. Sends to `POST /api/responses/audio` with:
   - `audio` file (WAV/MP3/WebM)
   - `sessionId`
   - `testId`
   - `expectedText` (e.g., "ship")
3. Backend:
   - Uploads to Azure Blob Storage
   - Sends to Azure Speech AI for pronunciation assessment
   - Gets scores (accuracy, fluency, completeness)
   - Saves response with scores to database
4. Returns result to frontend

---

## 🧠 Risk Calculation Algorithm

**Formula:**
```
Overall Score = 
  phonologicalScore * 0.40 +
  wordReadingScore * 0.35 +
  rapidNamingScore * 0.25

Dyslexia Risk % = 100 - Overall Score

Risk Level:
  LOW: 0-30%
  MODERATE: 31-60%
  HIGH: 61-100%
```

---

## 🐛 Common Issues & Solutions

### Issue: Database connection error
```
Solution: Check DATABASE_URL in .env is correct
```

### Issue: Azure Speech error
```
Solution: Verify AZURE_SPEECH_KEY and AZURE_SPEECH_REGION
```

### Issue: File upload fails
```
Solution: Create uploads/audio directory manually
```

### Issue: CORS error from frontend
```
Solution: Ensure FRONTEND_URL in .env matches your frontend URL
```

---

## 📊 Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## 🚀 Deployment

### Option 1: Railway
1. Push code to GitHub
2. Connect GitHub repo to Railway
3. Add environment variables
4. Deploy automatically

### Option 2: Render
1. Create new Web Service
2. Connect repository
3. Build command: `npm run build`
4. Start command: `npm start`
5. Add environment variables

---

## 📝 Next Steps

1. **Get Azure credentials** and add to `.env`
2. **Get Neon DATABASE_URL** and add to `.env`
3. Run `npm install`
4. Run database migrations
5. Seed assessment tests
6. Start server with `npm run dev`
7. Test API endpoints
8. Connect frontend to backend

---

## 🆘 Support

If you encounter issues:
1. Check `.env` configuration
2. Ensure all dependencies are installed
3. Verify Azure services are active
4. Check Neon database connection

**Backend is now ready to connect with your frontend!** 🎉
