const quizGeneratorService = require('../services/quizGeneratorService');
const Quiz = require('../models/Quiz');
const { validationResult } = require('express-validator');

class QuizController {
  // Helpers privés
  _normalizeRequirements(reqBody) {
    if (!reqBody.requirements) {
      throw new Error('Les requirements du poste sont requis');
    }

    let requirements = reqBody.requirements;
    if (typeof requirements === 'string') {
      try {
        requirements = JSON.parse(requirements);
      } catch (e) {
        throw new Error('Format de requirements invalide');
      }
    }
    return requirements;
  }

  _formatQuizResponse(quiz, bankUsageStats = null) {
    const response = {
      quizId: quiz._id,
      title: quiz.title,
      sections: quiz.sections.length,
      totalQuestions: quiz.sections.reduce(
        (acc, section) => acc + section.questions.length, 0
      ),
      requirementData: quiz.requirementData
    };
    
    // Ajouter les statistiques d'utilisation de la banque si disponibles
    if (bankUsageStats) {
      response.questionBankUsage = bankUsageStats;
    }
    
    return response;
  }

  _sanitizeQuizForCandidate(quiz) {
    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      sections: quiz.sections.map(section => ({
        title: section.title,
        description: section.description,
        questions: section.questions.map(({ _id, questionText, type, category, difficultyLevel, options }) => ({
          _id,
          questionText,
          type,
          category,
          difficultyLevel,
          options: options?.map(({ _id, text }) => ({ _id, text }))
        }))
      }))
    };
  }

  // Endpoints
  async generateQuiz(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
  
      const requirements = this._normalizeRequirements(req.body);
      
      // Récupération des informations du recruteur
      const recruiter = req.body.recruiter;
      if (!recruiter || !recruiter._id || !recruiter.email) {
        return res.status(400).json({
          success: false,
          message: 'Informations du recruteur manquantes'
        });
      }
  
      // Options pour la banque de questions
      const options = {
        useQuestionBank: req.body.useQuestionBank !== false,
        preferBankQuestions: req.body.preferBankQuestions === true,
        minBankUsagePercent: req.body.minBankUsagePercent || 0,
        recruiter: {  // Ajout des infos recruteur aux options
          _id: recruiter._id,
          email: recruiter.email
        }
      };
      
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      const result = await quizGeneratorService.generateStandardQuiz(savedRequirement, options);
      
      const { quiz, bankUsageStats } = result.quiz ? result : { quiz: result, bankUsageStats: null };
  
      res.status(201).json({
        success: true,
        message: 'Quiz généré avec succès',
        data: this._formatQuizResponse(quiz, bankUsageStats)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du quiz',
        error: error.message
      });
    }
  }

  async getQuiz(req, res) {
    try {
      const { quizId } = req.params;
      if (!quizId) {
        return res.status(400).json({
          success: false,
          message: 'ID de quiz requis'
        });
      }

      const quiz = await Quiz.findById(quizId).populate('requirement').lean();
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz non trouvé'
        });
      }

      if (quiz.requirement?.jobDescription && quiz.requirementData && !quiz.requirementData.description) {
        quiz.requirementData.description = quiz.requirement.jobDescription;
      }

      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du quiz',
        error: error.message
      });
    }
  }

  async getCandidateVersion(req, res) {
    try {
      const { quizId } = req.params;
      if (!quizId) {
        return res.status(400).json({
          success: false,
          message: 'ID de quiz requis'
        });
      }

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz non trouvé'
        });
      }

      res.status(200).json({
        success: true,
        data: this._sanitizeQuizForCandidate(quiz)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du quiz',
        error: error.message
      });
    }
  }
  
  async submitQuizAnswers(req, res) {
    try {
      const { quizId } = req.params;
      const { candidateId, answers } = req.body;
      
      if (!quizId || !candidateId || !answers) {
        return res.status(400).json({
          success: false,
          message: 'ID de quiz, ID du candidat et réponses requis'
        });
      }
      
      // Appel au service pour enregistrer et évaluer les réponses
      const result = await quizGeneratorService.evaluateQuizSubmission(quizId, candidateId, answers);
      
      res.status(200).json({
        success: true,
        message: 'Réponses soumises avec succès',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la soumission des réponses',
        error: error.message
      });
    }
  }
  
  async getSubmissionResult(req, res) {
    try {
      const { submissionId } = req.params;
      if (!submissionId) {
        return res.status(400).json({
          success: false,
          message: 'ID de soumission requis'
        });
      }
  
      const submissionResult = await quizGeneratorService.getSubmissionResult(submissionId);
      
      if (!submissionResult) {
        return res.status(404).json({
          success: false,
          message: 'Résultat de soumission non trouvé'
        });
      }
  
      res.status(200).json({
        success: true,
        data: submissionResult
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du résultat de la soumission',
        error: error.message
      });
    }
  }
  
  // Nouveau point d'entrée pour générer un quiz uniquement à partir de la banque
  async generateQuizFromBank(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const requirements = this._normalizeRequirements(req.body);
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      
      // Forcer l'utilisation exclusive de la banque de questions
      const options = {
        useQuestionBank: true,
        preferBankQuestions: true,
        bankOnly: true // Option spéciale pour utiliser uniquement la banque
      };
      
      const result = await quizGeneratorService.generateStandardQuiz(savedRequirement, options);
      
      // Vérifier si le quiz a pu être généré complètement à partir de la banque
      if (!result.quiz) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de générer un quiz complet à partir de la banque de questions',
          data: {
            availableQuestions: result.bankUsageStats?.available || 0,
            requiredQuestions: result.bankUsageStats?.required || 0
          }
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Quiz généré avec succès à partir de la banque de questions',
        data: this._formatQuizResponse(result.quiz, result.bankUsageStats)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du quiz depuis la banque',
        error: error.message
      });
    }
  }
}

module.exports = new QuizController();