// models/Requirement.js
const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  jobDescription: {
    type: String,
    required: true,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  tools: [{
    type: String,
    trim: true
  }],
  experience_years: {
    type: Number,
    default: 0
  },
  education: [{
    type: String,
    trim: true
  }],
  languages: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  active: {
    type: Boolean,
    default: true
  },
  company: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  contractType: {
    type: String,
    enum: ['CDI', 'CDD', 'Freelance', 'Stage', 'Alternance', 'Autre'],
    default: 'CDI'
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'EUR'
    }
  },
  remote: {
    type: Boolean,
    default: false
  }
});

// Middleware pré-sauvegarde pour mettre à jour le champ updatedAt
RequirementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour vérifier si un CV correspond aux requirements
RequirementSchema.methods.matchCV = function(cvData) {
  const skillsScore = cvData.matching_skills?.length / this.skills.length || 0;
  const toolsScore = cvData.matching_tools?.length / this.tools.length || 0;
  const experienceScore = cvData.experience_years >= this.experience_years ? 1 : cvData.experience_years / this.experience_years;
  
  // Pondération
  const weights = {
    skills: 0.5,
    tools: 0.3,
    experience: 0.2
  };
  
  const totalScore = (
    skillsScore * weights.skills +
    toolsScore * weights.tools +
    experienceScore * weights.experience
  );
  
  return {
    score: totalScore,
    skillsMatch: skillsScore,
    toolsMatch: toolsScore,
    experienceMatch: experienceScore,
    isMatch: totalScore >= 0.7 // 70% de correspondance minimum
  };
};

const Requirement = mongoose.model('Requirement', RequirementSchema);
module.exports = Requirement;