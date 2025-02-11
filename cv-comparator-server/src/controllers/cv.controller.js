const cvService = require('../services/cv.service');

const cleanFileName = (fileName) => {
  return fileName
    .replace(/^\d+-/, '')
    .replace(/\.(pdf|doc|docx)$/i, '');
};

// Fonction utilitaire pour formater le résultat d'analyse
const formatAnalysisResult = (analysis, fileName) => {
  if (!analysis) return null;
  
  return {
    candidate_id: fileName,
    name: cleanFileName(fileName),
    status: 'completed',
    // Champs optionnels avec valeurs par défaut
    skills: analysis.skills || [],
    tools: analysis.tools || [],
    experience_years: analysis.experience_years || 0,
    education: analysis.education || [],
    languages: analysis.languages || [],
    experiences: analysis.experiences || [],
    // Scores avec valeurs par défaut
    similarity_score: analysis.analysis?.similarity_score || 0,
    similarity_to_job: analysis.analysis?.similarity_to_job || 0,
    description_match: {
      score: analysis.analysis?.similarity_to_job || 0,
      relevant_experiences: analysis.analysis?.strengths || [],
      keyword_matches: analysis.analysis?.matching_skills || []
    },
    skill_match_percent: analysis.analysis?.skill_match_percent || 0,
    matching_skills: analysis.analysis?.matching_skills || [],
    matching_tools: analysis.analysis?.matching_tools || [],
    experience_match: analysis.analysis?.detailed_scores?.experience || 0,
    education_match: analysis.analysis?.detailed_scores?.education || 0,
    language_match: analysis.analysis?.detailed_scores?.languages || 0,
    detailed_scores: analysis.analysis?.detailed_scores || {
      skills: 0,
      tools: 0,
      experience: 0,
      education: 0,
      languages: 0
    }
  };
};

// Fonction utilitaire pour générer l'analyse AI
const generateAIAnalysis = (results, requirements) => {
  if (!results || results.length === 0) {
    return {
      summary: {
        top_candidate: "Aucun candidat trouvé",
        comparative_analysis: "Aucun CV analysé",
        description_analysis: "Analyse impossible",
        hiring_recommendations: []
      }
    };
  }

  const topCandidate = results[0];
  const runnerUp = results[1];
  
  return {
    summary: {
      top_candidate: topCandidate.name,
      comparative_analysis: `${results.length} CVs analysés. ${
        topCandidate.similarity_score 
          ? `Meilleur score: ${(topCandidate.similarity_score * 100).toFixed(1)}%` 
          : ''
      }`,
      description_analysis: requirements?.description 
        ? `Analyse basée sur une description de poste de ${requirements.description.length} caractères`
        : "Aucune description de poste fournie",
      hiring_recommendations: [
        topCandidate.matching_skills?.length 
          ? `Le candidat ${topCandidate.name} se démarque avec ${topCandidate.matching_skills.length} compétences correspondantes`
          : null,
        ...(topCandidate.description_match?.relevant_experiences || []),
        runnerUp && topCandidate.similarity_score && runnerUp.similarity_score
          ? `Suivi par ${runnerUp.name} avec une différence de ${
              ((topCandidate.similarity_score - runnerUp.similarity_score) * 100).toFixed(1)
            }%`
          : null
      ].filter(Boolean)
    }
  };
};

class CVController {
  async compareCV(req, res) {
    try {
      console.log('Début de la comparaison des CVs');
      
      const requirements = req.body.requirements ? JSON.parse(req.body.requirements) : {};
      const files = req.files;
      const errors = [];
      
      if (!files || files.length < 2) {
        return res.status(400).json({ 
          error: 'Au moins deux fichiers sont requis',
          message: 'Veuillez sélectionner au moins deux CVs à comparer'
        });
      }

      console.log(`Traitement de ${files.length} fichiers`);
      
      const analysisPromises = files.map(async (file) => {
        try {
          console.log(`Début du traitement de ${file.originalname}`);
          
          const filePath = file.path;
          const text = await cvService.extractText(filePath);
          const analysis = await cvService.analyzeWithGPT(text, requirements.description || '');
          
          // Nettoyage asynchrone du fichier
          cvService.cleanupFile(filePath).catch(err => 
            console.error(`Erreur lors du nettoyage de ${filePath}:`, err)
          );

          return formatAnalysisResult(analysis, file.originalname);
        } catch (error) {
          console.error(`Erreur détaillée pour ${file.originalname}:`, error);
          errors.push({
            file: file.originalname,
            error: error.message
          });
          // On retourne un résultat partiel si possible
          return error.partialResult 
            ? formatAnalysisResult(error.partialResult, file.originalname)
            : null;
        }
      });

      const analysisResults = await Promise.all(analysisPromises);
      const results = analysisResults.filter(result => result !== null);
  
      if (results.length === 0) {
        return res.status(404).json({ 
          error: 'Aucun CV n\'a pu être analysé',
          message: 'Veuillez vérifier le format des fichiers',
          details: errors
        });
      }

      // Tri des résultats avec gestion des valeurs manquantes
      results.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
      
      const response = {
        rankings: results,
        errors: errors.length > 0 ? errors : undefined,
        ai_analysis: generateAIAnalysis(results, requirements)
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
      console.log('Début de la recherche avec les critères:', req.body.requirements);
      const requirements = req.body.requirements || {};
  
      const results = await cvService.searchCVs(requirements);
      
      // On accepte les résultats même s'ils sont vides
      const formattedResults = (results || [])
        .map(result => formatAnalysisResult(result, result.fileName))
        .filter(result => result !== null);
  
      const response = {
        rankings: formattedResults,
        ai_analysis: generateAIAnalysis(formattedResults, requirements)
      };
  
      console.log('Recherche terminée avec succès');
      res.json(response);
      
    } catch (error) {
      console.error('Erreur détaillée lors de la recherche:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la recherche des CVs',
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
}
module.exports = new CVController();