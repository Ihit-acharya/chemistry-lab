const mongoose = require('mongoose');

const quizScoreSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 1
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create a compound index for efficient queries
quizScoreSchema.index({ difficulty: 1, timestamp: -1 });
quizScoreSchema.index({ username: 1, timestamp: -1 });

module.exports = mongoose.model('QuizScore', quizScoreSchema);
