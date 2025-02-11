// workers/cv.worker.js
const cvAnalysisQueue = require('../config/queue');
const CVCache = require('../models/CVCache');
const cvService = require('../services/cv.service');

cvAnalysisQueue.process(async (job) => {
  const { filePath, fileName, lastModified } = job.data;

  try {
    // Extraire et analyser le texte
    const text = await cvService.extractText(filePath);
    const analysis = await cvService.analyzeCV(text);

    // Sauvegarder dans le cache
    await CVCache.create({
      fileName,
      lastModified,
      extractedText: text,
      analysis
    });

    // Indexer dans Elasticsearch
    await cvService.indexCV(analysis, fileName);

    return analysis;
  } catch (error) {
    console.error('Erreur dans le worker:', error);
    throw error;
  }
});