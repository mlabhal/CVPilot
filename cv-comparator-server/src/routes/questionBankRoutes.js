// routes/questionBankRoutes.js
const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionBankController');

// Routes des statistiques
router.get('/stats', questionBankController.getStats);

// Routes des catégories
router.get('/categories', questionBankController.getCategories);

// Routes des sous-catégories (nouvelles)
router.get('/subcategories', questionBankController.getSubcategories);
router.get('/subcategory/:subcategory', questionBankController.getQuestionsBySubcategory);

// Routes de recherche
router.get('/search', questionBankController.searchQuestions);

// Routes de génération
router.post('/generate', questionBankController.generateQuestions);
router.post('/generate-subcategory', questionBankController.generateQuestionsBySubcategory);

// Route d'import
router.post('/import', questionBankController.importQuestions);

// Routes CRUD sur les questions individuelles
// Note: Ces routes avec paramètre dynamique doivent venir après les routes spécifiques
// pour éviter les conflits
router.get('/:id', questionBankController.getQuestion);
router.post('/', questionBankController.addQuestion);
router.put('/:id', questionBankController.updateQuestion);
router.delete('/:id', questionBankController.deleteQuestion);

module.exports = router;