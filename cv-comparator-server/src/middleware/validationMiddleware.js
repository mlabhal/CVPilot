// middleware/validationMiddleware.js
const { body, param, query } = require('express-validator');

/**
 * Validations pour les requirements
 */
const validateRequirements = [
  body('requirements')
    .exists().withMessage('Les requirements sont requis')
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object') {
            throw new Error('Les requirements doivent être un objet');
          }
        } catch (e) {
          throw new Error('Format JSON invalide pour les requirements');
        }
      } else if (typeof value !== 'object') {
        throw new Error('Les requirements doivent être un objet');
      }
      return true;
    })
];

/**
 * Validations pour la génération de quiz depuis un CV indexé
 */
const validateIndexedQuizGeneration = [
  ...validateRequirements,
  param('fileId')
    .exists().withMessage('L\'ID du fichier est requis')
    .isString().withMessage('L\'ID du fichier doit être une chaîne de caractères')
    .trim()
    .notEmpty().withMessage('L\'ID du fichier ne peut pas être vide')
];

/**
 * Validations pour la génération de quiz pour les meilleurs candidats
 */
const validateTopCandidatesQuizGeneration = [
  ...validateRequirements,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('La limite doit être un entier entre 1 et 20')
    .toInt()
];

/**
 * Validations pour l'upload de CV
 */
const validateCVUpload = [
  ...validateRequirements,
  body()
    .custom((_, { req }) => {
      if (!req.file && !req.files) {
        throw new Error('Au moins un fichier CV est requis');
      }
      return true;
    })
];

/**
 * Validations pour la récupération d'un quiz
 */
const validateQuizRetrieval = [
  param('quizId')
    .exists().withMessage('L\'ID du quiz est requis')
    .isMongoId().withMessage('ID de quiz invalide')
];

module.exports = {
  validateRequirements,
  validateIndexedQuizGeneration,
  validateTopCandidatesQuizGeneration,
  validateCVUpload,
  validateQuizRetrieval
};