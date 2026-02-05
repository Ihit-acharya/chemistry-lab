#!/usr/bin/env node
/**
 * Migration script to transfer data from JSON files to MongoDB
 * Usage: node migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');
const QuizScore = require('./models/QuizScore');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chemistry-lab';
const DATA_DIR = path.join(__dirname, 'data');

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    // Clear existing data (optional - comment out to keep existing data)
    // console.log('🔄 Clearing existing data...');
    // await User.deleteMany({});
    // await QuizScore.deleteMany({});

    // Migrate users
    console.log('\n🔄 Migrating users...');
    const usersFile = path.join(DATA_DIR, 'userauth.json');
    if (fs.existsSync(usersFile)) {
      const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      let migrated = 0;
      
      for (const user of userData) {
        try {
          const exists = await User.findOne({ username: user.username.toLowerCase() });
          if (!exists) {
            const newUser = new User({
              username: user.username.toLowerCase(),
              password: user.password,
              name: user.name
            });
            await newUser.save();
            migrated++;
          }
        } catch (err) {
          console.error(`  ✗ Failed to migrate user ${user.username}: ${err.message}`);
        }
      }
      console.log(`✓ Migrated ${migrated} users`);
    } else {
      console.log('⚠ userauth.json not found');
    }

    // Migrate quiz scores
    console.log('\n🔄 Migrating quiz scores...');
    const scoresFile = path.join(DATA_DIR, 'quiz_scores.json');
    if (fs.existsSync(scoresFile)) {
      const scoresData = JSON.parse(fs.readFileSync(scoresFile, 'utf8'));
      
      if (Array.isArray(scoresData) && scoresData.length > 0) {
        const formattedScores = scoresData.map(score => ({
          username: score.username.toLowerCase(),
          score: score.score,
          total: score.total,
          difficulty: score.difficulty,
          timestamp: score.timestamp || new Date()
        }));

        const result = await QuizScore.insertMany(formattedScores, { ordered: false });
        console.log(`✓ Migrated ${result.length} quiz scores`);
      } else {
        console.log('⚠ No quiz scores to migrate');
      }
    } else {
      console.log('⚠ quiz_scores.json not found');
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    const userCount = await User.countDocuments();
    const scoreCount = await QuizScore.countDocuments();
    console.log(`  - Total users: ${userCount}`);
    console.log(`  - Total quiz scores: ${scoreCount}`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
