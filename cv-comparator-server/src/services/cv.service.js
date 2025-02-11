const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');  // Correction de l'import
const CVCache = require('../models/cv.cache.model');
const { client } = require('../../config/elasticsearch');
const cvAnalysisQueue = require('../../config/queue');

class CVService {
  constructor() {
    // Initialisation d'OpenAI dans le constructeur
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

  async analyzeCVFile(filePath, description = '') {
    try {
      console.log(`[ANALYZE] Début analyse fichier: ${filePath}`);
      
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      
      // Vérification du cache
      const cacheKey = description 
        ? `${fileName}-${Buffer.from(description).toString('base64').substring(0, 32)}`
        : fileName;
  
      let cachedCV = await CVCache.findOne({ 
        fileName: cacheKey,
        lastModified: stats.mtime
      });
  
      if (cachedCV) {
        console.log(`[CACHE] Analyse trouvée en cache pour ${fileName}`);
        return cachedCV.analysis;
      }
  
      const text = await this.extractText(filePath);
      if (!text) {
        throw new Error(`Aucun texte extrait du fichier ${fileName}`);
      }

      const analysis = await this.analyzeWithGPT(text, description);
      
      // Indexation
      const indexSuccess = await this.indexCV(analysis, fileName);
  
      // Mise en cache
      try {
        await CVCache.create({
          fileName: cacheKey,
          lastModified: stats.mtime,
          analysis: {
            status: 'completed',
            fileName,
            ...analysis,
            indexed: indexSuccess
          }
        });
      } catch (cacheError) {
        console.warn(`[CACHE] Échec de mise en cache pour ${fileName}:`, cacheError);
      }
  
      return {
        status: 'completed',
        fileName,
        ...analysis,
        indexed: indexSuccess
      };
  
    } catch (error) {
      console.error('[ANALYZE] Erreur:', error);
      throw error;
    }
  }

  async analyzeWithGPT(cvText, description = '') {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      console.log('[GPT] Début analyse', {
        textLength: cvText?.length,
        hasDescription: Boolean(description)
      });

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en recrutement technique chargé d'analyser des CV et d'évaluer leur correspondance avec un poste.
            Tu dois TOUJOURS répondre avec un objet JSON valide, rien d'autre.
            
            Structure de réponse requise (tous les champs sont optionnels):
            {
              "skills": string[], // liste des compétences techniques et non techniques
              "tools": string[], // liste des outils et technologies
              "experience_years": number, // nombre total d'années d'expérience
              "education": string[], // formation et certifications
              "languages": string[], // langues maîtrisées
              "experiences": [ // expérience professionnelle détaillée
                {
                  "title": string,
                  "company": string,
                  "description": string,
                  "duration": string
                }
              ],
              "analysis": {
                "similarity_score": number, // score global sur 100
                "similarity_to_job": number, // correspondance avec la description sur 100
                "skill_match_percent": number, // pourcentage de correspondance des compétences
                "matching_skills": string[], // compétences correspondantes
                "matching_tools": string[], // outils correspondants
                "detailed_scores": {
                  "skills": number, // score sur 100
                  "tools": number, // score sur 100
                  "experience": number, // score sur 100
                  "education": number, // score sur 100
                  "languages": number // score sur 100
                },
                "strengths": string[], // points forts identifiés
                "gaps": string[], // lacunes identifiées
                "recommendations": string[] // recommandations d'amélioration
              }
            }`
          },
          {
            role: "user",
            content: `Analyse ce CV ${description ? 'et évalue sa correspondance avec la description de poste' : ''}.
            
            ${description ? `Description du poste: ${description}\n\n` : ''}
            CV à analyser: ${cvText}
            
            IMPORTANT: Retourne UNIQUEMENT l'objet JSON selon la structure spécifiée, sans aucun texte avant ou après.`
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
        // S'assurer que le contenu commence par { et se termine par }
        if (!content.startsWith('{') || !content.endsWith('}')) {
          throw new Error('La réponse n\'est pas un objet JSON valide');
        }

        const result = JSON.parse(content);
        return this.normalizeAnalysisResult(result);
      } catch (parseError) {
        console.error('[GPT] Erreur parsing JSON:', {
          error: parseError.message,
          content: response.choices[0].message.content.substring(0, 200),
          contentLength: response.choices[0].message.content.length
        });
        throw new Error(`Format de réponse invalide: ${parseError.message}`);
      }

    } catch (error) {
      console.error('[GPT] Erreur analyse:', {
        name: error.name,
        message: error.message,
        type: error.type,
        status: error.status
      });
      throw new Error(`Erreur lors de l'analyse GPT: ${error.message}`);
    }
  }

  async searchCVs(requirements) {
    try {
      console.log('Début recherche avec critères:', requirements);
  
      const should = [];
      const must = [];
      
      // Construction de la requête Elasticsearch
      if (requirements.skills?.length) {
        requirements.skills.forEach(skill => {
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
  
      if (requirements.tools?.length) {
        requirements.tools.forEach(tool => {
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
  
      if (requirements.experience_years) {
        must.push({
          range: {
            experience_years: {
              gte: requirements.experience_years * 0.8
            }
          }
        });
      }
  
      if (requirements.education?.length) {
        requirements.education.forEach(edu => {
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
  
      if (requirements.languages?.length) {
        requirements.languages.forEach(lang => {
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
      
      // Réévaluation avec GPT
      const results = await Promise.all(response.hits.hits.map(async hit => {
        const cvData = hit._source;
        const analysis = await this.analyzeWithGPT(
          JSON.stringify(cvData),
          JSON.stringify(requirements)
        );
        
        return {
          ...cvData,
          fileName: hit._id,
          ...analysis.analysis
        };
      }));

      results.sort((a, b) => b.similarity_score - a.similarity_score);
      return results;

    } catch (error) {
      console.error('[SEARCH] Erreur:', error);
      throw error;
    }
  }

  normalizeAnalysisResult(result) {
    // On crée un objet par défaut avec tous les champs optionnels
    const defaultResult = {
      skills: [],
      tools: [],
      experience_years: 0,
      education: [],
      languages: [],
      experiences: [],
      analysis: {
        similarity_score: 0,
        similarity_to_job: 0,
        skill_match_percent: 0,
        matching_skills: [],
        matching_tools: [],
        detailed_scores: {
          skills: 0,
          tools: 0,
          experience: 0,
          education: 0,
          languages: 0
        },
        strengths: [],
        gaps: [],
        recommendations: []
      }
    };
  
    // On fusionne les données reçues avec les valeurs par défaut
    const normalizedResult = {
      ...defaultResult,
      ...result,
      analysis: {
        ...defaultResult.analysis,
        ...(result.analysis || {}),
        detailed_scores: {
          ...defaultResult.analysis.detailed_scores,
          ...(result.analysis?.detailed_scores || {})
        }
      }
    };
  
    // Normalisation des scores si présents
    if (normalizedResult.analysis) {
      normalizedResult.analysis.similarity_score = normalizedResult.analysis.similarity_score 
        ? Math.min(1, Math.max(0, normalizedResult.analysis.similarity_score / 100))
        : 0;
        
      normalizedResult.analysis.similarity_to_job = normalizedResult.analysis.similarity_to_job
        ? Math.min(1, Math.max(0, normalizedResult.analysis.similarity_to_job / 100))
        : 0;
        
      normalizedResult.analysis.skill_match_percent = normalizedResult.analysis.skill_match_percent
        ? Math.min(100, Math.max(0, normalizedResult.analysis.skill_match_percent))
        : 0;
  
      // Normalisation des scores détaillés
      if (normalizedResult.analysis.detailed_scores) {
        Object.keys(normalizedResult.analysis.detailed_scores).forEach(key => {
          normalizedResult.analysis.detailed_scores[key] = 
            Math.min(100, Math.max(0, normalizedResult.analysis.detailed_scores[key] || 0));
        });
      }
    }
  
    return normalizedResult;
  }

  // Modification de la méthode indexCV
  async indexCV(analysis, fileName) {
  try {
    console.log('[DEBUG] Données d\'analyse reçues:', JSON.stringify(analysis, null, 2));

    if (!analysis) {
      console.warn('[INDEXATION] Aucune analyse fournie, utilisation des valeurs par défaut');
      analysis = {};
    }

    const indexData = {
      fileName,
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      tools: Array.isArray(analysis.tools) ? analysis.tools : [],
      experience_years: Number(analysis.experience_years) || 0,
      education: Array.isArray(analysis.education) 
        ? analysis.education.map(edu => 
            typeof edu === 'object' 
              ? `${edu.degree || ''} ${edu.institution || ''}`.trim() 
              : edu
          ) 
        : [],
      languages: Array.isArray(analysis.languages) ? analysis.languages : [],
      indexed_date: new Date().toISOString()
    };

    console.log('[DEBUG] Données préparées pour indexation:', JSON.stringify(indexData, null, 2));

    const response = await client.index({
      index: 'cvs',
      id: fileName,
      body: indexData,
      refresh: true
    });

    console.log('[INDEXATION] Résultat:', {
      success: true,
      documentId: response._id,
      result: response.result
    });

    return true;
  } catch (error) {
    console.error('[INDEXATION] Erreur:', error);
    return false;
  }
}

  async calculateMatchScore(requirements, cvData) {
    try {
      console.log('[SCORE] Début calcul score avec GPT');
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en recrutement technique chargé d'évaluer la correspondance entre un profil et des exigences.
            Tu dois fournir une analyse détaillée et des scores sur une échelle de 0 à 100.
            Prends en compte :
            - La similarité sémantique des compétences et outils
            - Le contexte d'utilisation des technologies
            - La transférabilité des compétences
            - L'évolution des technologies (ex: Python 2 vs 3)
            Retourne uniquement un objet JSON valide.`
          },
          {
            role: "user",
            content: `Évalue la correspondance entre ces exigences et ce CV :
            
            Exigences :
            ${JSON.stringify(requirements, null, 2)}
            
            CV :
            ${JSON.stringify(cvData, null, 2)}
            
            Format de réponse attendu :
            {
              "totalScore": number,
              "detailedScores": {
                "skills": number,
                "tools": number,
                "experience_years": number,
                "education": number,
                "languages": number
              },
              "analysis": {
                "strengths": string[],
                "gaps": string[],
                "recommendations": string[]
              },
              "matchingDetails": {
                "skills": [
                  {
                    "required": string,
                    "matched": string,
                    "score": number,
                    "explanation": string
                  }
                ],
                "tools": [...],
                "transferableSkills": string[]
              }
            }`
          }
        ],
        temperature: 0.2
      });
  
      const result = JSON.parse(response.choices[0].message.content);
      
      console.log('[SCORE] Résultat analyse GPT:', {
        totalScore: result.totalScore,
        detailedScores: result.detailedScores
      });
  
      return result;
      
    } catch (error) {
      console.error('[SCORE] Erreur calcul score:', error);
      // Fallback vers la méthode de scoring classique
      return this.calculateBasicMatchScore(requirements, cvData);
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