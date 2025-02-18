// services/quizGeneratorService.js
const { OpenAI } = require('openai');
const Quiz = require('../models/Quiz');
const Requirement = require('../models/Requirement');
const cvService = require('../services/cv.service');
const { client } = require('../../config/elasticsearch');
const path = require('path');

class QuizGeneratorService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Génère un quiz personnalisé basé sur les requirements du poste et le CV du candidat
   * @param {Object} requirements - Requirements du poste
   * @param {Object} candidateData - Données extraites du CV
   * @returns {Promise<Object>} - Quiz généré
   */
  async generatePersonalizedQuiz(requirements, candidateData) {
    try {
      // Normalisation des requirements pour s'assurer qu'ils sont bien formatés
      const normalizedRequirements = this._normalizeRequirements(requirements);
      
      // Sauvegarde des requirements si ce n'est pas déjà un document Mongoose
      let requirementDoc;
      if (requirements._id) {
        requirementDoc = requirements;
      } else {
        requirementDoc = await this.storeRequirement(normalizedRequirements);
      }

      // S'assurer que jobDescription est correctement copié dans description
      const requirementDescription = requirementDoc.jobDescription || normalizedRequirements.description || '';
      
      // Préparation du prompt pour OpenAI
      const prompt = this._buildPromptForPersonalizedQuiz(normalizedRequirements, candidateData);
      
      // Appel à l'API OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: `Tu es un expert en recrutement technique spécialisé dans la création de quiz d'évaluation pour les candidats. 
                Tu dois générer un quiz personnalisé basé sur les requirements du poste.
                Règles importantes :
                - Générer exactement 30 questions
                - Chaque question a 5 options avec 2 options qui sont correctes par question
                - Niveau de difficulté advanced
                - Couvrir différents aspects techniques et pratiques du poste`
              },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      // Parsing de la réponse
      const quizContent = JSON.parse(response.choices[0].message.content);
      
      // Création du quiz dans la base de données
      const quiz = new Quiz({
        title: `Évaluation personnalisée - ${candidateData.name} - ${normalizedRequirements.description}`,
        description: `Quiz personnalisé généré pour ${candidateData.name} basé sur son profil et les requirements du poste`,
        type: 'personalized',
        requirement: requirementDoc._id,
        requirementData: {
          description: requirementDescription,
          skills: normalizedRequirements.skills,
          tools: normalizedRequirements.tools,
          experience_years: normalizedRequirements.experience_years,
          education: normalizedRequirements.education,
          languages: normalizedRequirements.languages
        },
        candidateInfo: {
          name: candidateData.name,
          skills: candidateData.skills,
          matchingSkills: candidateData.matching_skills,
          skillMatchPercent: candidateData.skill_match_percent,
          experienceYears: candidateData.experience_years,
          fileId: candidateData.fileName
        },
        sections: quizContent.sections,
        timeLimit: quizContent.timeLimit || 45,
        passingScore: quizContent.passingScore || 70,
        difficultyAdjustment: quizContent.difficultyAdjustment || "standard",
        focusAreas: quizContent.focusAreas || []
      });

      await quiz.save();
      return quiz;
    } catch (error) {
      console.error('Erreur lors de la génération du quiz personnalisé:', error);
      throw new Error('Échec de la génération du quiz personnalisé');
    }
  }

  /**
   * Sauvegarde des requirements dans la base de données
   * @param {Object} requirementData - Données des requirements
   * @returns {Promise<Object>} - Requirement sauvegardé
   */
  async storeRequirement(requirementData) {
    try {
      // Normalisation des requirements
      const normalizedRequirements = this._normalizeRequirements(requirementData);

      console.log('Requirements normalisés avant sauvegarde:', normalizedRequirements);
      
      // Création et sauvegarde du requirement
      const requirement = new Requirement({
        jobDescription: normalizedRequirements.description || 'Non spécifié',
        skills: normalizedRequirements.skills || [],
        tools: normalizedRequirements.tools || [],
        experience_years: normalizedRequirements.experience_years || 0,
        education: normalizedRequirements.education || [],
        languages: normalizedRequirements.languages || []
      });
      
      await requirement.save();
      console.log(`[QUIZ] Requirements sauvegardés avec ID: ${requirement._id}`);
      
      return requirement;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des requirements:', error);
      throw new Error(`Échec de la sauvegarde des requirements: ${error.message}`);
    }
  }
  _normalizeRequirements(requirements) {
    if (typeof requirements === 'string') {
      try {
        requirements = JSON.parse(requirements);
      } catch (e) {
        requirements = {};
      }
    }

    return {
      description: requirements.description || '',
      skills: Array.isArray(requirements.skills) 
        ? requirements.skills 
        : (requirements.skills?.split(',').map(s => s.trim()) || []),
      tools: Array.isArray(requirements.tools)
        ? requirements.tools
        : (requirements.tools?.split(',').map(t => t.trim()) || []),
      experience_years: Number(requirements.experience_years) || 0,
      education: Array.isArray(requirements.education) ? requirements.education : [],
      languages: Array.isArray(requirements.languages) ? requirements.languages : []
    };
  }

  /**
   * Construit le prompt pour OpenAI pour générer un quiz personnalisé
   * @param {Object} requirements - Requirements normalisés
   * @param {Object} candidateData - Données du candidat
   * @returns {string} - Prompt formaté
   */
  _buildPromptForPersonalizedQuiz(requirements, candidateData) {
    // Identifier les compétences manquantes
    const missingSkills = requirements.skills.filter(
      skill => !candidateData.matching_skills.includes(skill)
    );
    
    // Identifier les outils manquants
    const missingTools = requirements.tools.filter(
      tool => !candidateData.matching_tools.includes(tool)
    );

    // Extraire les compétences fortes (mentionnées plusieurs fois dans les expériences)
    const strongSkills = this._identifyStrongSkills(candidateData);

    return `
Crée un quiz personnalisé pour évaluer le candidat "${candidateData.name}" pour le poste de "${requirements.description}".

Informations sur le candidat:
- Compétences déclarées: ${candidateData.skills.join(', ')}
- Compétences correspondant au poste: ${candidateData.matching_skills.join(', ')}
- Outils maîtrisés: ${candidateData.tools.join(', ')}
- Années d'expérience: ${candidateData.experience_years || 'Non spécifié'}
- Langues: ${candidateData.languages.join(', ') || 'Non spécifié'}
- Formations: ${candidateData.education.map(e => e.degree || e).join(', ') || 'Non spécifié'}
- Score de correspondance avec le poste: ${candidateData.similarity_score || 0}/100
- Pourcentage de correspondance des compétences: ${candidateData.skill_match_percent || 0}%

Requirements du poste:
- Description: ${requirements.description}
- Compétences requises: ${requirements.skills.join(', ')}
- Outils requis: ${requirements.tools.join(', ')}
- Expérience minimale: ${requirements.experience_years} ans
- Langues requises: ${requirements.languages.join(', ') || 'Non spécifié'}

Points à renforcer (compétences/outils manquants):
- Compétences manquantes: ${missingSkills.join(', ') || 'Aucune'}
- Outils manquants: ${missingTools.join(', ') || 'Aucun'}

Points forts identifiés:
- Compétences principales: ${strongSkills.join(', ') || 'Non identifiées'}

Instructions pour le quiz:
1. Crée un quiz adapté au profil du candidat avec les spécifications suivantes:
   - Focalise-toi sur l'évaluation des compétences correspondantes déclarées (pour vérifier leur réelle maîtrise)
   - Inclus quelques questions sur les compétences manquantes (pour vérifier si le candidat a des connaissances non mentionnées dans son CV)
   - Adapte la difficulté des questions en fonction de l'expérience du candidat
   - Inclus au moins une question situationnelle liée au poste

2. Le quiz doit comprendre 3-4 sections:
   - Évaluation des compétences techniques (focus sur les compétences déclarées)
   - Évaluation des connaissances sur les outils
   - Questions situationnelles
   - Test de connaissances sur les compétences manquantes (si applicable)

3. Chaque section doit contenir 3-5 questions
4. Les types de questions doivent être variés:
   - QCM (multiple_choice)
   - Vrai/Faux (true_false)
   - Questions ouvertes (open_ended)
   - Mini exercices pratiques (coding) si pertinent

5. Pour chaque question, définis:
   - Un énoncé clair
   - Des options (pour les QCM)
   - Une réponse correcte
   - Un niveau de difficulté adapté au profil
   - Une catégorie correspondant à une compétence spécifique
   - Une explication pour la réponse correcte

6. Assure-toi que:
   - Les questions sont équilibrées entre vérification des compétences déclarées et exploration des compétences manquantes
   - La difficulté est adaptée au niveau d'expérience du candidat
   - Les questions sont pertinentes pour le poste spécifique

Format de sortie attendu (JSON):
{
  "timeLimit": 45,
  "passingScore": 70,
  "difficultyAdjustment": "standard|easier|harder",
  "focusAreas": ["Compétence1", "Compétence2"],
  "sections": [
    {
      "title": "Titre de la section",
      "description": "Description de la section",
      "questions": [
        {
          "questionText": "Texte de la question",
          "type": "multiple_choice",
          "options": [
            {"text": "Option 1", "isCorrect": false},
            {"text": "Option 2", "isCorrect": true}
          ],
          "difficultyLevel": "beginner|intermediate|advanced",
          "category": "Catégorie",
          "explanation": "Explication de la réponse"
        }
      ]
    }
  ]
}`;
  }

  /**
   * Identifie les compétences fortes du candidat en analysant les expériences
   * @param {Object} candidateData - Données du candidat
   * @returns {Array<string>} - Liste des compétences fortes
   */
  _identifyStrongSkills(candidateData) {
    const skillMentions = {};
    
    // Comptabiliser les mentions de compétences dans les expériences
    if (candidateData.experiences && Array.isArray(candidateData.experiences)) {
      candidateData.experiences.forEach(exp => {
        if (exp.description) {
          candidateData.skills.forEach(skill => {
            const regex = new RegExp(skill, 'i');
            if (regex.test(exp.description)) {
              skillMentions[skill] = (skillMentions[skill] || 0) + 1;
            }
          });
        }
      });
    }
    
    // Identifier les compétences mentionnées dans plusieurs expériences
    return Object.entries(skillMentions)
      .filter(([_, count]) => count > 1)
      .map(([skill, _]) => skill);
  }

  /**
   * Analyse le CV d'un candidat pour générer un quiz personnalisé
   * @param {string} filePath - Chemin du fichier CV
   * @param {Object} requirements - Requirements du poste
   * @returns {Promise<Object>} - Quiz généré
   */
  async analyzeAndGenerateQuiz(filePath, requirements) {
    try {
      // Normalisation des requirements pour s'assurer qu'ils sont bien formatés
      const normalizedRequirements = this._normalizeRequirements(requirements);
      
      // Extraction du texte du CV
      const text = await cvService.extractText(filePath);
      
      // Analyse du CV avec GPT
      const fileName = path.basename(filePath);
      const extraction = await cvService.analyzeWithGPT(text, normalizedRequirements, fileName);
      
      // Formatage des données du candidat
      const candidateData = this._formatCandidateData(extraction, fileName);
      
      // Calcul des scores
      if (candidateData) {
        const scores = cvService.calculateManualScore(candidateData, normalizedRequirements);
        Object.assign(candidateData, {
          similarity_score: scores.totalScore,
          skill_match_percent: scores.skillMatchPercent,
          description_match_score: scores.description_match_score,
          matching_skills: scores.matchingSkills,
          matching_tools: scores.matchingTools
        });
        
        // Log des résultats détaillés
        console.log(`[QUIZ] Résultats détaillés pour ${fileName}:`, {
          similarity_score: scores.totalScore,
          skills_requis: normalizedRequirements.skills?.length || 0,
          skills_trouvés: scores.matchingSkills.length,
          skills_correspondants: scores.matchingSkills,
          tools_requis: normalizedRequirements.tools?.length || 0,
          tools_trouvés: scores.matchingTools.length,
          tools_correspondants: scores.matchingTools,
          skill_match_percent: scores.skillMatchPercent,
          description_match_score: scores.description_match_score
        });
      }
      
      // Génération du quiz personnalisé
      const quiz = await this.generatePersonalizedQuiz(normalizedRequirements, candidateData);
      
      // Nettoyage du fichier temporaire
      cvService.cleanupFile(filePath).catch(err => 
        console.error(`Erreur lors du nettoyage de ${filePath}:`, err)
      );
      
      return quiz;
    } catch (error) {
      console.error('Erreur lors de l\'analyse et génération de quiz:', error);
      throw new Error(`Échec de l\'analyse du CV et génération du quiz: ${error.message}`);
    }
  }

  /**
   * Formate les données extraites du CV
   * @param {Object} extraction - Données extraites du CV
   * @param {string} filePath - Chemin du fichier
   * @returns {Object} - Données formatées
   */
  _formatCandidateData(extraction, filePath) {
    if (!extraction) return null;
    
    const fileName = filePath.split('/').pop();
    return {
      fileName: fileName,
      name: this._cleanFileName(fileName),
      status: 'completed',
      summary: extraction.summary || "",
      skills: extraction.skills || [],
      tools: extraction.tools || [],
      experience_years: extraction.experience_years || 0,
      education: extraction.education || [],
      languages: extraction.languages || [],
      experiences: extraction.experiences || [],
      matching_skills: extraction.matching_skills || [],
      matching_tools: extraction.matching_tools || [],
      projects: extraction.projects || []
    };
  }

  /**
   * Nettoie le nom de fichier (utilise la même méthode que le CVController)
   * @param {string} fileName - Nom du fichier
   * @returns {string} - Nom nettoyé
   */
  _cleanFileName(fileName) {
    return fileName
      .replace(/^\d+-/, '')
      .replace(/\.(pdf|doc|docx)$/i, '');
  }
  
  /**
   * Génère un quiz basé sur un CV déjà indexé dans ElasticSearch
   * @param {string} fileId - ID du fichier dans ElasticSearch
   * @param {Object} requirements - Requirements du poste
   * @returns {Promise<Object>} - Quiz généré
   */
  async generateQuizFromIndexedCV(fileId, requirements) {
    try {
      // Normalisation des requirements
      const normalizedRequirements = this._normalizeRequirements(requirements);
      
      // Récupération du CV depuis ElasticSearch
      const indexedCV = await client.get({
        index: 'cvs',
        id: fileId
      });
      
      if (!indexedCV || !indexedCV._source) {
        throw new Error(`CV non trouvé dans l'index ElasticSearch: ${fileId}`);
      }
      
      console.log(`[QUIZ] CV récupéré depuis ElasticSearch: ${fileId}`);
      
      // Formatage des données du CV pour la génération du quiz
      const cvData = indexedCV._source;
      const candidateData = {
        fileName: fileId,
        name: this._cleanFileName(fileId),
        skills: cvData.skills || [],
        tools: cvData.tools || [],
        experience_years: cvData.experience_years || 0,
        education: cvData.education || [],
        languages: cvData.languages || [],
        experiences: cvData.experiences || []
      };
      
      // Calcul des scores et matching
      const scores = cvService.calculateManualScore(candidateData, normalizedRequirements);
      Object.assign(candidateData, {
        similarity_score: scores.totalScore,
        skill_match_percent: scores.skillMatchPercent,
        description_match_score: scores.description_match_score,
        matching_skills: scores.matchingSkills,
        matching_tools: scores.matchingTools
      });
      
      // Génération du quiz personnalisé
      const quiz = await this.generatePersonalizedQuiz(normalizedRequirements, candidateData);
      
      return quiz;
    } catch (error) {
      console.error('Erreur lors de la génération de quiz depuis un CV indexé:', error);
      throw new Error(`Échec de la génération du quiz depuis le CV indexé: ${error.message}`);
    }
  }
  
  /**
   * Recherche les meilleurs CV correspondant aux requirements et génère des quiz pour chacun
   * @param {Object} requirements - Requirements du poste
   * @param {number} limit - Nombre maximum de CV à traiter
   * @returns {Promise<Array>} - Liste des quiz générés
   */
  async generateQuizzesForTopCandidates(requirements, limit = 5) {
    try {
      console.log(`[QUIZ] Recherche des ${limit} meilleurs candidats pour générer des quiz`);
      
      // Normalisation des requirements
      const normalizedRequirements = this._normalizeRequirements(requirements);
      
      // Recherche des meilleurs CV
      const { rankings } = await cvService.searchCVs(normalizedRequirements);
      
      if (!rankings || rankings.length === 0) {
        console.warn('[QUIZ] Aucun CV trouvé correspondant aux requirements');
        return [];
      }
      
      // Limite le nombre de CV à traiter
      const topCandidates = rankings.slice(0, limit);
      console.log(`[QUIZ] ${topCandidates.length} candidats sélectionnés pour génération de quiz`);
      
      // Génération des quiz pour chaque candidat
      const quizPromises = topCandidates.map(async (candidate) => {
        try {
          console.log(`[QUIZ] Génération de quiz pour ${candidate.fileName}`);
          const quiz = await this.generatePersonalizedQuiz(normalizedRequirements, candidate);
          return {
            success: true,
            candidateName: candidate.name,
            candidateId: candidate.fileName,
            quizId: quiz._id,
            similarity_score: candidate.similarity_score,
            skill_match_percent: candidate.skill_match_percent
          };
        } catch (error) {
          console.error(`[QUIZ] Erreur pour ${candidate.fileName}:`, error);
          return {
            success: false,
            candidateName: candidate.name,
            candidateId: candidate.fileName,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(quizPromises);
      console.log(`[QUIZ] ${results.filter(r => r.success).length} quiz générés avec succès`);
      
      return results;
    } catch (error) {
      console.error('[QUIZ] Erreur lors de la génération de quiz pour les meilleurs candidats:', error);
      throw new Error(`Échec de la génération des quiz: ${error.message}`);
    }
  }
}

module.exports = new QuizGeneratorService();