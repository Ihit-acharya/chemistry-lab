const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

// Import models
const User = require('./models/User');
const QuizScore = require('./models/QuizScore');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chemistry-lab';

app.use(cors());
app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, '..', 'docs');
const STATIC_DATA_DIR = path.join(__dirname, 'data');

// Serve the static frontend
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(FRONTEND_DIR));
}

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✓ Connected to MongoDB');
    seedInitialData();
  })
  .catch(err => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Seed initial data from JSON files if database is empty
async function seedInitialData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding initial users from data/userauth.json...');
      const usersFile = path.join(STATIC_DATA_DIR, 'userauth.json');
      if (fs.existsSync(usersFile)) {
        const data = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        if (Array.isArray(data) && data.length > 0) {
          for (const userData of data) {
            try {
              // Only seed if user doesn't exist
              const exists = await User.findOne({ username: userData.username.toLowerCase() });
              if (!exists) {
                const user = new User({
                  username: userData.username,
                  password: userData.password, // Will be hashed by schema pre-hook
                  name: userData.name
                });
                await user.save();
              }
            } catch (err) {
              console.error(`Failed to seed user ${userData.username}:`, err.message);
            }
          }
          console.log(`✓ Seeded users`);
        }
      }
    }

    const scoreCount = await QuizScore.countDocuments();
    if (scoreCount === 0) {
      console.log('Seeding initial quiz scores from data/quiz_scores.json...');
      const scoresFile = path.join(STATIC_DATA_DIR, 'quiz_scores.json');
      if (fs.existsSync(scoresFile)) {
        const data = JSON.parse(fs.readFileSync(scoresFile, 'utf8'));
        if (Array.isArray(data) && data.length > 0) {
          await QuizScore.insertMany(data.map(score => ({
            username: score.username.toLowerCase(),
            score: score.score,
            total: score.total,
            difficulty: score.difficulty,
            timestamp: score.timestamp || new Date()
          })));
          console.log(`✓ Seeded ${data.length} quiz scores`);
        }
      }
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

// Static data endpoints (catalogs - read-only from JSON files)
app.get('/data/quiz_scores.json', (req, res) => {
  try {
    const path_file = path.join(STATIC_DATA_DIR, 'quiz_scores.json');
    const raw = fs.readFileSync(path_file, 'utf8');
    res.type('application/json').send(raw);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to read quiz scores' });
  }
});

// Never expose user credentials
app.get('/data/userauth.json', (req, res) => {
  res.status(404).end();
});

// Serve other static data files (reactions, equipment, etc.)
app.use('/data', express.static(STATIC_DATA_DIR));

function isAdminRequest(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = req.headers['x-admin-token'];
  const query = req.query && req.query.token;
  return header === token || query === token;
}

// Admin export of runtime data (users + quiz scores)
app.get('/admin/export', async (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const users = await User.find().select('-password');
    const quizScores = await QuizScore.find();
    return res.json({
      success: true,
      users,
      quiz_scores: quizScores
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// Simple login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing username or password' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({ success: true, name: user.name || user.username });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Registration endpoint (admin UI can POST to this to add users)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, name } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing username or password' });
    }

    // Check if user already exists
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    // Create new user (password will be hashed by schema pre-hook)
    const user = new User({
      username: username.toLowerCase(),
      password,
      name: name || username
    });

    await user.save();
    return res.json({ success: true, message: 'User registered', name: user.name });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Quiz submit endpoint
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { username, score, total, difficulty } = req.body || {};
    if (!username || typeof score !== 'number' || typeof total !== 'number' || !difficulty) {
      return res.status(400).json({ success: false, message: 'Missing quiz submission fields' });
    }

    const normalizedDifficulty = String(difficulty).toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
      return res.status(400).json({ success: false, message: 'Invalid difficulty' });
    }

    // Create new quiz score entry
    const entry = new QuizScore({
      username: username.toLowerCase(),
      score: Number(score),
      total: Number(total),
      difficulty: normalizedDifficulty,
      timestamp: new Date()
    });

    await entry.save();

    // Calculate percentile rank for this difficulty
    const sameDifficultyScores = await QuizScore.find({ difficulty: normalizedDifficulty });
    const totalCount = sameDifficultyScores.length;
    const betterThanCount = sameDifficultyScores.filter(s => s.score < entry.score).length;
    const betterThanPct = totalCount === 0 ? 0 : Math.round((betterThanCount / totalCount) * 100);

    return res.json({ success: true, betterThanPct });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to submit quiz score' });
  }
});

// Quiz leaderboard (difficulty-specific)
app.get('/api/quiz/leaderboard', async (req, res) => {
  try {
    const difficulty = String(req.query.difficulty || 'easy').toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ success: false, message: 'Invalid difficulty' });
    }

    const scores = await QuizScore.find({ difficulty })
      .sort({ score: -1, timestamp: -1 })
      .limit(10)
      .lean();

    const formattedScores = scores.map(s => ({
      username: s.username,
      score: s.score,
      total: s.total,
      timestamp: s.timestamp
    }));

    return res.json({ success: true, difficulty, scores: formattedScores });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

// Quiz history by username
app.get('/api/quiz/history', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ success: false, message: 'Missing username' });
    }

    const history = await QuizScore.find({ username })
      .sort({ timestamp: -1 })
      .lean();

    return res.json({ success: true, history });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// Health check endpoint (useful for Render)
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    mongodb: dbConnected ? 'connected' : 'disconnected'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
