const fileExtraction = require('./file.extraction.service');
const textPreprocessing = require('./text.preprocessing.service');
const cvAnalysis = require('./cv.analysis.service');
const elasticsearch = require('./elasticsearch.service');
const notification = require('./notification.service');
const crypto = require('crypto');

class CVService {
  constructor() {
    // Cache simple implémenté nativement
    this.cache = {};
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
    
    // File d'attente pour limiter les analyses concurrentes
    this.analysisQueue = [];
    this.runningAnalyses = 0;
    this.maxConcurrentAnalyses = 3;
    this.processingQueue = false;
  }

  /**
   * Gère la file d'attente des analyses
   */
  _processAnalysisQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;
    
    const checkQueue = () => {
      if (this.analysisQueue.length === 0 || this.runningAnalyses >= this.maxConcurrentAnalyses) {
        this.processingQueue = false;
        return;
      }
      
      const nextTask = this.analysisQueue.shift();
      this.runningAnalyses++;
      
      nextTask.execute()
        .then(result => {
          this.runningAnalyses--;
          nextTask.resolve(result);
          setImmediate(checkQueue);
        })
        .catch(error => {
          this.runningAnalyses--;
          nextTask.reject(error);
          setImmediate(checkQueue);
        });
    };
    
    checkQueue();
  }

  /**
   * Ajoute une tâche à la file d'attente et renvoie une promesse
   */
  _enqueueAnalysis(task) {
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({
        execute: task,
        resolve,
        reject
      });
      
      this._processAnalysisQueue();
    });
  }

  /**
   * Génère une clé de cache
   */
  _generateCacheKey(data) {
    return crypto
      .createHash('md5')
      .update(typeof data === 'string' ? data : JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Obtient une valeur du cache
   */
  _getCacheItem(key) {
    const item = this.cache[key];
    if (!item) return null;
    
    // Vérifier si l'élément a expiré
    if (Date.now() > item.expires) {
      delete this.cache[key];
      return null;
    }
    
    return item.value;
  }

  /**
   * Ajoute une valeur au cache
   */
  _setCacheItem(key, value, ttl = this.cacheTTL) {
    this.cache[key] = {
      value,
      expires: Date.now() + ttl
    };
  }

  async extractText(filePath) {
    // Vérifier le cache
    const cacheKey = `extract_${filePath}`;
    const cachedText = this._getCacheItem(cacheKey);
    
    if (cachedText) {
      return cachedText;
    }
    
    const text = await fileExtraction.extractText(filePath);
    const preprocessedText = textPreprocessing.preprocessCV(text);
    
    // Mettre en cache
    this._setCacheItem(cacheKey, preprocessedText);
    
    return preprocessedText;
  }

  async analyzeCV(cvText, requirements = {}, fileName = '') {
    try {
      // Vérifier le cache
      const cacheKey = this._generateCacheKey(cvText + JSON.stringify(requirements));
      const cachedAnalysis = this._getCacheItem(cacheKey);
      
      if (cachedAnalysis) {
        console.log('[ANALYSE] Résultat trouvé en cache pour', fileName || 'CV sans nom');
        return cachedAnalysis;
      }
      
      console.log('[ANALYSE] Début de l\'analyse pour', fileName || 'CV sans nom');
      
      // Prétraitement si nécessaire
      const preprocessedText = cvText.includes('PREPROCESSED:') 
        ? cvText 
        : textPreprocessing.preprocessCV(cvText);
      
      // Analyse avec Claude via la file d'attente
      const analysis = await this._enqueueAnalysis(() => 
        cvAnalysis.analyzeCV(preprocessedText, requirements)
      );

      if (!analysis) {
        throw new Error("L'analyse n'a pas produit de résultat valide");
      }
      
      // Générer un nom de fichier unique si non fourni
      if (!fileName) {
        fileName = `cv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
      
      // Indexation dans Elasticsearch
      const indexSuccess = await elasticsearch.indexCV(analysis, fileName);
      
      // Notification au candidat
      await notification.sendNotificationIfContactFound(analysis);

      // Préparation du résultat final
      const finalResult = {
        ...analysis,
        indexed: indexSuccess,
        indexFileName: indexSuccess ? fileName : null
      };
      
      // Mettre en cache
      this._setCacheItem(cacheKey, finalResult);
      
      return finalResult;
    } catch (error) {
      console.error('[ANALYSE] Erreur pendant l\'analyse:', error);
      
      // Retourner un résultat par défaut en cas d'erreur
      return {
        summary: `Erreur lors de l'analyse: ${error.message}`,
        skills: [],
        tools: [],
        experience_years: 0,
        education: [],
        languages: [],
        experiences: [],
        error: error.message
      };
    }
  }

  async analyzeMultipleCVs(cvDataList) {
    // Traitement séquentiel pour éviter de surcharger Claude
    const results = [];
    for (const cvData of cvDataList) {
      try {
        const result = await this.analyzeCV(cvData.text, cvData.requirements, cvData.fileName);
        results.push(result);
      } catch (error) {
        console.error(`Erreur lors de l'analyse du CV ${cvData.fileName}:`, error);
        results.push({
          error: error.message,
          fileName: cvData.fileName
        });
      }
    }
    return results;
  }

  async bulkIndexCVs(analysisResults) {
    return elasticsearch.bulkIndexCVs(analysisResults);
  }

  async searchCVs(requirements) {
    // Mise en cache des résultats de recherche
    const cacheKey = `search_${this._generateCacheKey(requirements)}`;
    const cachedResults = this._getCacheItem(cacheKey);
    
    if (cachedResults) {
      return cachedResults;
    }
    
    const results = await elasticsearch.searchCVs(requirements);
    
    // Cache de courte durée pour les recherches (1 heure)
    this._setCacheItem(cacheKey, results, 3600 * 1000);
    
    return results;
  }

  calculateManualScore(cvData, requirements) {
    return elasticsearch.calculateManualScore(cvData, requirements);
  }

  async cleanupFile(filePath) {
    // Invalider le cache de ce fichier
    const cacheKey = `extract_${filePath}`;
    delete this.cache[cacheKey];
    
    return fileExtraction.cleanupFile(filePath);
  }
  
  // Méthode utilitaire pour vider le cache
  clearCache() {
    this.cache = {};
    return { success: true, message: 'Cache vidé avec succès' };
  }
}

module.exports = new CVService();