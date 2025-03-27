const cvService = require('../services/CVService');

const cleanFileName = (fileName) => {
  return fileName
    .replace(/^\d+-/, '')
    .replace(/\.(pdf|doc|docx)$/i, '');
};

// Fonction utilitaire pour formater le résultat d'extraction
const formatExtractionResult = (extraction, fileName) => {
  if (!extraction) return null;
  
  return {
    fileName: fileName,
    name: cleanFileName(fileName),
    status: 'completed',
    summary: extraction.summary || "",
    phone_number: extraction.phone_number || "",
    email: extraction.email || "",
    skills: extraction.skills || [],
    tools: extraction.tools || [],
    tool_match_score: extraction.tool_match_score || 0,
    experience_years: extraction.experience_years || 0,
    education: extraction.education || [],
    languages: extraction.languages || [],
    experiences: extraction.experiences || [],
    matching_skills: extraction.matching_skills || [],
    matching_tools: extraction.matching_tools || [],
    projects: extraction.projects || []
  };
};

class CVController {

    async compareCV(req, res) {
      try {
        console.log('Début de la comparaison des CVs');
        const startTime = Date.now();
        
        // Récupération et normalisation des requirements
        let requirements = req.body.requirements ? JSON.parse(req.body.requirements) : {};
        
        // Normalisation des champs après la récupération
        if (requirements && typeof requirements === 'object') {
          requirements = {
            description: requirements.description || '',
            skills: Array.isArray(requirements.skills) 
              ? requirements.skills 
              : requirements.skills?.split(',').map(s => s.trim()) || [],
            tools: Array.isArray(requirements.tools)
              ? requirements.tools
              : requirements.tools?.split(',').map(t => t.trim()) || [],
            experience_years: Number(requirements.experience_years) || 0,
            education: Array.isArray(requirements.education) ? requirements.education : [],
            languages: Array.isArray(requirements.languages) ? requirements.languages : []
          };
        }
    
        console.log('Requirements normalisés:', requirements);
  
        const files = req.files;
        const errors = [];
          
        if (!files || files.length < 2) {
          return res.status(400).json({ 
            error: 'Au moins deux fichiers sont requis',
            message: 'Veuillez sélectionner au moins deux CVs à comparer'
          });
        }
        
        // Limite de 10 CV maximum
        if (files.length > 10) {
          console.warn(`Nombre de CV limité à 10 (${files.length} demandés)`);
          files = files.slice(0, 10);
        }
  
        console.log(`Traitement de ${files.length} fichiers`);
        
        // Étape 1: Extraction du texte des fichiers en parallèle
        const extractionPromises = files.map(async (file) => {
          try {
            console.log(`Début de l'extraction de ${file.originalname}`);
            const filePath = file.path;
            const text = await cvService.extractText(filePath);
            
            return {
              text,
              fileName: file.originalname,
              filePath
            };
          } catch (error) {
            console.error(`Erreur d'extraction pour ${file.originalname}:`, error);
            errors.push({
              file: file.originalname,
              error: `Erreur d'extraction: ${error.message}`
            });
            return null;
          }
        });
        
        const extractionResults = await Promise.all(extractionPromises);
        const validExtractions = extractionResults.filter(result => result !== null);
        
        if (validExtractions.length === 0) {
          return res.status(404).json({ 
            error: 'Aucun CV n\'a pu être extrait',
            message: 'Veuillez vérifier le format des fichiers',
            details: errors
          });
        }
        
        // Étape 2: Préparation des données pour la comparaison parallèle
        const cvDataList = validExtractions.map(extraction => ({
          text: extraction.text,
          fileName: extraction.fileName,
          filePath: extraction.filePath
        }));
        
        // Étape 3: Utilisation de la nouvelle méthode de comparaison parallèle
        // Cette méthode est maintenant capable de traiter jusqu'à 10 CV en parallèle
        const comparisonResults = await cvService.analyzeMultipleCVs(
          cvDataList.map(data => ({
            text: data.text,
            fileName: data.fileName,
            requirements: requirements
          }))
        );
        
        // Étape 4: Formatage et enrichissement des résultats
        const formattedResults = comparisonResults
          .map(result => {
            if (result.error) {
              errors.push({
                file: result.fileName,
                error: result.error
              });
              return null;
            }
            
            // Formater le résultat selon le format attendu
            const formattedResult = formatExtractionResult(result, result.fileName);
            
            // Calculer les scores manuels comme dans l'implémentation originale
            if (formattedResult) {
              const scores = cvService.calculateManualScore(formattedResult, requirements);
              
              // Assigner tous les scores pertinents au candidat
              Object.assign(formattedResult, {
                totalScore: scores.totalScore,
                skill_match_percent: scores.skillMatchPercent,
                tool_match_percent: scores.toolMatchPercent,
                tools_score: scores.toolsScore,
                description_match_score: scores.description_match_score,
                matching_skills: scores.matchingSkills,
                matching_tools: scores.matchingTools
              });
            }
            
            return formattedResult;
          })
          .filter(result => result !== null);
        
        // Étape 5: Nettoyage des fichiers temporaires
        for (const data of cvDataList) {
          if (data.filePath) {
            cvService.cleanupFile(data.filePath).catch(err => 
              console.error(`Erreur lors du nettoyage de ${data.filePath}:`, err)
            );
          }
        }
        
        // Étape 6: Tri des résultats par totalScore
        formattedResults.sort((a, b) => {
          const scoreA = a.totalScore ?? 0;
          const scoreB = b.totalScore ?? 0;
          return scoreB - scoreA;
        });
        
        const executionTime = Date.now() - startTime;
        console.log(`Comparaison terminée en ${executionTime}ms`);
        
        const response = {
          rankings: formattedResults,
          errors: errors.length > 0 ? errors : undefined,
          metadata: {
            total_files: files.length,
            successful_analyses: formattedResults.length,
            execution_time_ms: executionTime
          }
        };
    
        console.log('Comparaison terminée avec succès');
        res.json(response);
        
      } catch (error) {
        console.error('Erreur critique lors de la comparaison:', error);
        res.status(500).json({ 
          error: 'Erreur lors de la comparaison des CVs',
          details: error.message
        });
      }
    }
  
