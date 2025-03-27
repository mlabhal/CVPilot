const { client } = require('../../config/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.indexName = 'cvs';
  }

  async indexCV(analysis, fileName) {
    try {
      console.log('[INDEXATION] Début indexation pour fichier:', fileName);
      
      // Vérification des paramètres
      if (!fileName) {
        throw new Error('Nom de fichier manquant pour l\'indexation');
      }
      
      if (!analysis) {
        console.warn('[INDEXATION] Aucune analyse fournie, utilisation des valeurs par défaut');
        analysis = {};
      }
      
      // Préparation des données
      const indexData = this.prepareDataForIndexing(analysis, fileName);
      
      // Vérification de l'existence de l'index
      await this.ensureIndexExists();
      
      // Indexation avec retry
      let retries = 3;
      let response;
      
      while (retries > 0) {
        try {
          response = await client.index({
            index: this.indexName,
            id: fileName,
            body: indexData,
            refresh: true
          });
          break;
        } catch (retryError) {
          retries--;
          if (retries === 0) throw retryError;
          console.warn(`[INDEXATION] Tentative échouée, reste ${retries} essais`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('[INDEXATION] Réponse complète ES:', response);
      
      // Vérification de l'indexation
      const indexed = await client.get({
        index: this.indexName,
        id: fileName
      });
      
      console.log('[INDEXATION] Vérification document indexé:', indexed._source);
      
      return true;
      
    } catch (error) {
      console.error('[INDEXATION] Erreur complète:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return false;
    }
  }

  prepareDataForIndexing(analysis, fileName) {
    return {
      fileName: fileName,
      phone_number: analysis.phone_number || '',
      email: analysis.email || '',
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      tools: Array.isArray(analysis.tools) ? analysis.tools : [],
      experience_years: Number(analysis.experience_years) || 0,
      education: Array.isArray(analysis.education) ? analysis.education : [],
      languages: Array.isArray(analysis.languages) ? analysis.languages : [],
      experiences: Array.isArray(analysis.experiences) 
        ? analysis.experiences.map(exp => ({
            title: exp.title || '',
            company: exp.company || '',
            description: exp.description || '',
            duration: exp.duration || '',
            duration_in_months: exp.duration_in_months || 0 
          }))
        : [],
      indexed_date: new Date().toISOString()
    };
  }

  async ensureIndexExists() {
    const indexExists = await client.indices.exists({
      index: this.indexName
    });
    
    if (!indexExists) {
      console.warn(`[INDEXATION] Index ${this.indexName} n'existe pas, création...`);
      await client.indices.create({
        index: this.indexName,
        body: {
          mappings: {
            properties: {
              fileName: { type: 'keyword' },
              phone_number: { type: 'keyword' },
              email: { type: 'keyword' },
              skills: { type: 'keyword' },
              tools: { type: 'keyword' },
              experience_years: { type: 'integer' },
              education: { type: 'keyword' },
              languages: { type: 'keyword' },
              experiences: {
                type: 'nested',
                properties: {
                  title: { type: 'text' },
                  company: { type: 'text' },
                  description: { type: 'text' },
                  duration: { type: 'text' },
                  duration_in_months: { type: 'integer' }
                }
              },
              indexed_date: { type: 'date' }
            }
          }
        }
      });
    }
  }

  async bulkIndexCVs(analysisResults) {
    const operations = analysisResults.flatMap(result => [
      { index: { _index: this.indexName, _id: result.indexFileName || Date.now() } },
      this.prepareDataForIndexing(result, result.indexFileName || Date.now().toString())
    ]);
    
    try {
      const response = await client.bulk({ body: operations });
      console.log(`[BULK] Indexation de ${analysisResults.length} CVs`);
      return response;
    } catch (error) {
      console.error('[BULK] Erreur lors de l\'indexation en masse:', error);
      throw error;
    }
  }

  async searchCVs(requirements) {
    try {
      console.log('Début recherche avec critères:', requirements);
  
      const should = [];
      const must = [];
  
      // Préparation des critères de recherche
      const preparedRequirements = {
        description: requirements.description || '',
        skills: requirements.skills || [],
        tools: requirements.tools || [],
        experience_years: requirements.experience_years || 0,
        education: requirements.education || [],
        languages: requirements.languages || []
      };
      
      // Construction de la requête Elasticsearch
      if (preparedRequirements.description) {
        const keywords = this.extractKeywordsFromDescription(preparedRequirements.description);
        console.log('[SEARCH] Mots-clés extraits de la description:', keywords);
        
        if (keywords.length > 0) {
          should.push(
            // Recherche dans les compétences
            {
              terms: {
                "skills": keywords,
                  boost: 3
                }
              },
            // Recherche dans les outils
            {
              terms: {
                "tools": keywords,
                  boost: 2.5
                }
            },
            // Recherche dans les expériences
            {
              nested: {
                path: "experiences",
                query: {
                  bool: {
                    should: [
                      // Dans les titres
                      {
                        match: {
                          "experiences.title": {
                            query: keywords.join(" "),
                            boost: 2,
                            operator: "or",
                            fuzziness: "AUTO"
                          }
                        }
                      },
                      // Dans les descriptions
                      {
                        match: {
                          "experiences.description": {
                            query: keywords.join(" "),
                            boost: 1.5,
                            operator: "or",
                            fuzziness: "AUTO"
                          }
                        }
                      }
                    ]
                  }
                },
                score_mode: "avg"
              }
            }
          );
        }
      }
  
      // Ajouter les autres critères de recherche
      this.addSkillsToQuery(should, preparedRequirements.skills);
      this.addToolsToQuery(should, preparedRequirements.tools);
      this.addExperienceToQuery(must, preparedRequirements.experience_years);
      this.addEducationToQuery(should, preparedRequirements.education);
      this.addLanguagesToQuery(should, preparedRequirements.languages);
  
      const searchQuery = {
        index: this.indexName,
        body: {
          query: {
            bool: {
              must,
              should,
              minimum_should_match: 1
            }
          },
          size: 1000
        }
      };
  
      const response = await client.search(searchQuery);
      
      // Traitement des résultats
      const results = this.processSearchResults(response, preparedRequirements);
  
      // Tri par score de similarité décroissant
      results.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
      // Limitation à 5 résultats
      const limitedResults = results.slice(0, 5);

      console.log(`[SEARCH] Retour de ${limitedResults.length} CVs sur ${results.length} trouvés`);

      return { 
        rankings: limitedResults,
        total_found: results.length
      };
  
    } catch (error) {
      console.error('[SEARCH] Erreur:', error);
      throw error;
    }
  }

  extractKeywordsFromDescription(description) {
    const normalizeWord = (word) => {
      return word
        .toLowerCase()
        // Remplacer les caractères accentués
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Garder uniquement les lettres, chiffres et espaces
        .replace(/[^a-z0-9\s]/g, ' ')
        .trim();
    };
    
    return [...new Set(  // Utilisation de Set pour dédupliquer
      description
        .toLowerCase()
        .split(/\s+/)
        .map(word => normalizeWord(word))
        .filter(word => word.length > 2 && word !== '')
        .filter(word => !['les', 'des', 'une', 'avec', 'pour', 'dans', 'tout', 'etc', 'leur'].includes(word))
    )];
  }

  addSkillsToQuery(should, skills) {
    if (skills && skills.length) {
      skills.forEach(skill => {
        should.push({
          match: {
            "skills": {
              query: skill,
              fuzziness: "AUTO",
              operator: "or",
              boost: 3
            }
          }
        });
      });
    }
  }

  addToolsToQuery(should, tools) {
    if (tools && tools.length) {
      tools.forEach(tool => {
        should.push({
          match: {
            "tools": {
              query: tool,
              fuzziness: "AUTO",
              operator: "or",
              boost: 2
            }
          }
        });
      });
    }
  }

  addExperienceToQuery(must, experienceYears) {
    if (experienceYears) {
      must.push({
        range: {
          experience_years: {
            gte: experienceYears * 0.8
          }
        }
      });
    }
  }

  addEducationToQuery(should, education) {
    if (education && education.length) {
      education.forEach(edu => {
        should.push({
          match: {
            "education": {
              query: edu,
              fuzziness: "AUTO",
              boost: 1.5
            }
          }
        });
      });
    }
  }

  addLanguagesToQuery(should, languages) {
    if (languages && languages.length) {
      languages.forEach(lang => {
        should.push({
          match: {
            "languages": {
              query: lang,
              fuzziness: "AUTO",
              boost: 1
            }
          }
        });
      });
    }
  }

  processSearchResults(response, requirements) {
    // Trouver le score max pour la normalisation
    const maxScore = Math.max(...response.hits.hits.map(hit => hit._score || 0));
    
    return response.hits.hits.map(hit => {
      const cvData = hit._source;
      const scores = this.calculateManualScore(cvData, requirements);
      
      // Normalisation du score elasticsearch en pourcentage
      const normalizedElasticsearchScore = maxScore > 0 
        ? ((hit._score || 0) / maxScore) * 100 
        : 0;
      
      return {
        ...cvData,
        fileName: hit._id,
        totalScore: scores.totalScore,
        skill_match_percent: scores.skillMatchPercent,
        tool_match_score: scores.toolsScore,
        description_match_score: scores.description_match_score,
        elasticsearch_score: Math.round(normalizedElasticsearchScore),
        // Ajouter ces deux propriétés manquantes:
        matchingSkills: scores.matchingSkills || [],
        matchingTools: scores.matchingTools || [],
        // Ajouter aussi pour la cohérence:
        toolMatchPercent: scores.toolMatchPercent || 0
      };
    });
  }

  calculateManualScore(cvData, requirements) {
    // Initialisation des poids pour chaque critère
    const baseWeights = {
      description: 0.25,
      skills: 0.25,
      tools: 0.20,
      experience: 0.15,
      education: 0.10,
      languages: 0.05
    };
  
    // Création d'un objet pour stocker les scores et les poids valides
    let scores = {};
    let validWeights = {};
    let totalWeight = 0;
  
    const cvAnalysisService = require('./cv.analysis.service');
  
    // Vérification et calcul pour la description
    if (requirements.description && requirements.description.trim() !== '') {
      scores.description = this.calculateDescriptionMatchScore(
        cvData,
        requirements.description
      );
      validWeights.description = baseWeights.description;
      totalWeight += baseWeights.description;
    }
  
    // Vérification et calcul pour les compétences
    if (requirements.skills && Array.isArray(requirements.skills) && requirements.skills.length > 0) {
      scores.skills = cvAnalysisService.calculateSkillsScore(
        cvData.skills || [],
        requirements.skills
      );
      validWeights.skills = baseWeights.skills;
      totalWeight += baseWeights.skills;
    }
  
    // Vérification et calcul pour les outils
    if (requirements.tools && Array.isArray(requirements.tools) && requirements.tools.length > 0) {
      scores.tools = cvAnalysisService.calculateToolsScore(
        cvData.tools || [],
        requirements.tools
      );
      validWeights.tools = baseWeights.tools;
      totalWeight += baseWeights.tools;
    }
  
    // Vérification et calcul pour l'expérience
    if (requirements.experience_years && requirements.experience_years > 0) {
      scores.experience = this.calculateExperienceScore(
        cvData.experience_years || 0,
        requirements.experience_years
      );
      validWeights.experience = baseWeights.experience;
      totalWeight += baseWeights.experience;
    }
  
    // Vérification et calcul pour l'éducation
    if (requirements.education && Array.isArray(requirements.education) && requirements.education.length > 0) {
      scores.education = cvAnalysisService.calculateSkillsScore(
        cvData.education || [],
        requirements.education
      );
      validWeights.education = baseWeights.education;
      totalWeight += baseWeights.education;
    }
  
    // Vérification et calcul pour les langues
    if (requirements.languages && Array.isArray(requirements.languages) && requirements.languages.length > 0) {
      scores.languages = cvAnalysisService.calculateSkillsScore(
        cvData.languages || [],
        requirements.languages
      );
      validWeights.languages = baseWeights.languages;
      totalWeight += baseWeights.languages;
    }
  
    // Normalisation des poids si certains critères sont exclus
    let normalizedWeights = {};
    if (totalWeight > 0) {
      for (let key in validWeights) {
        normalizedWeights[key] = validWeights[key] / totalWeight;
      }
    }
  
    // Calcul du score total avec les poids normalisés
    let totalScore = 0;
    for (let key in scores) {
      totalScore += scores[key] * normalizedWeights[key];
    }
  
    // Identification des compétences et outils correspondants
    const matchingSkills = requirements.skills && Array.isArray(requirements.skills) && requirements.skills.length > 0
      ? cvAnalysisService.findMatches(cvData.skills || [], requirements.skills)
      : [];
  
    const matchingTools = requirements.tools && Array.isArray(requirements.tools) && requirements.tools.length > 0
      ? cvAnalysisService.findMatches(cvData.tools || [], requirements.tools)
      : [];
  
    // Calcul des pourcentages de correspondance
    const hasSkillsRequirement = requirements.skills && Array.isArray(requirements.skills) && requirements.skills.length > 0;
    const hasToolsRequirement = requirements.tools && Array.isArray(requirements.tools) && requirements.tools.length > 0;
  
    return {
      totalScore: totalWeight > 0 ? Math.min(1, Math.max(0, totalScore)) : null,
      description_match_score: requirements.description && requirements.description.trim() !== '' 
        ? scores.description || 0 
        : null,
      skillMatchPercent: hasSkillsRequirement 
        ? Math.round((matchingSkills.length / requirements.skills.length) * 100)
        : null,
      toolMatchPercent: hasToolsRequirement
        ? Math.round((matchingTools.length / requirements.tools.length) * 100)
        : null,
      matchingSkills,
      matchingTools,
      toolsScore: hasToolsRequirement ? (scores.tools || 0) : null
    };
  }

  calculateExperienceScore(candidateYears, requiredYears) {
    if (!requiredYears) return 1;
    if (!candidateYears) return 0;
  
    // Convertir les années en mois pour une meilleure précision
    const requiredMonths = requiredYears * 12;
    const candidateMonths = candidateYears * 12;
  
    // Si le candidat a plus d'expérience que demandé, score parfait
    if (candidateMonths >= requiredMonths) return 1;
  
    // Sinon, score proportionnel avec un minimum de 0.5 si au moins 80% de l'expérience requise
    const ratio = candidateMonths / requiredMonths;
    if (ratio >= 0.8) return 0.5 + (ratio - 0.8) * 2.5;
    return ratio * 0.625; // Pour avoir 0.5 à 80%
  }

  calculateDescriptionMatchScore(cvData, description) {
    if (!description) return 1;
    
    // Préparation des mots de la description en les nettoyant
    const descriptionWords = description.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2); // Ignorer les mots très courts
    
    if (descriptionWords.length === 0) return 1;
  
    // Création d'une liste unique de tous les mots à comparer
    const cvWords = new Set();
    
    // Ajouter les mots des titres et descriptions d'expérience
    (cvData.experiences || []).forEach(exp => {
      const titleWords = (exp.title || '').toLowerCase().split(/\W+/);
      const descWords = (exp.description || '').toLowerCase().split(/\W+/);
      titleWords.concat(descWords)
        .filter(word => word.length > 2)
        .forEach(word => cvWords.add(word));
    });
  
    // Ajouter les compétences
    (cvData.skills || []).forEach(skill => 
      skill.toLowerCase().split(/\W+/)
        .filter(word => word.length > 2)
        .forEach(word => cvWords.add(word))
    );
  
    // Ajouter les outils
    (cvData.tools || []).forEach(tool => 
      tool.toLowerCase().split(/\W+/)
        .filter(word => word.length > 2)
        .forEach(word => cvWords.add(word))
    );
  
    // Ajouter l'éducation
    (cvData.education || []).forEach(edu => 
      edu.toLowerCase().split(/\W+/)
        .filter(word => word.length > 2)
        .forEach(word => cvWords.add(word))
    );
  
    // Calculer le nombre de mots correspondants
    const matchingWords = descriptionWords.filter(word => cvWords.has(word));
    
    // Le score est le ratio de mots correspondants sur le total des mots de la description
    return matchingWords.length / descriptionWords.length;
  }
}

module.exports = new ElasticsearchService();