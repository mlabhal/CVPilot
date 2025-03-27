// models/QuizSubmission.js
const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  candidateId: {
    type: String,  // Ou référence à un modèle Candidate si vous en avez un
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: false  // Modifié de true à false pour permettre null
    }
  }],
  score: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Nouveaux champs pour la gestion des vidéos
  videoUrl: {
    type: String,
    required: false
  },
  videoKey: {
    type: String,
    required: false
  },
  videoExpires: {
    type: Date,
    required: false
  },
  // Informations de sécurité (optionnel)
  securityInfo: {
    tabSwitches: Number,
    phoneDetections: Number,
    submittedDueToTabSwitch: Boolean,
    submittedDueToPhoneDetection: Boolean
  }
}, { timestamps: true });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);