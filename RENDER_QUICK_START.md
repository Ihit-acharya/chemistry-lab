# Render + MongoDB Deployment Quick Start

## Prerequisites
- ✅ MongoDB Atlas account (free tier)
- ✅ Render.com account (free tier)
- ✅ Code pushed to GitHub

## 5-Minute Setup

### 1. MongoDB Atlas Setup (2 minutes)

```bash
# Visit: https://mongodb.com/cloud/atlas
# 1. Create free account & verify email
# 2. Create M0 (free) cluster
# 3. Create database user: chemistry-lab / strong-password
# 4. Copy connection string:
#    mongodb+srv://chemistry-lab:password@cluster.mongodb.net/chemistry-lab
# 5. Network Access → Allow 0.0.0.0/0
```

### 2. Render Deployment (3 minutes)

```bash
# 1. Go to https://render.com
# 2. Click "New +" → "Web Service"
# 3. Connect GitHub repository
# 4. Settings:
#    - Name: chemistry-lab
#    - Branch: main (or your branch)
#    - Root Directory: chemistry-lab/backend
#    - Build Command: npm install
#    - Start Command: npm start
#    - Plan: Free
# 5. Environment Variables → Add:
```

**Environment Variables to Add:**
```
MONGODB_URI = mongodb+srv://chemistry-lab:PASSWORD@cluster.mongodb.net/chemistry-lab
NODE_ENV = production
ADMIN_TOKEN = your-secret-token-here
```

Replace `PASSWORD` with your MongoDB password.

### 3. Deploy

1. Click "Create Web Service"
2. Wait for deployment (2-3 minutes)
3. Visit the URL shown in Render dashboard
4. Should see: Chemistry Lab homepage

### 4. Verify MongoDB

```bash
# Check health endpoint
curl https://your-render-url.onrender.com/health

# Should respond:
# {"status":"ok","mongodb":"connected"}
```

## Your app is now live! 🎉

### Testing

1. **Login Page**: https://your-render-url.onrender.com/Loginpage.html
2. **Lab**: https://your-render-url.onrender.com/labpage.html
3. **Quiz**: https://your-render-url.onrender.com/quiz.html

### Data Persistence

- All user data stored in MongoDB Atlas
- Survives app restarts
- 512 MB free storage (enough for thousands of users)

## Troubleshooting

### "MongoDB connection failed"
- Double-check `MONGODB_URI` in Render environment
- Verify password URL-encoded (e.g., `@` → `%40`)
- Check IP whitelist in MongoDB Atlas (should be 0.0.0.0/0)

### "Bad request" errors
- Check server logs in Render dashboard
- Look for seed warnings in startup logs

### Manual Data Reset
If you need to clear the database and reseed:

```bash
# In MongoDB Atlas dashboard:
# 1. Database → Collections
# 2. Delete 'users' and 'quizscores' collections
# 3. Redeploy app
# 4. App will reseed from JSON files on startup
```

## Admin Panel

Export all data (requires token):
```bash
curl https://your-render-url.onrender.com/admin/export \
  -H "x-admin-token: your-secret-token-here"
```

## Free Tier Limits

✅ **MongoDB Atlas M0:**
- 512 MB storage
- Shared RAM
- Good for development/testing
- ~1000 users or ~50,000 quiz scores

❌ **Render Free:**
- Spins down after 15 min inactivity
- 400 compute hours/month
- Enough for personal/classroom use

## Upgrade Path

When you need more power:

**MongoDB → M2+ Cluster**
- $57/month
- 10 GB storage
- Better performance

**Render → Paid Plan**
- $7/month (Pro)
- Always on
- Better specs

## Need Help?

**MongoDB Atlas Docs**: https://docs.mongodb.com/manual/
**Render Docs**: https://render.com/docs

---

**Deployed! Ready to teach chemistry.** 🧪
