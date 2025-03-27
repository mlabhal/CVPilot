// models/Quiz.js
const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false
  }
});

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['multiple_choice', 'true_false', 'open_ended', 'coding'],
    default: 'multiple_choice'
  },
  options: [OptionSchema],
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  explanation: {
    type: String,
    trim: true
  }
});

const SectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [QuestionSchema]
});

const CandidateInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  matchingSkills: [{
    type: String,
    trim: true
  }],
  skillMatchPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  experienceYears: {
    type: Number,
    min: 0,
    default: 0
  },
  fileId: {
    type: String,
    trim: true
  }
});

const ResultSchema = new mongoose.Schema({
  candidateId: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  timeSpent: {
    type: Number, // en secondes
    default: 0
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOptions: [String],
    openAnswer: String,
    isCorrect: Boolean,
    score: Number
  }],
  feedback: {
    type: String,
    trim: true
  }
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['standard', 'personalized'],
    default: 'standard'
  },
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement'
  },
  requirementData: {
    description: String,
    skills: [String],
    tools: [String],
    experience_years: Number,
    education: [String],
    languages: [String]
  },
  candidateInfo: CandidateInfoSchema,
  sections: [SectionSchema],
  timeLimit: {
    type: Number, // en minutes
    default: 60
  },
  recruiter: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  passingScore: {
    type: Number,
    default: 70
  },
  difficultyAdjustment: {
    type: String,
    enum: ['easier', 'standard', 'harder'],
    default: 'standard'
  },
  focusAreas: [{
    type: String,
    trim: true
  }],
  results: [ResultSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'completed'],
    default: 'draft'
  },
  sendMethod: {
    type: String,
    enum: ['email', 'link', 'api'],
    default: 'email'
  },
  sentAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

// Middleware pré-sauvegarde pour mettre à jour le champ updatedAt
QuizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Définir la date d'expiration si elle n'est pas définie (14 jours par défaut)
  if (!this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);
    this.expiresAt = expiryDate;
  }
  
  next();
});

// Méthode pour calculer le nombre total de questions
QuizSchema.methods.getTotalQuestions = function() {
  return this.sections.reduce((total, section) => total + section.questions.length, 0);
};

// Méthode pour obtenir une version pour candidat (sans les réponses)
QuizSchema.methods.getCandidateVersion = function() {
  const candidateQuiz = this.toObject();
  
  // Supprimer les informations sensibles
  delete candidateQuiz.results;
  
  // Masquer les réponses correctes
  candidateQuiz.sections = candidateQuiz.sections.map(section => ({
    ...section,
    questions: section.questions.map(question => {
      const candidateQuestion = { ...question };
      
      // Garder uniquement le texte des options, pas les réponses correctes
      if (candidateQuestion.options && candidateQuestion.options.length > 0) {
        candidateQuestion.options = candidateQuestion.options.map(option => ({
          _id: option._id,
          text: option.text
        }));
      }
      
      delete candidateQuestion.explanation;
      return candidateQuestion;
    })
  }));
  
  return candidateQuiz;
};

const Quiz = mongoose.model('Quiz', QuizSchema);
module.exports = Quiz;