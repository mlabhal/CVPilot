const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const upload = require('../middleware/upload.middleware');
const { client } = require('../../config/elasticsearch');

// Routes existantes
router.post('/compare', upload.array('cvFiles'), cvController.compareCV);

// Route de recherche avec vérification ES
router.post('/search', async (req, res) => {
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
    //route de sycnhronisation sur elasticsearch
    router.post('/sync', async (req, res) => {
      try {
        const result = await SyncService.synchronizeFilesAndES();
        res.json(result);
      } catch (error) {
        next(error);
      }
    });
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
    await cvController.searchCV(req, res);

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

module.exports = router;