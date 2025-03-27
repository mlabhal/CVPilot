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
    this.maxConcurrentAnalyses = 10; // Augmenté de 3 à 10 pour permettre le traitement parallèle
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
  _enqueueAnalysis(task, priority = 0) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        execute: task,
        resolve,
        reject,
        priority
      };
      
      // Insérer selon la priorité
      if (priority > 0) {
        let inserted = false;
        for (let i = 0; i < this.analysisQueue.length; i++) {
          if ((this.analysisQueue[i].priority || 0) < priority) {
            this.analysisQueue.splice(i, 0, queueItem);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          this.analysisQueue.push(queueItem);
        }
      } else {
        // Ajouter à la fin si priorité standard
        this.analysisQueue.push(queueItem);
      }
      
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

  /**
   * Analyse et compare plusieurs CV en parallèle
   * @param {Array} cvDataList Liste des objets {text, requirements, fileName} pour chaque CV
   * @returns {Promise<Array>} Résultats d'analyse pour tous les CV
   */
  // Voici les modifications à apporter au service CVService pour résoudre les problèmes de performance

/**
 * Version optimisée de analyzeMultipleCVs
 * Cette version utilise une approche par lots pour éviter de surcharger l'API Claude
 */
async analyzeMultipleCVs(cvDataList) {
  console.log(`[ANALYSE] Début analyse de ${cvDataList.length} CVs`);
  const startTime = Date.now();
  
  // 1. Vérification du cache pour tous les CVs en une seule passe
  const cachedResults = [];
  const uncachedCVs = [];
  
  for (const cvData of cvDataList) {
    const cacheKey = this._generateCacheKey(cvData.text + JSON.stringify(cvData.requirements || {}));
    const cachedAnalysis = this._getCacheItem(cacheKey);
    
    if (cachedAnalysis) {
      console.log(`[ANALYSE] CV trouvé en cache: ${cvData.fileName}`);
      cachedResults.push({
        ...cachedAnalysis,
        fileName: cvData.fileName
      });
    } else {
      uncachedCVs.push(cvData);
    }
  }
  
  // 2. Si tous les CVs sont en cache, retourner immédiatement
  if (uncachedCVs.length === 0) {
    console.log('[ANALYSE] Tous les CVs trouvés en cache');
    return cachedResults;
  }
  
  // 3. Définir le traitement par lots pour éviter de surcharger Claude
  const BATCH_SIZE = 3; // Traiter 3 CV à la fois maximum
  const allResults = [...cachedResults]; // Commencer avec les résultats du cache
  
  // 4. Traiter les CV restants par lots
  for (let i = 0; i < uncachedCVs.length; i += BATCH_SIZE) {
    const batch = uncachedCVs.slice(i, i + BATCH_SIZE);
    console.log(`[ANALYSE] Traitement du lot ${i / BATCH_SIZE + 1}/${Math.ceil(uncachedCVs.length / BATCH_SIZE)}`);
    
    // 5. Créer un tableau de promesses pour ce lot uniquement
    const batchPromises = batch.map(cvData => 
      this._processCV(cvData.text, cvData.requirements || {}, cvData.fileName)
    );
    
    // 6. Attendre que le lot complet soit terminé avant de passer au suivant
    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults);
    
    // 7. Petite pause entre les lots pour éviter de surcharger l'API (optionnel)
    if (i + BATCH_SIZE < uncachedCVs.length) {
      console.log('[ANALYSE] Pause entre les lots...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const endTime = Date.now();
  console.log(`[ANALYSE] Analyse terminée en ${(endTime - startTime) / 1000}s`);
  
  return allResults;
}

/**
 * Méthode d'aide pour traiter un CV individuel
 * Cette méthode combine les étapes d'analyse et de post-traitement
 */
async _processCV(cvText, requirements, fileName) {
  try {
    // 1. Vérifier le cache une dernière fois
    const cacheKey = this._generateCacheKey(cvText + JSON.stringify(requirements));
    const cachedAnalysis = this._getCacheItem(cacheKey);
    
    if (cachedAnalysis) {
      return {
        ...cachedAnalysis,
        fileName: fileName
      };
    }
    
    // 2. Prétraiter si nécessaire
    const preprocessedText = cvText.includes('PREPROCESSED:') 
      ? cvText 
      : textPreprocessing.preprocessCV(cvText);
    
    // 3. Analyser le CV directement sans passer par la file d'attente
    console.log(`[ANALYSE] Analyse directe pour ${fileName}`);
    const analysis = await cvAnalysis.analyzeCV(preprocessedText, requirements);
    
    if (!analysis) {
      throw new Error("L'analyse n'a pas produit de résultat valide");
    }
    
    // 4. Indexation dans Elasticsearch
    let indexSuccess = false;
    try {
      indexSuccess = await elasticsearch.indexCV(analysis, fileName);
    } catch (indexError) {
      console.warn(`[ANALYSE] Erreur d'indexation pour ${fileName}:`, indexError.message);
    }
    
    // 5. Notification au candidat (rendue non bloquante)
    notification.sendNotificationIfContactFound(analysis).catch(notifError => {
      console.warn(`[ANALYSE] Erreur de notification:`, notifError.message);
    });
    
    // 6. Préparer le résultat final
    const finalResult = {
      ...analysis,
      indexed: indexSuccess,
      indexFileName: indexSuccess ? fileName : null,
      fileName: fileName
    };
    
    // 7. Mettre en cache
    this._setCacheItem(cacheKey, finalResult);
    
    return finalResult;
  } catch (error) {
    console.error(`[ANALYSE] Erreur pour ${fileName}:`, error);
    return {
      error: error.message,
      fileName: fileName,
      summary: `Erreur lors de l'analyse: ${error.message}`,
      skills: [],
      tools: [],
      experience_years: 0,
      education: [],
      languages: [],
      experiences: []
    };
  }
}

  /**
   * Extrait les requirements communs à tous les CV si possible
   */
  _extractCommonRequirements(cvDataList) {
    // Si tous les CV ont les mêmes requirements, on les utilise
    if (cvDataList.length > 0 && cvDataList.every(cv => cv.requirements)) {
      const firstReq = JSON.stringify(cvDataList[0].requirements);
      const allSame = cvDataList.every(cv => JSON.stringify(cv.requirements) === firstReq);
      
      if (allSame) {
        return cvDataList[0].requirements;
      }
    }
    
    // Sinon, on cherche un objet requirements qui serait fourni séparément
    const hasCommonReq = cvDataList.some(cv => cv.commonRequirements);
    if (hasCommonReq) {
      return cvDataList.find(cv => cv.commonRequirements).commonRequirements;
    }
    
    // Si pas de requirements communs, retourner un objet vide
    return {};
  }
  
  /**
   * Traitement post-analyse: indexation et notification
   */
  async _postProcessAnalysis(analysis, fileName) {
    if (!analysis) {
      throw new Error("L'analyse n'a pas produit de résultat valide");
    }
    
    // Générer un nom de fichier unique si non fourni
    if (!fileName) {
      fileName = `cv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    
    // Indexation dans Elasticsearch
    const indexSuccess = await elasticsearch.indexCV(analysis, fileName);
    
    // Notification au candidat (optionnelle lors d'une comparaison)
    try {
      await notification.sendNotificationIfContactFound(analysis);
    } catch (error) {
      console.warn(`[ANALYSE] Erreur lors de la notification: ${error.message}`);
    }

    // Préparation du résultat final
    return {
      ...analysis,
      indexed: indexSuccess,
      indexFileName: indexSuccess ? fileName : null,
      fileName: fileName
    };
  }
  
  /**
   * Ajoute des scores de comparaison aux résultats d'analyse
   */
  _addComparisonScores(analysisResults, requirements) {
    // Si pas de requirements, retourner les résultats tels quels
    if (!requirements || Object.keys(requirements).length === 0) {
      return analysisResults;
    }
    
    return analysisResults.map(result => {
      // Ignorer les résultats avec erreur
      if (result.error) {
        return result;
      }
      
      // Calculer les scores de matching si pas déjà présents
      if (!result.matching_skills && requirements.skills?.length) {
        result.matching_skills = cvAnalysis.findMatches(
          result.skills || [],
          requirements.skills || []
        );
      }
      
      if (!result.matching_tools && requirements.tools?.length) {
        result.matching_tools = cvAnalysis.findMatches(
          result.tools || [],
          requirements.tools || []
        );
      }
      
      // Calculer les scores
      const skillsScore = requirements.skills?.length ? 
        (result.matching_skills?.length || 0) / requirements.skills.length : 1;
      
      const toolsScore = requirements.tools?.length ? 
        (result.matching_tools?.length || 0) / requirements.tools.length : 1;
      
      // Score d'expérience
      const experienceScore = requirements.experience_years ?
        Math.min((result.experience_years || 0) / requirements.experience_years, 1) : 1;
      
      // Pondération des scores
      const WEIGHTS = {
        skills: 0.4,
        tools: 0.4,
        experience: 0.2
      };
      
      // Score global
      const globalScore = (
        skillsScore * WEIGHTS.skills +
        toolsScore * WEIGHTS.tools +
        experienceScore * WEIGHTS.experience
      );
      
      // Ajouter les informations de comparaison
      return {
        ...result,
        comparison: {
          global_score: parseFloat(globalScore.toFixed(2)),
          skills_score: parseFloat(skillsScore.toFixed(2)),
          tools_score: parseFloat(toolsScore.toFixed(2)),
          experience_score: parseFloat(experienceScore.toFixed(2)),
          missing_skills: requirements.skills?.filter(
            skill => !(result.matching_skills || []).includes(skill)
          ) || [],
          missing_tools: requirements.tools?.filter(
            tool => !(result.matching_tools || []).includes(tool)
          ) || []
        }
      };
    });
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
  
  /**
   * Compare plusieurs CV par rapport à des requirements communs
   * @param {Array} cvDataList Liste des objets CV à comparer
   * @param {Object} requirements Requirements communs pour la comparaison
   * @returns {Promise<Object>} Résultats classés par score
   */
  async compareCVs(cvDataList, requirements) {
    // Limiter à 10 CV maximum
    const MAX_CVS = 10;
    if (cvDataList.length > MAX_CVS) {
      console.warn(`[COMPARAISON] Nombre de CV limité à ${MAX_CVS} (${cvDataList.length} demandés)`);
      cvDataList = cvDataList.slice(0, MAX_CVS);
    }
  
    console.log(`[COMPARAISON] Début de la comparaison de ${cvDataList.length} CV`);
    const startTime = Date.now();
    
    // 1. Analyser tous les CV en utilisant l'approche par lots
    const analysisResults = await this.analyzeMultipleCVs(
      cvDataList.map(cv => ({
        text: cv.text,
        fileName: cv.fileName,
        requirements: requirements
      }))
    );
    
    // 2. Calculer les scores de comparaison
    const resultsWithScores = analysisResults.map(result => {
      if (result.error) return result;
      
      // Calculer les scores manuellement si pas déjà présents
      if (!result.comparison || !result.comparison.global_score) {
        // Ajouter les scores de matching si pas déjà présents
        if (!result.matching_skills && requirements.skills?.length) {
          result.matching_skills = cvAnalysis.findMatches(
            result.skills || [],
            requirements.skills || []
          );
        }
        
        if (!result.matching_tools && requirements.tools?.length) {
          result.matching_tools = cvAnalysis.findMatches(
            result.tools || [],
            requirements.tools || []
          );
        }
        
        // Calculer les scores
        const skillsScore = requirements.skills?.length ? 
          (result.matching_skills?.length || 0) / requirements.skills.length : 1;
        
        const toolsScore = requirements.tools?.length ? 
          (result.matching_tools?.length || 0) / requirements.tools.length : 1;
        
        // Score d'expérience
        const experienceScore = requirements.experience_years ?
          Math.min((result.experience_years || 0) / requirements.experience_years, 1) : 1;
        
        // Pondération des scores
        const WEIGHTS = {
          skills: 0.4,
          tools: 0.4,
          experience: 0.2
        };
        
        // Score global
        const globalScore = (
          skillsScore * WEIGHTS.skills +
          toolsScore * WEIGHTS.tools +
          experienceScore * WEIGHTS.experience
        );
        
        result.comparison = {
          global_score: parseFloat(globalScore.toFixed(2)),
          skills_score: parseFloat(skillsScore.toFixed(2)),
          tools_score: parseFloat(toolsScore.toFixed(2)),
          experience_score: parseFloat(experienceScore.toFixed(2)),
          missing_skills: requirements.skills?.filter(
            skill => !(result.matching_skills || []).includes(skill)
          ) || [],
          missing_tools: requirements.tools?.filter(
            tool => !(result.matching_tools || []).includes(tool)
          ) || []
        };
      }
      
      return result;
    });
    
    // 3. Trier les résultats (les erreurs à la fin)
    const sortedResults = [...resultsWithScores].sort((a, b) => {
      if (a.error) return 1;
      if (b.error) return -1;
      return (b.comparison?.global_score || 0) - (a.comparison?.global_score || 0);
    });
    
    const endTime = Date.now();
    console.log(`[COMPARAISON] Comparaison terminée en ${(endTime - startTime) / 1000}s`);
    
    return {
      results: sortedResults,
      metadata: {
        total: cvDataList.length,
        successful: sortedResults.filter(r => !r.error).length,
        execution_time_ms: endTime - startTime,
        requirements: requirements
      }
    };
  }
  
  // Méthode utilitaire pour vider le cache
  clearCache() {
    this.cache = {};
    return { success: true, message: 'Cache vidé avec succès' };
  }
}

module.exports = new CVService();