    async searchCV(req, res) {
      try {
        // 1. Extraire correctement les requirements du body
        let requirements = req.body.requirements || req.body;
        
        // 2. Normalisation habituelle
        if (requirements && typeof requirements === 'object') {
          requirements = {
            description: requirements.description || '',
            skills: Array.isArray(requirements.skills) ? requirements.skills : [],
            tools: Array.isArray(requirements.tools) ? requirements.tools : [],
            experience_years: Number(requirements.experience_years) || 0,
            education: Array.isArray(requirements.education) ? requirements.education : [],
            languages: Array.isArray(requirements.languages) ? requirements.languages : []
          };
        }
        
        console.log('Requirements reçus:', requirements);
    
        // 3. Recherche avec les requirements correctement extraits
        const searchResults = await cvService.searchCVs(requirements);
        
        if (!searchResults || !searchResults.rankings) {
          return res.status(404).json({ error: 'Aucun résultat trouvé' });
        }
        
        // 4. Harmonisation des propriétés pour qu'elles soient cohérentes
        const rankings = searchResults.rankings.map(cv => {
          // Calcul d'un totalScore par défaut quand il est null
          const totalScore = cv.totalScore !== null ? cv.totalScore : (cv.elasticsearch_score / 100);
          
          return {
            ...cv,
            // Conversion des propriétés camelCase en snake_case
            matching_skills: cv.matchingSkills || [],
            matching_tools: cv.matchingTools || [],
            // Harmonisation des valeurs de matching percent
            tool_match_percent: cv.toolMatchPercent || (cv.tool_match_score * 100) || 0,
            // Assurer que toutes les propriétés sont présentes
            skill_match_percent: cv.skill_match_percent || 0,
            description_match_score: cv.description_match_score || 0,
            totalScore: totalScore
          };
        });
    
        // Le tri et les logs restent inchangés
        rankings.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
        
        res.json({ rankings });
        console.log('Recherche terminée avec succès');
        
      } catch (error) {
        console.error('Erreur détaillée lors de la recherche:', error);
        res.status(500).json({ error: 'Erreur lors de la recherche des CVs' });
      }
    }

