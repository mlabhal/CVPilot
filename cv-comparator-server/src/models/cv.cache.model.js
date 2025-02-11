// models/CVCache.js
const mongoose = require('mongoose');

const CVCacheSchema = new mongoose.Schema({
  fileName: { type: String, unique: true },
  lastModified: Date,
  extractedText: String,
  analysis: {
    skills: [String],
    tools: [String],
    experience_years: Number,
    education: [String],
    languages: [String],
    description_match: { // Ajout des informations de correspondance avec la description
      score: Number,
      relevant_experiences: [String],
      keyword_matches: [String]
    }
  },
  indexed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('CVCache', CVCacheSchema);