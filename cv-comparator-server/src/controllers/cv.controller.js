const cvService = require('../services/cv.service');

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
    summary:extraction.summary || "",
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
    projects: extraction.projects|| []
  };
};

class CVController {

    async compareCV(req, res) {
      try {
        console.log('Début de la comparaison des CVs');
        
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
  
        console.log(`Traitement de ${files.length} fichiers`);
        
        const analysisPromises = files.map(async (file) => {
          try {
            console.log(`Début du traitement de ${file.originalname}`);
            
            const filePath = file.path;
            const text = await cvService.extractText(filePath);
            
            // Analyser le CV avec GPT
            const extraction = await cvService.analyzeWithGPT(text, requirements, file.originalname);
            const candidateData = formatExtractionResult(extraction, file.originalname);
            
            // Calculer les scores en utilisant la fonction du service
            if (candidateData) {
              const scores = cvService.calculateManualScore(candidateData, requirements);
              
              // Assigner tous les scores pertinents au candidat
              Object.assign(candidateData, {
                totalScore: scores.totalScore,
                skill_match_percent: scores.skillMatchPercent,
                tool_match_percent: scores.toolMatchPercent,
                tools_score: scores.toolsScore,
                description_match_score: scores.description_match_score,
                matching_skills: scores.matchingSkills,
                matching_tools: scores.matchingTools
              });
            }
            
            // Nettoyage asynchrone du fichier
            cvService.cleanupFile(filePath).catch(err => 
              console.error(`Erreur lors du nettoyage de ${filePath}:`, err)
            );
  
            return candidateData;
            
          } catch (error) {
            console.error(`Erreur détaillée pour ${file.originalname}:`, error);
            errors.push({
              file: file.originalname,
              error: error.message
            });
            return null;
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
  
        // Tri des résultats par totalScore
        results.sort((a, b) => {
          const scoreA = a.totalScore ?? 0;
          const scoreB = b.totalScore ?? 0;
          return scoreB - scoreA;
        });
        
        const response = {
          rankings: results,
          errors: errors.length > 0 ? errors : undefined
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
    // Récupération et normalisation des requirements
    let requirements = req.body.requirements;
    
    // Normalisation des champs
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

    const { rankings: initialRankings } = await cvService.searchCVs(requirements);
    
    // Recalculer les scores manuels pour chaque CV
    const rankings = initialRankings.map(cv => {
      const scores = cvService.calculateManualScore(cv, requirements);
      return {
        ...cv,
        totalScore: scores.totalScore,
        skill_match_percent: scores.skillMatchPercent,
        tool_match_percent: scores.toolMatchPercent,
        tools_score: scores.toolsScore,
        description_match_score: scores.description_match_score,
        matching_skills: scores.matchingSkills,
        matching_tools: scores.matchingTools
      };
    });

    // Tri par totalScore comme dans compareCV
    rankings.sort((a, b) => {
      const scoreA = a.totalScore ?? 0;
      const scoreB = b.totalScore ?? 0;
      return scoreB - scoreA;
    });
      
    console.log(`Nombre de résultats trouvés: ${rankings?.length || 0}`);
      
    // Log des scores pertinents avec totalScore
    const scores = rankings.map(r => ({
      name: r.fileName,
      totalScore: r.totalScore,
      skill_match_percent: r.skill_match_percent,
      description_match_score: r.description_match_score,
      elasticsearch_score: r.elasticsearch_score
    }));
    console.log('Scores des résultats:', scores);

    res.json({ rankings });
      
    console.log('Recherche terminée avec succès');
      
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