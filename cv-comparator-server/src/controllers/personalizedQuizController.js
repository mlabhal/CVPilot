// controllers/personalizedQuizController.js
const quizGeneratorService = require('../services/quizGeneratorService');
const Quiz = require('../models/Quiz');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Seuls PDF, DOC et DOCX sont acceptés.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

class PersonalizedQuizController {
  /**
   * Génère un quiz personnalisé basé sur un CV et des requirements
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async generateQuizFromCV(req, res) {
    try {
      // Vérification des erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      // Vérification de la présence des requirements
      if (!req.body.requirements) {
        return res.status(400).json({
          success: false,
          message: 'Les requirements du poste sont requis'
        });
      }

      // Normalisation des requirements
      let requirements = req.body.requirements;
      if (typeof requirements === 'string') {
        try {
          requirements = JSON.parse(requirements);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format de requirements invalide'
          });
        }
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Un fichier CV est requis'
        });
      }

      // Stockage des requirements
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      
      // Génération du quiz
      const quiz = await quizGeneratorService.analyzeAndGenerateQuiz(file.path, savedRequirement);

      res.status(201).json({
        success: true,
        message: 'Quiz personnalisé généré avec succès',
        data: {
          quizId: quiz._id,
          title: quiz.title,
          sections: quiz.sections.length,
          totalQuestions: quiz.sections.reduce(
            (acc, section) => acc + section.questions.length, 0
          ),
          candidateInfo: {
            name: quiz.candidateInfo.name,
            skillMatchPercent: quiz.candidateInfo.skillMatchPercent
          },
          difficultyAdjustment: quiz.difficultyAdjustment,
          focusAreas: quiz.focusAreas
        }
      });
    } catch (error) {
      console.error('Erreur dans generateQuizFromCV:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du quiz personnalisé',
        error: error.message
      });
    }
  }
  /**
   * Génère un quiz basé sur un CV déjà indexé
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async generateQuizFromIndexedCV(req, res) {
    try {
      // Vérification des erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }
      
      const { fileId } = req.params;
      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: 'L\'ID du CV est requis'
        });
      }
      
      // Récupération et normalisation des requirements
      let requirements = req.body.requirements;
      if (typeof requirements === 'string') {
        try {
          requirements = JSON.parse(requirements);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format de requirements invalide'
          });
        }
      }
      
      // Stockage des requirements
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      
      // Génération du quiz
      const quiz = await quizGeneratorService.generateQuizFromIndexedCV(fileId, savedRequirement);
      
      res.status(201).json({
        success: true,
        message: 'Quiz personnalisé généré avec succès',
        data: {
          quizId: quiz._id,
          title: quiz.title,
          sections: quiz.sections.length,
          totalQuestions: quiz.sections.reduce(
            (acc, section) => acc + section.questions.length, 0
          ),
          candidateInfo: {
            name: quiz.candidateInfo.name,
            skillMatchPercent: quiz.candidateInfo.skillMatchPercent
          },
          difficultyAdjustment: quiz.difficultyAdjustment,
          focusAreas: quiz.focusAreas
        }
      });
    } catch (error) {
      console.error('Erreur dans generateQuizFromIndexedCV:', error);
      res.status(error.message.includes('non trouvé') ? 404 : 500).json({
        success: false,
        message: 'Erreur lors de la génération du quiz',
        error: error.message
      });
    }
  }
  
  /**
   * Génère des quiz pour les meilleurs candidats correspondant aux requirements
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async generateQuizzesForTopCandidates(req, res) {
    try {
      // Vérification des erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }
      
      // Récupération des parameters
      const { limit } = req.query;
      const maxCandidates = Math.min(parseInt(limit) || 5, 10); // Maximum 10 candidats
      
      // Récupération et normalisation des requirements
      let requirements = req.body.requirements;
      if (typeof requirements === 'string') {
        try {
          requirements = JSON.parse(requirements);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format de requirements invalide'
          });
        }
      }
      
      if (!requirements || typeof requirements !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Les requirements du poste sont requis'
        });
      }
      
      // Stockage des requirements
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      
      // Génération des quiz
      const results = await quizGeneratorService.generateQuizzesForTopCandidates(savedRequirement, maxCandidates);
      
      // Résumé des résultats
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
      
      res.status(200).json({
        success: true,
        message: `${summary.successful} quiz générés pour les ${summary.total} meilleurs candidats`,
        summary,
        results
      });
    } catch (error) {
      console.error('Erreur dans generateQuizzesForTopCandidates:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des quiz',
        error: error.message
      });
    }
  }
  /**
   * Génère un quiz personnalisé basé sur un CV et des requirements
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async generateQuizFromCV(req, res) {
    try {
      // Vérification de la présence des requirements
      if (!req.body.requirements) {
        return res.status(400).json({
          success: false,
          message: 'Les requirements du poste sont requis'
        });
      }

      // Normalisation des requirements
      let requirements = req.body.requirements;
      if (typeof requirements === 'string') {
        try {
          requirements = JSON.parse(requirements);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format de requirements invalide'
          });
        }
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Un fichier CV est requis'
        });
      }

      // Stockage des requirements
      const savedRequirement = await quizGeneratorService.storeRequirement(requirements);
      
      // Génération du quiz
      const quiz = await quizGeneratorService.analyzeAndGenerateQuiz(file.path, savedRequirement);

      res.status(201).json({
        success: true,
        message: 'Quiz personnalisé généré avec succès',
        data: {
          quizId: quiz._id,
          title: quiz.title,
          sections: quiz.sections.length,
          totalQuestions: quiz.sections.reduce(
            (acc, section) => acc + section.questions.length, 0
          ),
          candidateInfo: {
            name: quiz.candidateInfo.name,
            skillMatchPercent: quiz.candidateInfo.skillMatchPercent
          },
          difficultyAdjustment: quiz.difficultyAdjustment,
          focusAreas: quiz.focusAreas
        }
      });
    } catch (error) {
      console.error('Erreur dans generateQuizFromCV:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du quiz personnalisé',
        error: error.message
      });
    }
  }

  /**
   * Génère des quiz personnalisés pour plusieurs candidats à partir de leurs CVs
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async generateBulkQuizzes(req, res) {
    try {
      // Vérification de la présence des requirements
      if (!req.body.requirements) {
        return res.status(400).json({
          success: false,
          message: 'Les requirements du poste sont requis'
        });
      }

      // Normalisation des requirements
      let requirements = req.body.requirements;
      if (typeof requirements === 'string') {
        try {
          requirements = JSON.parse(requirements);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Format de requirements invalide'
          });
        }
      }

      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins un fichier CV est requis'
        });
      }

      // Traitement asynchrone de chaque CV
      const quizPromises = files.map(async (file) => {
        try {
          const quiz = await quizGeneratorService.analyzeAndGenerateQuiz(file.path, requirements);
          return {
            success: true,
            candidateName: quiz.candidateInfo.name,
            quizId: quiz._id,
            title: quiz.title
          };
        } catch (error) {
          console.error(`Erreur pour le fichier ${file.originalname}:`, error);
          return {
            success: false,
            candidateName: file.originalname,
            error: error.message
          };
        }
      });

      const results = await Promise.all(quizPromises);

      // Résumé des résultats
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };

      res.status(200).json({
        success: true,
        message: `${summary.successful} quiz générés sur ${summary.total} CVs`,
        summary,
        results
      });
    } catch (error) {
      console.error('Erreur dans generateBulkQuizzes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des quiz personnalisés',
        error: error.message
      });
    }
  }

  /**
   * Récupère un quiz personnalisé par ID
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async getPersonalizedQuiz(req, res) {
    try {
      const { quizId } = req.params;
      
      if (!quizId) {
        return res.status(400).json({
          success: false,
          message: 'ID de quiz requis'
        });
      }
  
      // Récupérer le quiz avec un populate sur le requirement
      const quiz = await Quiz.findById(quizId)
        .populate('requirement')
        .lean(); // Utiliser lean() pour obtenir un objet JavaScript simple
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz personnalisé non trouvé'
        });
      }
      
      // Vérifier si requirement existe et copier sa description dans requirementData si nécessaire
      if (quiz.requirement && quiz.requirement.jobDescription && 
          quiz.requirementData && !quiz.requirementData.description) {
        quiz.requirementData.description = quiz.requirement.jobDescription;
      }
      
      // Si le requirement n'est pas trouvé mais que nous avons un requirementId
      if (!quiz.requirement && quiz.requirement) {
        console.log(`Requirement ${quiz.requirement} non trouvé, impossible de récupérer la description`);
      }
      
      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Erreur dans getPersonalizedQuiz:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du quiz personnalisé',
        error: error.message
      });
    }
  }

  /**
   * Récupère une version du quiz prête à être envoyée au candidat (sans les réponses)
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
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
          message: 'Quiz personnalisé non trouvé'
        });
      }
      
      // Retirer les réponses correctes pour le candidat
      const candidateQuiz = {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        sections: quiz.sections.map(section => ({
          title: section.title,
          description: section.description,
          questions: section.questions.map(question => {
            const candidateQuestion = {
              _id: question._id,
              questionText: question.questionText,
              type: question.type,
              category: question.category,
              difficultyLevel: question.difficultyLevel
            };
            
            // Transformer les options pour masquer les réponses correctes
            if (question.options && question.options.length > 0) {
              candidateQuestion.options = question.options.map(option => ({
                _id: option._id,
                text: option.text
              }));
            }
            
            return candidateQuestion;
          })
        }))
      };
      
      res.status(200).json({
        success: true,
        data: candidateQuiz
      });
    } catch (error) {
      console.error('Erreur dans getCandidateVersion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du quiz candidat',
        error: error.message
      });
    }
  }
}

// Middleware d'upload pour les routes
// Dans personalizedQuizController.js
const handleSingleUpload = (req, res, next) => {
    console.log('Début du middleware handleSingleUpload');
    console.log('Headers:', req.headers['content-type']);
    
    upload.single('cv')(req, res, (err) => {
      console.log('Callback de upload.single exécuté');
      if (err) {
        console.error('Erreur Multer:', err);
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de l\'upload du fichier',
          error: err.message
        });
      }
      
      console.log('Fichier uploadé:', req.file);
      console.log('Body après upload:', req.body);
      next();
    });
  };

const handleMultipleUpload = (req, res, next) => {
  upload.array('cvs', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'Erreur d\'upload',
        error: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: 'Erreur lors du traitement des fichiers',
        error: err.message
      });
    }
    next();
  });
};

// Export avec les middlewares
module.exports = {
  controller: new PersonalizedQuizController(),
  handleSingleUpload,
  handleMultipleUpload
};