# MongoDB Migration Guide for Render

## Step 1: Install Mongoose Locally

```bash
cd chemistry-lab/backend
npm install mongoose
```

## Step 2: Set Up MongoDB Atlas (Free Tier)

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Sign up (free account)
   - Verify email

2. **Create a Cluster**
   - Click "Create" → Select "M0 (Free)" tier
   - Choose region (e.g., US-East)
   - Wait for cluster creation (5-10 minutes)

3. **Create Database User**
   - Go to "Database Access" tab
   - Click "Add New Database User"
   - Username: `chemistry-lab`
   - Password: Generate strong password
   - Click "Create User"

4. **Get Connection String**
   - Click "Database" → "Connect"
   - Choose "Drivers"
   - Copy connection string: `mongodb+srv://username:password@cluster.mongodb.net/chemistry-lab`
   - Save this safely

5. **Allow Network Access**
   - Go to "Network Access" tab
   - Click "Add IP Address"
   - Choose "Allow access from anywhere" (0.0.0.0/0) for Render
   - Click "Confirm"

## Step 3: Update Render Environment Variables

In your Render dashboard:

1. **Go to your service settings**
2. **Add environment variables:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chemistry-lab
   NODE_ENV=production
   ADMIN_TOKEN=your-secret-token-here
   ```

3. **Save and redeploy**

## Step 4: Test Locally (Optional)

Create a local `.env` file in `backend/` folder:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chemistry-lab
NODE_ENV=development
```

Then run:
```bash
npm start
```

You should see:
```
✓ Connected to MongoDB
Seeding initial users from data/userauth.json...
✓ Seeded users
Seeding initial quiz scores from data/quiz_scores.json...
✓ Seeded [X] quiz scores
Server running on http://localhost:3000
```

## Step 5: Data Migration

The server automatically seeds MongoDB from JSON files on first run:
- **userauth.json** → User collection
- **quiz_scores.json** → QuizScore collection

This happens only if the collections are empty, so subsequent starts won't duplicate data.

## Step 6: Verify Data in MongoDB

In MongoDB Atlas:
1. Click "Database" → Collections
2. You should see two collections: `users` and `quizscores`
3. Click each to verify data was migrated

## Step 7: Monitoring

**Health Check Endpoint:**
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "mongodb": "connected"
}
```

Add this to Render's health check settings.

## Troubleshooting

### Connection Refused
- Check MongoDB URI in environment variables
- Verify IP is whitelisted in MongoDB Atlas Network Access

### "Authentication failed"
- Verify username/password in connection string
- Check special characters are URL-encoded

### Collections not seeding
- Make sure `data/userauth.json` and `data/quiz_scores.json` exist locally
- Check server logs for errors
- Delete existing collections and restart

## Performance Tips

1. **Indexes**: Already created on `username`, `difficulty`, `timestamp`
2. **Lean Queries**: Used for better performance on read-heavy operations
3. **Connection Pooling**: Mongoose handles this automatically

## Security Notes

✅ Passwords are hashed with bcrypt before storage
✅ User credentials never exposed via API
✅ Admin routes protected with token
✅ User credentials normalized to lowercase for consistency

## Switching Back to JSON (if needed)

Simply revert `server.js` to the previous JSON-based version and restart. Both versions can coexist.

## Free Tier Limits (MongoDB Atlas M0)

- 512 MB storage
- Shared RAM
- No backup
- Basic monitoring

For production, upgrade to M2+ for better performance and reliability.
