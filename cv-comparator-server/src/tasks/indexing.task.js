// tasks/indexing.task.js
const cron = require('node-cron');
const CVCache = require('../models/cv.cache.model');
const cvService = require('../services/cv.service');

// Exécuter chaque nuit à 2h du matin
cron.schedule('0 2 * * *', async () => {
  try {
    const unindexedCVs = await CVCache.find({ indexed: false });
    
    for (const cv of unindexedCVs) {
      await cvService.indexCV(cv.analysis, cv.fileName);
    }
  } catch (error) {
    console.error('Erreur d\'indexation périodique:', error);
  }
});