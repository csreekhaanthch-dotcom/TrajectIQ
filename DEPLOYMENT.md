# TrajectIQ - Deployment Guide

## 🚀 Deploy to Vercel (Recommended - FREE)

### Step 1: Push to GitHub (Already Done!)
Your repo: https://github.com/csreekhaanthch-dotcom/TrajectIQ

### Step 2: Deploy on Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"** → Choose **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub
4. Click **"Import Project"**
5. Select **"TrajectIQ"** repository
6. Click **"Deploy"**
7. Wait 2-3 minutes
8. Get your free URL: `https://trajectiq.vercel.app`

**Note**: Vercel automatically detects Next.js and configures everything!

---

## 🗄️ Database Options for Cloud Deployment

Since SQLite doesn't work on serverless platforms, use these FREE options:

### Option A: Supabase (Recommended)
- **Free tier**: 500MB database, 50,000 monthly active users
- **URL**: https://supabase.com

### Option B: PlanetScale  
- **Free tier**: 5GB storage, 1 billion reads/month
- **URL**: https://planetscale.com

### Option C: Neon (PostgreSQL)
- **Free tier**: 3GB storage, Serverless PostgreSQL
- **URL**: https://neon.tech

---

## 📝 Quick Deploy Commands

### Using Vercel CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd TrajectIQ
vercel

# Follow prompts, that's it!
```

---

## ⚡ Easiest Method (1-Click Deploy)

### Click this button after forking the repo:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/csreekhaanthch-dotcom/TrajectIQ)

---

## 🔧 Environment Variables Needed

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
DATABASE_URL=your_database_url
JWT_SECRET=trajectiq-super-secret-jwt-key-2024
ENCRYPTION_KEY=trajectiq-encryption-key-32-bytes-!
```

---

## 📊 Free Tier Limits Comparison

| Platform | Free Storage | Free Bandwidth | Free Requests |
|----------|-------------|----------------|---------------|
| Vercel | Unlimited | 100GB/month | 100GB/month |
| Supabase | 500MB | 5GB/month | 500K requests |
| PlanetScale | 5GB | 1B reads/month | 10M writes/month |
| Neon | 3GB | Unlimited | 191 hours compute |

---

## 🆘 Need Help?

If you want me to help with deployment, I can:
1. Set up Supabase configuration
2. Modify the database schema for PostgreSQL
3. Add deployment scripts

Just tell me which platform you prefer!
