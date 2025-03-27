const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const recordingController = require('../controllers/recordingController');
const auth = require('../middleware/auth');
const { validateRequirements, validateQuizRetrieval } = require('../middleware/validationMiddleware');
const { uploadVideo } = require('../middleware/upload.middleware');

// Middleware de vérification des permissions
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
 * @route GET /api/quiz/:quizId/candidate
 * @description Récupère la version candidat du quiz (sans les réponses)
 * @access Public
 */
router.get(
  '/:quizId/candidate',
  validateQuizRetrieval,
  (req, res) => quizController.getCandidateVersion(req, res)
);

/**
 * @route POST /api/quiz/:quizId/submissions
 * @description Soumet les réponses d'un candidat
 * @access Public
 */
router.post(
  '/:quizId/submissions',
  (req, res) => quizController.submitQuizAnswers(req, res)
);

/**
 * @route GET /api/quiz/submissions/:submissionId
 * @description Récupère les résultats d'une soumission
 * @access Public
 */
router.get(
  '/submissions/:submissionId',
  (req, res) => quizController.getSubmissionResult(req, res)
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
 * @route POST /api/quiz/recordings/cloud-upload
 * @description Envoie une vidéo d'enregistrement de session au stockage cloud (expire après 48h)
 * @access Public
 */
router.post(
  '/recordings/cloud-upload',
  uploadVideo.single('video'),  // Middleware multer pour la vidéo
  recordingController.uploadToCloud
);

/**
 * @route GET /api/quiz/submissions/:submissionId/video
 * @description Récupère l'URL de la vidéo associée à une soumission
 * @access Private
 */
router.get(
  '/submissions/:submissionId/video',
  auth,
  checkPermission(),
  recordingController.getVideoUrl
);

/**
 * @route POST /api/quiz/submissions/:submissionId/refresh-video
 * @description Régénère une URL expirée pour la vidéo d'une soumission
 * @access Private
 */
router.post(
  '/submissions/:submissionId/refresh-video',
  auth,
  checkPermission(),
  recordingController.refreshVideoUrl
);

module.exports = router;