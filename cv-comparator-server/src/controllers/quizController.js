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

  _formatQuizResponse(quiz) {
    return {
      quizId: quiz._id,
      title: quiz.title,
      sections: quiz.sections.length,
      totalQuestions: quiz.sections.reduce(
        (acc, section) => acc + section.questions.length, 0
      ),
      requirementData: quiz.requirementData
    };
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
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      const quiz = await quizGeneratorService.generateStandardQuiz(savedRequirement);

      res.status(201).json({
        success: true,
        message: 'Quiz généré avec succès',
        data: this._formatQuizResponse(quiz)
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
}

module.exports = new QuizController();