  /**
   * Nouvelle méthode pour comparer les CV via JSON
   * Cela permet aux clients frontend d'envoyer directement les textes des CV
   */
  async compareJsonCV(req, res) {
    try {
      console.log('Début de la comparaison des CVs via JSON');
      const startTime = Date.now();
      
      const { cvList, requirements } = req.body;
      
      // Validation
      if (!Array.isArray(cvList) || cvList.length === 0) {
        return res.status(400).json({
          error: 'Format invalide',
          message: 'cvList doit être un tableau non vide'
        });
      }
      
      if (cvList.length > 10) {
        return res.status(400).json({
          error: 'Trop de CV',
          message: 'La comparaison est limitée à 10 CV maximum'
        });
      }
      
      if (!requirements) {
        return res.status(400).json({
          error: 'Requirements manquants',
          message: 'Veuillez fournir des requirements pour la comparaison'
        });
      }
      
      // Normaliser les requirements comme dans compareCV
      const normalizedRequirements = {
        description: requirements.description || '',
        skills: Array.isArray(requirements.skills) 
          ? requirements.skills 
          : requirements.skills?.split(',').map(s => s.trim()) || [],
        tools: Array.isArray(requirements.tools)
          ? requirements.tools
          : requirements.tools?.split(',').map(t => t.trim()) || [],
        experience_years: Number(requirements.experience_years) || 0,
        education: Array.isArray(requirements.education) ? requirements.education : [],
        languages: Array.isArray(requirements.languages) ? requirements.languages : []
      };
      
      // Préparer les données pour l'analyse
      const cvDataList = cvList.map((cv, index) => ({
        text: cv.text || cv.content,
        fileName: cv.fileName || cv.name || `CV_${index + 1}`,
        requirements: normalizedRequirements
      }));
      
      // Utiliser notre méthode de traitement parallèle
      const analysisResults = await cvService.analyzeMultipleCVs(cvDataList);
      
      // Traiter les résultats comme dans compareCV
      const formattedResults = analysisResults
        .map(result => {
          if (result.error) {
            return null;
          }
          
          const formattedResult = formatExtractionResult(result, result.fileName);
          
          if (formattedResult) {
            const scores = cvService.calculateManualScore(formattedResult, normalizedRequirements);
            
            Object.assign(formattedResult, {
              totalScore: scores.totalScore,
              skill_match_percent: scores.skillMatchPercent,
              tool_match_percent: scores.toolMatchPercent,
              tools_score: scores.toolsScore,
              description_match_score: scores.description_match_score,
              matching_skills: scores.matchingSkills,
              matching_tools: scores.matchingTools
            });
          }
          
          return formattedResult;
        })
        .filter(result => result !== null);
      
      // Tri des résultats
      formattedResults.sort((a, b) => {
        const scoreA = a.totalScore ?? 0;
        const scoreB = b.totalScore ?? 0;
        return scoreB - scoreA;
      });
      
      const executionTime = Date.now() - startTime;
      console.log(`Comparaison JSON terminée en ${executionTime}ms`);
      
      const response = {
        rankings: formattedResults,
        metadata: {
          total: cvList.length,
          successful: formattedResults.length,
          execution_time_ms: executionTime
        }
      };
      
      res.json(response);
      
    } catch (error) {
      console.error('Erreur critique lors de la comparaison JSON:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la comparaison des CVs',
        details: error.message
      });
    }
  }
  
  async getStatus(req, res) {
    const { jobId } = req.params;
    try {
      const job = await cvAnalysisQueue.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ 
          error: 'Job non trouvé',
          message: 'L\'identifiant du job n\'existe pas ou a expiré'
        });
      }

      const state = await job.getState();
      const progress = await job.progress();
      
      res.json({ 
        jobId, 
        state,
        progress: progress || 0,
        created_at: job.timestamp
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du status:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération du status',
        details: error.message
      });
    }
  }
  
  /**
   * Vide le cache du service CV
   */
  clearCache(req, res) {
    try {
      const result = cvService.clearCache();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors du vidage du cache',
        message: error.message
      });
    }
  }
}

module.exports = new CVController();