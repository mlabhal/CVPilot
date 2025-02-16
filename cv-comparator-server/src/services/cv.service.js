const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');
const CVCache = require('../models/cv.cache.model');
const { client } = require('../../config/elasticsearch');

class CVService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY must be set in environment variables');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async extractText(filePath) {
    console.log(`[EXTRACT] Début extraction texte: ${filePath}`);
    const extension = filePath.toLowerCase().split('.').pop();
    console.log(`[EXTRACT] Extension détectée: ${extension}`);
    
    try {
      let text;
      switch(extension) {
        case 'pdf':
          text = await this.extractTextFromPDF(filePath);
          break;
        case 'doc':
        case 'docx':
          text = await this.extractTextFromWord(filePath);
          break;
        default:
          throw new Error(`Format non supporté: ${extension}`);
      }
      console.log(`[EXTRACT] Succès, longueur: ${text?.length || 0} caractères`);
      return text;
    } catch (error) {
      console.error(`[EXTRACT] Échec: ${error.message}`);
      throw error;
    }
  }

  async extractTextFromPDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  async extractTextFromWord(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte Word:', error);
      throw new Error(`Impossible de lire le fichier Word: ${error.message}`);
    }
  }

  async analyzeWithGPT(cvText, requirements = {}, fileName = '') {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Fonction utilitaire pour normaliser une chaîne de requirements
    const normalizeRequirementString = (str) => {
      if (Array.isArray(str)) return str;
      if (typeof str !== 'string') return [];
      return str.split(',')
                .map(item => item.trim())
                .filter(Boolean);
    };
    // Normalisation des requirements pour le prompt
    const normalizedRequirements = {
      ...requirements,
      skills: normalizeRequirementString(requirements.skills),
      tools: normalizeRequirementString(requirements.tools)
    };

    // Préparation du contexte des requirements pour le prompt
    const requirementsContext = `
      Requirements du poste :
      ${normalizedRequirements.title ? `- Poste : ${normalizedRequirements.title}` : ''}
      ${normalizedRequirements.description ? `- Description : ${normalizedRequirements.description}` : ''}
      ${normalizedRequirements.skills?.length ? `- Compétences requises : ${normalizedRequirements.skills.join(', ')}` : ''}
      ${normalizedRequirements.tools?.length ? `- Outils/Technologies requis : ${normalizedRequirements.tools.join(', ')}` : ''}
      ${normalizedRequirements.experience_years ? `- Années d'expérience souhaitées : ${normalizedRequirements.experience_years}` : ''}
    `.trim();

    try {
      console.log('[GPT] Début extraction', {
        textLength: cvText?.length,
        requirementsLength: requirementsContext.length
      });

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en analyse de CV chargé d'extraire des informations structurées et d'évaluer l'adéquation avec un poste.
            Tu dois TOUJOURS répondre avec un objet JSON valide, rien d'autre.

            Instructions pour l'analyse :
            - Analyser le CV en tenant compte des requirements du poste fournis
            - Extraire TOUTES les informations pertinentes du CV
            - Établir les correspondances entre le profil et les requirements
            - Pour le résumé d'analyse :
              * Évaluer l'adéquation globale du profil avec le poste
              * Mettre en avant les points forts qui correspondent aux requirements
              * Identifier les éventuels gaps ou points d'attention
              * Si pas de requirements fournis, faire une analyse générale du profil
          
            Instructions pour l'extraction :
            - Pour l'expérience : 
              * IGNORER toute mention d'expérience totale dans le CV
              * Calculer le nombre des années d'expérience à partir des expériences listées 
              * Utiliser EXACTEMENT le format "MM/YYYY - MM/YYYY" pour duration
              * Sur les expériences listées, remplacer "Aujourd'hui" par la date actuelle (${new Date().getMonth() + 1}/${new Date().getFullYear()})
              * Pour chaque expérience, calculer duration_in_months précisément
            - Pour les compétences et outils :
              * Extraire TOUTES les compétences et outils mentionnés
            
            Structure de réponse requise :
            {
              "summary":string, // Résumé détaillé de l'analyse et de l'adéquation avec le poste
              "skills": string[], // Liste complète des compétences identifiées dans le CV
              "tools": string[], // Liste complète des outils/technologies identifiés
              "education": string[], // Liste des formations/diplômes
              "languages": string[], // Liste des langues maîtrisées
              "experiences": [ // Liste détaillée des expériences professionnelles
                {
                  "title": string, // Intitulé du poste
                  "company": string, // Nom de l'entreprise
                  "description": string, // Description des responsabilités et réalisations
                  "duration": string, // Durée de l'expérience au format "MM/YYYY - MM/YYYY"
                  "duration_in_months": number // Nombre de mois entre date début et date fin
                }
              ],
              "experience_years": number, // Nombre d'années d'expérience 
              "certifications": string[], // Liste des certifications professionnelles
              "projects": [ // Projets significatifs mentionnés
                {
                  "name": string,
                  "description": string,
                  "technologies": string[]
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Analyse ce CV en tenant compte des requirements du poste.

            Requirements du poste:
            ${requirementsContext}
            
            CV à analyser:
            ${cvText}
            
            IMPORTANT: 
            - Retourne UNIQUEMENT l'objet JSON selon la structure spécifiée
            - Assure-toi que l'analyse tient compte des requirements fournis
            - Si pas de requirements, fais une analyse générale du profil
            - Calcule précisément la durée de chaque expérience
            - Sépare bien les compétences des outils/technologies`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Réponse OpenAI invalide');
      }

      try {
        const content = response.choices[0].message.content.trim();
        if (!content.startsWith('{') || !content.endsWith('}')) {
          throw new Error('La réponse n\'est pas un objet JSON valide');
        }

        const result = JSON.parse(content);
        const normalizedResult = await this.normalizeExtractionResult(result);

        // Calcul des matching skills et tools
        if (normalizedRequirements.skills?.length || normalizedRequirements.tools?.length) {
          normalizedResult.matching_skills = this.findMatches(
            normalizedResult.skills || [],
            normalizedRequirements.skills || []
          );
          normalizedResult.matching_tools = this.findMatches(
            normalizedResult.tools || [],
            normalizedRequirements.tools || []
          );

          console.log('[MATCHING] Résultats du matching:', {
            candidate_skills: normalizedResult.skills,
            required_skills: normalizedRequirements.skills,
            matching_skills: normalizedResult.matching_skills,
            candidate_tools: normalizedResult.tools,
            required_tools: normalizedRequirements.tools,
            matching_tools: normalizedResult.matching_tools
          });
        }

        const indexFileName = `${fileName || Date.now()}`;
        let indexSuccess = false;
        
        try {
          indexSuccess = await this.indexCV(normalizedResult, indexFileName);
        } catch (indexError) {
          console.error('[INDEXATION] Erreur lors de l\'indexation:', indexError);
        }

        return {
          ...normalizedResult,
          indexed: indexSuccess,
          indexFileName: indexSuccess ? indexFileName : null
        };

      } catch (parseError) {
        console.error('[GPT] Erreur parsing JSON:', {
          error: parseError.message,
          content: response.choices[0].message.content.substring(0, 200),
          contentLength: response.choices[0].message.content.length
        });
        throw new Error(`Format de réponse invalide: ${parseError.message}`);
      }

    } catch (error) {
      console.error('[GPT] Erreur extraction:', {
        name: error.name,
        message: error.message,
        type: error.type,
        status: error.status
      });
      throw new Error(`Erreur lors de l'extraction GPT: ${error.message}`);
    }
}

  findMatches(candidateItems, requiredItems) {
    if (!candidateItems || !requiredItems) return [];
    
    // S'assurer que nous avons des tableaux
    const candidates = Array.isArray(candidateItems) ? candidateItems : [candidateItems];
    const required = Array.isArray(requiredItems) ? requiredItems : [requiredItems];
    
    // Pour chaque requirement, chercher une correspondance
    return required.filter(req => {
      const found = candidates.some(candidate => this.isFlexibleMatch(candidate, req));
      if (!found) {
        console.log(`[MATCHING] Non trouvé: "${req}"`);
      } else {
        console.log(`[MATCHING] Trouvé: "${req}"`);
      }
      return found;
    });
  }

  isFlexibleMatch(candidate, required) {
    if (!candidate || !required) {
      console.log('[MATCHING] Candidat ou required null/undefined');
      return false;
    }
    
    // Conversion en minuscules et nettoyage
    const normalizeString = (str) => str.toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, '')
      .trim();

    const candidateNorm = normalizeString(candidate);
    const requiredNorm = normalizeString(required);

    console.log(`[MATCHING] Comparaison: "${candidateNorm}" avec "${requiredNorm}"`);

    // Correspondance exacte après normalisation
    if (candidateNorm === requiredNorm) {
      console.log(`[MATCHING] Correspondance exacte trouvée: ${candidate}`);
      return candidate;
    }

    // Gestion des versions (ex: python3 === python)
    if (candidateNorm.replace(/[0-9.]/g, '') === requiredNorm.replace(/[0-9.]/g, '')) {
      console.log(`[MATCHING] Correspondance de version trouvée: ${candidate} = ${required}`);
      return candidate;
    }

    // Correspondance partielle pour les termes composés
    if (candidateNorm.includes(requiredNorm) || requiredNorm.includes(candidateNorm)) {
      // Vérifier que c'est un mot complet et pas juste une partie
      const candidateWords = candidateNorm.split(/\s+/);
      const requiredWords = requiredNorm.split(/\s+/);
      
      const hasMatch = candidateWords.some(cWord => 
        requiredWords.some(rWord => {
          const matches = cWord === rWord || 
                         cWord.startsWith(rWord + '-') || 
                         rWord.startsWith(cWord + '-');
          if (matches) {
            console.log(`[MATCHING] Correspondance partielle trouvée: "${cWord}" dans "${rWord}"`);
          }
          return matches;
        })
      );

      if (hasMatch) {
        console.log(`[MATCHING] Correspondance de terme composé trouvée: ${candidate} ~ ${required}`);
        return candidate;
      }
    }

    console.log(`[MATCHING] Aucune correspondance trouvée entre: ${candidate} et ${required}`);
    return false;
}
  // Mise à jour de calculateSkillsScore
  calculateSkillsScore(candidateItems, requiredItems) {
    if (!requiredItems || requiredItems.length === 0) return 1;
    if (!candidateItems || candidateItems.length === 0) return 0;

    const matches = this.findMatches(candidateItems, requiredItems);
    return matches.length / requiredItems.length;
  }


  async normalizeExtractionResult(result) {
    try {
      const defaultResult = {
        summary:"",
        skills: [],
        tools: [],
        experience_years: 0,
        education: [],
        languages: [],
        experiences: [],
        matching_skills: [], // Ajout
        matching_tools: [],   // Ajout
        certifications: [],
        projects: []
      };
  
      // S'assurer que chaque expérience a le champ duration_in_months
      const normalizedExperiences = (result.experiences || []).map(exp => ({
        ...exp,
        duration_in_months: exp.duration_in_months || 0
      }));
  
      return {
        ...defaultResult,
        ...result,
        skills: result.skills || [],
        tools: result.tools || [],
        education: result.education || [],
        languages: result.languages || [],
        experiences: normalizedExperiences,
        certifications: result.certifications || [],
        projects: result.projects || [],
        experience_years: result.experience_years || 0
      };
    } catch (error) {
      console.error('Erreur dans normalizeExtractionResult:', error);
      return {
        ...defaultResult,
        error: error.message
      };
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
          should.push({
            match: {
              "description": {
                query: preparedRequirements.description,
                boost: 2,
                fuzziness: "AUTO"
              }
            }
          });
        }
    
        if (preparedRequirements.skills.length) {
          preparedRequirements.skills.forEach(skill => {
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
    
        if (preparedRequirements.tools.length) {
          preparedRequirements.tools.forEach(tool => {
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
    
        if (preparedRequirements.experience_years) {
          must.push({
            range: {
              experience_years: {
                gte: preparedRequirements.experience_years * 0.8
              }
            }
          });
        }
    
        if (preparedRequirements.education.length) {
          preparedRequirements.education.forEach(edu => {
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
    
        if (preparedRequirements.languages.length) {
          preparedRequirements.languages.forEach(lang => {
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
    
        const searchQuery = {
          index: 'cvs',
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
        
        // Trouver le score max pour la normalisation
        const maxScore = Math.max(...response.hits.hits.map(hit => hit._score || 0));
        
        // Traitement des résultats avec score elasticsearch normalisé
        const results = response.hits.hits.map(hit => {
            const cvData = hit._source;
            const scores = this.calculateManualScore(cvData, preparedRequirements);
            
            // Normalisation du score elasticsearch en pourcentage
            const normalizedElasticsearchScore = maxScore > 0 
                ? ((hit._score || 0) / maxScore) * 100 
                : 0;
            
            return {
                ...cvData,
                fileName: hit._id,
                similarity_score: scores.totalScore,
                skill_match_percent: scores.skillMatchPercent,
                description_match_score: scores.description_match_score,
                elasticsearch_score: Math.round(normalizedElasticsearchScore) // score sur 100
            };
        });
    
        // Tri par score de similarité décroissant
        results.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    
        return { rankings: results };
    
      } catch (error) {
        console.error('[SEARCH] Erreur:', error);
        throw error;
      }
    }
    
  calculateManualScore(cvData, requirements) {
      // Initialisation des poids pour chaque critère
      const weights = {
        description: 0.25,
        skills: 0.25,
        tools: 0.20,
        experience: 0.15,
        education: 0.10,
        languages: 0.05
      };
    
      // Calcul du score de correspondance de description
      const descriptionScore = this.calculateDescriptionMatchScore(
        cvData,
        requirements.description || ''
      );
    
      // Calcul du score pour les compétences
      const skillsScore = this.calculateSkillsScore(
        cvData.skills || [],
        requirements.skills || []
      );
    
      // Calcul du score pour les outils
      const toolsScore = this.calculateSkillsScore(
        cvData.tools || [],
        requirements.tools || []
      );
    
      // Calcul du score pour l'expérience
      const experienceScore = this.calculateExperienceScore(
        cvData.experience_years || 0,
        requirements.experience_years || 0
      );
    
      // Calcul du score pour l'éducation
      const educationScore = this.calculateSkillsScore(
        cvData.education || [],
        requirements.education || []
      );
    
      // Calcul du score pour les langues
      const languagesScore = this.calculateSkillsScore(
        cvData.languages || [],
        requirements.languages || []
      );
    
      // Calcul du score total pondéré
      const totalScore = (
        (descriptionScore * weights.description) +
        (skillsScore * weights.skills) +
        (toolsScore * weights.tools) +
        (experienceScore * weights.experience) +
        (educationScore * weights.education) +
        (languagesScore * weights.languages)
      );
    
      // Identification des compétences et outils correspondants
      const matchingSkills = this.findMatches(
        cvData.skills || [],
        requirements.skills || []
      );
    
      const matchingTools = this.findMatches(
        cvData.tools || [],
        requirements.tools || []
      );
    
      const skillMatchPercent = requirements.skills.length > 0
        ? (matchingSkills.length / requirements.skills.length) * 100
        : 100;
    
      return {
        totalScore: Math.min(1, Math.max(0, totalScore)),
        description_match_score: descriptionScore,
        skillMatchPercent: Math.round(skillMatchPercent),
        matchingSkills,
        matchingTools
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


  async indexCV(analysis, fileName) {
    try {
      console.log('[INDEXATION] Début indexation pour fichier:', fileName);
      console.log('[INDEXATION] Client ES disponible:', !!client);
  
      // Vérification des paramètres
      if (!fileName) {
        throw new Error('Nom de fichier manquant pour l\'indexation');
      }
  
      console.log('[DEBUG] Données d\'analyse reçues:', JSON.stringify(analysis, null, 2));
  
      if (!analysis) {
        console.warn('[INDEXATION] Aucune analyse fournie, utilisation des valeurs par défaut');
        analysis = {};
      }
  
      // Préparation des données avec validation approfondie
      const indexData = {
        fileName: fileName,
        skills: (() => {
          const skills = Array.isArray(analysis.skills) ? analysis.skills : [];
          console.log('[DEBUG] Skills extraits:', skills);
          return skills;
        })(),
        tools: (() => {
          const tools = Array.isArray(analysis.tools) ? analysis.tools : [];
          console.log('[DEBUG] Tools extraits:', tools);
          return tools;
        })(),
        experience_years: (() => {
          const years = Number(analysis.experience_years) || 0;
          console.log('[DEBUG] Années d\'expérience:', years);
          return years;
        })(),
        education: (() => {
          const education = Array.isArray(analysis.education)
            ? analysis.education.map(edu => {
                if (typeof edu === 'object') {
                  const formattedEdu = `${edu.degree || ''} ${edu.institution || ''}`.trim();
                  console.log('[DEBUG] Education formatée:', formattedEdu);
                  return formattedEdu;
                }
                return edu;
              })
            : [];
          console.log('[DEBUG] Education extraite:', education);
          return education;
        })(),
        languages: (() => {
          const languages = Array.isArray(analysis.languages) ? analysis.languages : [];
          console.log('[DEBUG] Langues extraites:', languages);
          return languages;
        })(),
        experiences: (() => {
          const experiences = Array.isArray(analysis.experiences) 
            ? analysis.experiences.map(exp => ({
                title: exp.title || '',
                company: exp.company || '',
                description: exp.description || '',
                duration: exp.duration || '',
                duration_in_months: exp.duration_in_months || 0 
              }))
            : [];
          console.log('[DEBUG] Expériences extraites:', experiences);
          return experiences;
        })(),
        indexed_date: new Date().toISOString()
      };
  
      console.log('[DEBUG] Données préparées pour indexation:', JSON.stringify(indexData, null, 2));
  
      // Vérification de l'existence de l'index
      const indexExists = await client.indices.exists({
        index: 'cvs'
      });
  
      if (!indexExists) {
        console.warn('[INDEXATION] Index cvs n\'existe pas, création...');
        await client.indices.create({
          index: 'cvs',
          body: {
            mappings: {
              properties: {
                fileName: { type: 'keyword' },
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
  
      // Indexation avec retry
      let retries = 3;
      let response;
  
      while (retries > 0) {
        try {
          response = await client.index({
            index: 'cvs',
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
      console.log('[INDEXATION] Résultat:', {
        success: true,
        documentId: response._id,
        result: response.result
      });
  
      // Vérification de l'indexation
      const indexed = await client.get({
        index: 'cvs',
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

  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`Fichier supprimé: ${filePath}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier ${filePath}:`, error);
    }
  }
}

module.exports = new CVService();