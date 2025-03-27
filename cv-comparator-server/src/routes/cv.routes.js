const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const upload = require('../middleware/upload.middleware');
const { client } = require('../../config/elasticsearch');
const SyncService = require('../services/sync.service'); // Assurez-vous que ce service est correctement importé

/**
 * Route pour comparer plusieurs CV en parallèle (jusqu'à 10)
 * Cette route utilise la nouvelle fonctionnalité de comparaison parallèle
 */
router.post('/compare', upload.array('cvFiles', 10), async (req, res, next) => {
  try {
    // Vérification du nombre de fichiers
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Aucun fichier fourni',
        message: 'Veuillez télécharger au moins un CV'
      });
    }
    
    if (req.files.length > 10) {
      return res.status(400).json({
        error: 'Trop de fichiers',
        message: 'La comparaison est limitée à 10 CV maximum'
      });
    }
    
    // Déléguer au contrôleur pour la comparaison
    await cvController.compareCV(req, res, next);
  } catch (error) {
    console.error('Erreur lors de la comparaison des CV:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erreur lors de la comparaison',
        message: error.message
      });
    }
  }
});

/**
 * Route pour rechercher des CV dans Elasticsearch
 */
router.post('/search', async (req, res, next) => {
  try {
    // Vérification index
    const indexExists = await client.indices.exists({ index: 'cvs' });
    if (!indexExists) {
      console.error('Index cvs non trouvé');
      return res.status(500).json({ 
        error: 'Index non trouvé',
        message: 'Aucun CV n\'a encore été indexé' 
      });
    }
    
    // Vérification documents
    const count = await client.count({ index: 'cvs' });
    console.log('Nombre de documents indexés:', count.count);
    
    if (count.count === 0) {
      return res.status(404).json({
        error: 'Aucun CV indexé',
        message: 'Veuillez d\'abord indexer des CVs'
      });
    }

    // Appel controller avec next pour la gestion d'erreur
    await cvController.searchCV(req, res, next);

  } catch (error) {
    console.error('Erreur détaillée route /search:', {
      message: error.message,
      stack: error.stack
    });
    
    // Éviter double réponse si le contrôleur a déjà répondu
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erreur lors de la recherche',
        message: error.message 
      });
    }
  }
});

/**
 * Route de synchronisation sur elasticsearch
 * Correction : cette route était imbriquée dans /search précédemment
 */
router.post('/sync', async (req, res, next) => {
  try {
    const result = await SyncService.synchronizeFilesAndES();
    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erreur lors de la synchronisation',
        message: error.message
      });
    }
  }
});

/**
 * Nouvelle route pour comparer des CV par format JSON
 * Utile pour les clients frontend qui ont déjà le texte des CV
 */
router.post('/compare-json', async (req, res, next) => {
  try {
    const { cvList, requirements } = req.body;
    
    // Validation
    if (!Array.isArray(cvList)) {
      return res.status(400).json({ 
        error: "Le paramètre 'cvList' doit être un tableau d'objets CV" 
      });
    }
    
    if (!requirements) {
      return res.status(400).json({ 
        error: "Le paramètre 'requirements' est requis pour la comparaison" 
      });
    }
    
    // Déléguer au contrôleur
    req.cvList = cvList;
    req.requirements = requirements;
    await cvController.compareJsonCV(req, res, next);
  } catch (error) {
    console.error('Erreur lors de la comparaison JSON:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erreur lors de la comparaison',
        message: error.message
      });
    }
  }
});

/**
 * Route pour vider le cache du service
 */
router.post('/clear-cache', (req, res) => {
  try {
    const result = cvController.clearCache();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors du vidage du cache',
      message: error.message
    });
  }
});

module.exports = router;