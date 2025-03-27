// models/QuestionBank.js
const mongoose = require('mongoose');

const QuestionBankSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['multiple_choice'],
    default: 'multiple_choice'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: {
    type: String
  },
  explanation: String,
  usageCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  totalAnswers: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date
}, { timestamps: true });

// Créer des index composés pour une récupération efficace
QuestionBankSchema.index({ category: 1, difficultyLevel: 1, subcategory: 1 });
QuestionBankSchema.index({ category: 1, difficultyLevel: 1 });
QuestionBankSchema.index({ category: 1, subcategory: 1 });

QuestionBankSchema.index({ subcategory: 1 });

// Créer un index textuel pour les recherches textuelles
QuestionBankSchema.index({ 
  questionText: 'text', 
  'options.text': 'text',
  subcategory: 'text'
});
const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);

module.exports = QuestionBank;