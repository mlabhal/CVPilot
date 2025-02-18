// routes/personalizedQuizRoutes.js
const express = require('express');
const router = express.Router();
const { controller: personalizedQuizController, handleSingleUpload, handleMultipleUpload } = require('../controllers/personalizedQuizController');
const auth = require('../middleware/auth'); // Utilisation de votre middleware auth existant
const {
  validateRequirements,
  validateIndexedQuizGeneration,
  validateTopCandidatesQuizGeneration,
  validateCVUpload,
  validateQuizRetrieval
} = require('../middleware/validationMiddleware');

// Middleware pour vérifier les permissions - version simplifiée pour le développement
const checkPermission = () => (req, res, next) => {
  // Pour le développement, on accepte toutes les permissions
  return next();
};

/**
 * @route POST /api/personalized-quiz/generate
 * @desc Génère un quiz personnalisé basé sur un CV et des requirements
 */
router.post(
  '/generate',  // Notez que le préfixe a été supprimé - c'est maintenant juste /generate
  handleSingleUpload,
  // auth, // Commenté pour les tests
  checkPermission(),
  validateCVUpload,
  personalizedQuizController.generateQuizFromCV
);

/**
 * @route POST /api/personalized-quiz/bulk-generate
 * @desc Génère des quiz personnalisés pour plusieurs candidats
 */
router.post(
  '/bulk-generate', // Préfixe supprimé
  handleMultipleUpload,
  // auth, // Commenté pour les tests
  checkPermission(),
  validateCVUpload,
  personalizedQuizController.generateBulkQuizzes
);

/**
 * @route GET /api/personalized-quiz/:quizId
 * @desc Récupère un quiz personnalisé complet par ID
 */
router.get(
  '/:quizId', // Préfixe supprimé
  // auth, // Commenté pour les tests
  checkPermission(),
  validateQuizRetrieval,
  personalizedQuizController.getPersonalizedQuiz
);

/**
 * @route GET /api/personalized-quiz/candidate/:quizId
 * @desc Récupère une version d'un quiz personnalisé pour un candidat (sans réponses)
 * @access Public (pas besoin d'authentification)
 */
router.get(
  '/candidate/:quizId', // Préfixe supprimé
  validateQuizRetrieval,
  personalizedQuizController.getCandidateVersion
);

/**
 * @route POST /api/personalized-quiz/generate-from-indexed/:fileId
 * @desc Génère un quiz personnalisé basé sur un CV déjà indexé dans ElasticSearch
 */
router.post(
  '/generate-from-indexed/:fileId', // Préfixe supprimé
  // auth, // Commenté pour les tests
  checkPermission(),
  validateIndexedQuizGeneration,
  personalizedQuizController.generateQuizFromIndexedCV
);

/**
 * @route POST /api/personalized-quiz/generate-for-top-candidates
 * @desc Génère des quiz pour les meilleurs candidats correspondant aux requirements
 */
router.post(
  '/generate-for-top-candidates', // Préfixe supprimé
  // auth, // Commenté pour les tests
  checkPermission(),
  validateTopCandidatesQuizGeneration,
  personalizedQuizController.generateQuizzesForTopCandidates
);

module.exports = router;