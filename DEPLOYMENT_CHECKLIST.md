# MongoDB + Render Deployment Checklist

## Pre-Deployment ✓

- [x] MongoDB models created (`User.js`, `QuizScore.js`)
- [x] Server updated to use MongoDB
- [x] package.json updated with mongoose dependency
- [x] Mongoose installed locally (`npm install`)
- [x] Documentation created

## MongoDB Atlas Setup ⬜

- [ ] Create MongoDB Atlas account (mongodb.com/cloud/atlas)
- [ ] Create M0 (free) cluster
- [ ] Create database user `chemistry-lab` with secure password
- [ ] Copy connection string: `mongodb+srv://chemistry-lab:PASSWORD@...`
- [ ] Add IP whitelist: `0.0.0.0/0` (for Render)
- [ ] Test connection locally with `.env` file

## Local Testing ⬜

- [ ] Create `.env` file in `backend/` folder:
  ```
  MONGODB_URI=mongodb+srv://chemistry-lab:password@cluster.mongodb.net/chemistry-lab
  NODE_ENV=development
  ```
- [ ] Run `npm start`
- [ ] Verify server output includes `✓ Connected to MongoDB`
- [ ] Verify data seeding from JSON files
- [ ] Test `/health` endpoint
- [ ] Test login/registration
- [ ] Test quiz submission
- [ ] Test leaderboard

## GitHub Setup ⬜

- [ ] Push all changes to GitHub
  ```bash
  git add .
  git commit -m "Migrate to MongoDB for Render deployment"
  git push origin main
  ```
- [ ] Verify files are on GitHub:
  - `backend/server.js` (updated)
  - `backend/models/User.js` (new)
  - `backend/models/QuizScore.js` (new)
  - `backend/package.json` (updated)
  - `backend/.env.example` (new)
  - `MONGODB_SETUP.md` (new)
  - `RENDER_QUICK_START.md` (new)

## Render Deployment ⬜

- [ ] Sign up for Render.com (free)
- [ ] Connect GitHub repository
- [ ] Create new Web Service
  - [ ] Select repository
  - [ ] Branch: `main`
  - [ ] Root directory: `chemistry-lab/backend`
  - [ ] Build command: `npm install`
  - [ ] Start command: `npm start`
  - [ ] Environment: `Node`
  - [ ] Plan: `Free`
- [ ] Add Environment Variables:
  ```
  MONGODB_URI=mongodb+srv://chemistry-lab:PASSWORD@cluster.mongodb.net/chemistry-lab
  NODE_ENV=production
  ADMIN_TOKEN=your-secret-token
  ```
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (2-5 minutes)

## Post-Deployment Testing ⬜

- [ ] Check Render deployment logs for errors
- [ ] Visit `https://your-url.onrender.com/health`
  - [ ] Should return `{"status":"ok","mongodb":"connected"}`
- [ ] Visit `https://your-url.onrender.com` (main page)
- [ ] Test login page: `https://your-url.onrender.com/Loginpage.html`
  - [ ] Try registering new user
  - [ ] Try logging in
- [ ] Test lab: `https://your-url.onrender.com/labpage.html`
- [ ] Test quiz: `https://your-url.onrender.com/quiz.html`
  - [ ] Submit a quiz
  - [ ] Check leaderboard
- [ ] Verify data persists across restarts
  - [ ] Stop service
  - [ ] Start service
  - [ ] Verify data still there

## MongoDB Verification ⬜

- [ ] Check MongoDB Atlas Dashboard
- [ ] Verify data in collections:
  - [ ] `users` collection has entries
  - [ ] `quizscores` collection has entries
- [ ] Verify indexes were created on `username`, `difficulty`, `timestamp`

## Backup & Security ⬜

- [ ] Save MongoDB connection string securely
- [ ] Test `/admin/export` endpoint (for backups)
- [ ] Document admin token in safe location
- [ ] Review MongoDB Atlas security settings

## Monitoring ⬜

- [ ] Set up Render health check:
  - Path: `/health`
  - Grace period: 60s
- [ ] Monitor first 24 hours for errors
- [ ] Check MongoDB Atlas metrics

## Documentation ⬜

- [ ] Share deployment link with stakeholders
- [ ] Share user registration instructions
- [ ] Document any custom configurations
- [ ] Update project README with MongoDB details

## Cleanup (After Successful Deployment) ⬜

- [ ] Verify JSON files are no longer needed (data is in MongoDB)
- [ ] Optional: Delete or backup JSON files from backend/data/
- [ ] Remove `.env` file from git (add to `.gitignore`)

## Rollback Plan (If Issues)

If MongoDB deployment fails:
1. Revert `server.js` to JSON version from git history
2. Redeploy to Render
3. You're back to JSON-based (slower but works)
4. Troubleshoot MongoDB separately

## Success Criteria ✅

You'll know it's working when:

✅ App loads at `https://your-render-url.onrender.com`
✅ Can register new users
✅ Can log in with existing users
✅ Can complete quizzes
✅ Data persists after app restarts
✅ `/health` endpoint shows MongoDB connected
✅ No "file not found" errors in logs

---

**Estimated Time: 30-45 minutes**

Start with the MongoDB Atlas setup, then Render, then test. Most issues are in the connection string or IP whitelist.

**Questions?** Check the troubleshooting section in `MONGODB_SETUP.md`
