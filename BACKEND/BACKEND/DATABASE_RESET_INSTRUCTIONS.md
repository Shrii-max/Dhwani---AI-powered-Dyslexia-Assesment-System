# Database Reset Instructions

## Issue: Schema Drift Detected

Your Neon database has old tables from previous work. You have 2 options:

### Option 1: Reset Database (Recommended - Clean Start)

This will DELETE all existing data and create fresh tables.

```bash
# Reset and apply migrations
npx prisma migrate reset --force

# This will:
# 1. Drop all tables
# 2. Run migrations
# 3. Run seed automatically
```

### Option 2: Keep Existing Data (Manual Migration)

If you want to keep existing data:

```bash
# Create a new migration for changes
npx prisma migrate dev --name init

# Then seed
npx ts-node prisma/seed.ts
```

---

## After Reset/Migration, Run:

```bash
# Start server
npm run dev
```

Your backend will be ready at: http://localhost:5000

---

## If You Get Permission Errors:

Your Neon database might be in use. Wait 30 seconds and try again.
