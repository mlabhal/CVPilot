const { body, param } = require('express-validator');

/**
 * Validations pour les requirements du poste
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
          
          // Validation de la structure des requirements
          const requiredFields = ['description', 'skills', 'tools'];
          for (const field of requiredFields) {
            if (!parsed[field]) {
              throw new Error(`Le champ ${field} est requis dans les requirements`);
            }
          }
          
          // Validation des tableaux
          if (!Array.isArray(parsed.skills) || parsed.skills.length === 0) {
            throw new Error('Les skills doivent être un tableau non vide');
          }
          if (!Array.isArray(parsed.tools) || parsed.tools.length === 0) {
            throw new Error('Les tools doivent être un tableau non vide');
          }
          
        } catch (e) {
          throw new Error(`Validation des requirements échouée: ${e.message}`);
        }
      } else if (typeof value !== 'object') {
        throw new Error('Les requirements doivent être un objet');
      }
      return true;
    }),

  // Validation des champs individuels si fournis directement comme objet
  body('requirements.description')
    .if(body('requirements').isObject())
    .exists().withMessage('La description du poste est requise')
    .isString().withMessage('La description doit être une chaîne de caractères')
    .trim()
    .notEmpty().withMessage('La description ne peut pas être vide'),

  body('requirements.skills')
    .if(body('requirements').isObject())
    .isArray().withMessage('Les skills doivent être un tableau')
    .notEmpty().withMessage('Au moins une compétence est requise'),

  body('requirements.tools')
    .if(body('requirements').isObject())
    .isArray().withMessage('Les tools doivent être un tableau')
    .notEmpty().withMessage('Au moins un outil est requis'),

  body('requirements.experience_years')
    .if(body('requirements').isObject())
    .optional()
    .isInt({ min: 0 }).withMessage('Les années d\'expérience doivent être un nombre positif'),

  body('requirements.education')
    .if(body('requirements').isObject())
    .optional()
    .isArray().withMessage('L\'éducation doit être un tableau'),

  body('requirements.languages')
    .if(body('requirements').isObject())
    .optional()
    .isArray().withMessage('Les langues doivent être un tableau')
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
  validateQuizRetrieval
};