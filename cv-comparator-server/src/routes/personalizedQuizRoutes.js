const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const { validateRequirements, validateQuizRetrieval } = require('../middleware/validationMiddleware');

// Middleware de vérification des permissions (à adapter selon vos besoins)
const checkPermission = () => (req, res, next) => next();

/**
 * @route POST /api/quiz/generate
 * @description Génère un quiz basé sur les requirements du poste
 * @access Private
 */
router.post(
  '/generate',
  auth,
  checkPermission(),
  validateRequirements,
  (req, res) => quizController.generateQuiz(req, res)
);

/**
 * @route GET /api/quiz/:quizId
 * @description Récupère un quiz complet avec les réponses (pour l'admin)
 * @access Private
 */
router.get(
  '/:quizId',
  auth,
  checkPermission(),
  validateQuizRetrieval,
  (req, res) => quizController.getQuiz(req, res)
);

/**
 * @route GET /api/quiz/candidate/:quizId
 * @description Récupère la version candidat du quiz (sans les réponses)
 * @access Public
 */
router.get(
  '/candidate/:quizId',
  validateQuizRetrieval,
  (req, res) => quizController.getCandidateVersion(req, res)
);

module.exports = router;