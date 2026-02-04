const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const STATIC_DATA_DIR = path.join(__dirname, 'data');
// Writable location for runtime JSON (quiz scores, users). On Render, point this at a persistent disk mount.
const RUNTIME_DATA_DIR = process.env.RUNTIME_DATA_DIR || STATIC_DATA_DIR;

// Serve the static frontend (local dev and optional single-host deployments)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(FRONTEND_DIR));
}


// Ensure runtime data dir exists
try {
  fs.mkdirSync(RUNTIME_DATA_DIR, { recursive: true });
} catch (err) {
  console.error('Failed to create runtime data directory:', err.message);
}

function ensureRuntimeFile(filename, defaultJson, seedFromStatic = true) {
  const runtimePath = path.join(RUNTIME_DATA_DIR, filename);
  if (fs.existsSync(runtimePath)) return runtimePath;

  try {
    const staticPath = path.join(STATIC_DATA_DIR, filename);
    if (seedFromStatic && fs.existsSync(staticPath)) {
      fs.copyFileSync(staticPath, runtimePath);
      return runtimePath;
    }
    fs.writeFileSync(runtimePath, JSON.stringify(defaultJson, null, 2), 'utf8');
    return runtimePath;
  } catch (err) {
    console.error(`Failed to initialize runtime file ${filename}:`, err.message);
    return runtimePath;
  }
}

// Quiz scores persistence
const QUIZ_SCORES_FILE = ensureRuntimeFile('quiz_scores.json', [], false);
let quizScores = [];

function loadQuizScores() {
  try {
    if (!fs.existsSync(QUIZ_SCORES_FILE)) {
      fs.writeFileSync(QUIZ_SCORES_FILE, '[]', 'utf8');
    }
    const raw = fs.readFileSync(QUIZ_SCORES_FILE, 'utf8');
    quizScores = JSON.parse(raw);
    if (!Array.isArray(quizScores)) quizScores = [];
  } catch (err) {
    console.error('Failed to load quiz scores:', err.message);
    quizScores = [];
  }
}

function saveQuizScores() {
  try {
    fs.writeFileSync(QUIZ_SCORES_FILE, JSON.stringify(quizScores, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save quiz scores:', err.message);
  }
}

loadQuizScores();

// Load users from data/userauth.json and ensure passwords are hashed
const USERS_FILE = ensureRuntimeFile('userauth.json', [], true);
let users = [];
function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log('Saved users to userauth.json');
  } catch (err) {
    console.error('Failed to save users:', err.message);
  }
}

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    users = JSON.parse(raw);
    // Convert any plaintext passwords to bcrypt hashes (one-time migration)
    let changed = false;
    users = users.map(u => {
      if (u.password && typeof u.password === 'string' && !u.password.startsWith('$2')) {
        const hashed = bcrypt.hashSync(u.password, 10);
        changed = true;
        return { ...u, password: hashed };
      }
      return u;
    });
    if (changed) saveUsers();
    console.log(`Loaded ${users.length} users from userauth.json`);
  } catch (err) {
    console.error('Failed to load users:', err.message);
    users = [];
  }
}

loadUsers();

// Data endpoints used by the frontend (JSON catalog + persisted quiz scores)
app.get('/data/quiz_scores.json', (req, res) => {
  try {
    const raw = fs.readFileSync(QUIZ_SCORES_FILE, 'utf8');
    res.type('application/json').send(raw);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to read quiz scores' });
  }
});

// Never expose user credential storage
app.get('/data/userauth.json', (req, res) => {
  res.status(404).end();
});

app.use('/data', express.static(STATIC_DATA_DIR));

function isAdminRequest(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = req.headers['x-admin-token'];
  const query = req.query && req.query.token;
  return header === token || query === token;
}

// Admin export of runtime data (users + quiz scores)
app.get('/admin/export', (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const usersRaw = fs.readFileSync(USERS_FILE, 'utf8');
    const scoresRaw = fs.readFileSync(QUIZ_SCORES_FILE, 'utf8');
    return res.json({
      success: true,
      users: JSON.parse(usersRaw),
      quiz_scores: JSON.parse(scoresRaw)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// Simple login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing username or password' });
  }

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Support both hashed (bcrypt) and legacy plaintext (should be migrated on load)
  const stored = user.password || '';
  let ok = false;
  try {
    if (stored.startsWith('$2')) {
      ok = bcrypt.compareSync(password, stored);
    } else {
      ok = password === stored;
    }
  } catch (err) {
    ok = false;
  }

  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  return res.json({ success: true, name: user.name || user.username });
});

// Registration endpoint (admin UI can POST to this to add users)
app.post('/api/register', (req, res) => {
  const { username, password, name } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing username or password' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ success: false, message: 'Username already exists' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const newUser = { username, password: hashed, name: name || username };
  users.push(newUser);
  saveUsers();
  return res.json({ success: true, message: 'User registered', name: newUser.name });
});

// Quiz submit endpoint
app.post('/api/quiz/submit', (req, res) => {
  const { username, score, total, difficulty } = req.body || {};
  if (!username || typeof score !== 'number' || typeof total !== 'number' || !difficulty) {
    return res.status(400).json({ success: false, message: 'Missing quiz submission fields' });
  }

  const normalizedDifficulty = String(difficulty).toLowerCase();
  const validDifficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty);
  if (!validDifficulty) {
    return res.status(400).json({ success: false, message: 'Invalid difficulty' });
  }

  const now = new Date().toISOString();
  const entry = {
    username: String(username),
    score: Number(score),
    total: Number(total),
    difficulty: normalizedDifficulty,
    timestamp: now
  };

  const sameDifficultyScores = quizScores.filter(s => s.difficulty === normalizedDifficulty);
  const totalCount = sameDifficultyScores.length;
  const betterThanCount = sameDifficultyScores.filter(s => s.score < entry.score).length;
  const betterThanPct = totalCount === 0 ? 0 : Math.round((betterThanCount / totalCount) * 100);

  quizScores.push(entry);
  saveQuizScores();

  return res.json({ success: true, betterThanPct });
});

// Quiz leaderboard (difficulty-specific)
app.get('/api/quiz/leaderboard', (req, res) => {
  const difficulty = String(req.query.difficulty || 'easy').toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ success: false, message: 'Invalid difficulty' });
  }

  const scores = quizScores
    .filter(s => s.difficulty === difficulty)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 10)
    .map(s => ({
      username: s.username,
      score: s.score,
      total: s.total,
      timestamp: s.timestamp
    }));

  return res.json({ success: true, difficulty, scores });
});

// Quiz history by username
app.get('/api/quiz/history', (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) {
    return res.status(400).json({ success: false, message: 'Missing username' });
  }

  const history = quizScores
    .filter(s => s.username === username)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return res.json({ success: true, history });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
