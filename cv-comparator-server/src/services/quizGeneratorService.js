const { OpenAI } = require('openai');
const Quiz = require('../models/Quiz');
const Requirement = require('../models/Requirement');

class QuizGeneratorService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.sectionConfig = {
      technical: { title: "Compétences Techniques", questionCount: 15 },
      tools: { title: "Maîtrise des Outils", questionCount: 10 },
      situational: { title: "Questions Situationnelles", questionCount: 5 }
    };
  }

  async generateStandardQuiz(requirements) {
    try {
      const normalizedRequirements = this._normalizeRequirements(requirements);
      const requirementDoc = requirements._id ? requirements : await this.storeRequirement(normalizedRequirements);
  
      const sections = [];
      const sectionTypes = [
        {
          type: 'technical',
          count: 15,
          title: "Compétences Techniques",
          prompt: this._buildTechnicalSectionPrompt(normalizedRequirements)
        },
        {
          type: 'tools',
          count: 10,
          title: "Maîtrise des Outils",
          prompt: this._buildToolsSectionPrompt(normalizedRequirements)
        },
        {
          type: 'situational',
          count: 5,
          title: "Questions Situationnelles",
          prompt: this._buildSituationalSectionPrompt(normalizedRequirements)
        }
      ];
  
      for (const section of sectionTypes) {
        let attempts = 0;
        const maxAttempts = 3;
        let sectionQuestions = null;
  
        while (attempts < maxAttempts && !sectionQuestions) {
          try {
            sectionQuestions = await this._generateSection(section);
            
            if (!sectionQuestions || sectionQuestions.length !== section.count) {
              throw new Error(`Nombre incorrect de questions générées pour ${section.type}`);
            }

            sections.push({
              title: section.title,
              description: `Section ${section.title} du quiz`,
              questions: sectionQuestions
            });
          } catch (error) {
            console.error(`Erreur génération section ${section.type}, tentative ${attempts + 1}:`, error);
            attempts++;
            
            if (attempts === maxAttempts) {
              sections.push({
                title: section.title,
                description: `Section de secours pour ${section.title}`,
                questions: this._generateFallbackQuestions(section.count)
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          }
        }
      }
  
      const quiz = new Quiz({
        title: `Évaluation poste - ${normalizedRequirements.jobTitle}`,
        description: `Quiz pour évaluer le candidat sur: ${normalizedRequirements.description}`,
        type: 'standard',
        requirement: requirementDoc._id,
        requirementData: {
          jobTitle:normalizedRequirements.jobTitle,
          description: requirementDoc.jobDescription || normalizedRequirements.description,
          skills: normalizedRequirements.skills,
          tools: normalizedRequirements.tools,
          experience_years: normalizedRequirements.experience_years,
          education: normalizedRequirements.education,
          languages: normalizedRequirements.languages
        },
        sections,
        timeLimit: 45,
        passingScore: 70
      });
  
      await quiz.save();
      return quiz;
  
    } catch (error) {
      console.error('Erreur génération quiz:', error);
      throw new Error(`Échec de la génération du quiz: ${error.message}`);
    }
  }

  async _generateSection(sectionConfig) {
    try {
      const systemPrompt = `Tu es un expert en création de quiz techniques.

RÈGLES CRITIQUES :
- Génère EXACTEMENT ${sectionConfig.count} questions
- Toutes les questions doivent être en français
- Chaque question doit avoir EXACTEMENT 5 options
- Seulement 1-2 réponses correctes par question
- Les niveaux de difficulté doivent être: "beginner", "intermediate" ou "advanced"

FORMAT JSON STRICT OBLIGATOIRE :
{
  "questions": [
    {
      "questionText": "Question en français",
      "type": "multiple_choice",
      "options": [
        {"text": "Option 1", "isCorrect": false},
        {"text": "Option 2", "isCorrect": true},
        {"text": "Option 3", "isCorrect": false},
        {"text": "Option 4", "isCorrect": false},
        {"text": "Option 5", "isCorrect": false}
      ],
      "difficultyLevel": "advanced",
      "category": "Catégorie",
      "explanation": "Explication en français"
    }
  ]
}

Assure-toi que le JSON est valide et complet. NE TRONQUE PAS ou ne laisse PAS le JSON incomplet.`;
  
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Génère un JSON contenant EXACTEMENT ${sectionConfig.count} questions pour : ${sectionConfig.prompt}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });
  
      let content = response.choices[0].message.content;
      
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        console.error('Contenu brut reçu:', content);
        throw new Error(`Format JSON invalide : ${parseError.message}`);
      }
  
      if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
        throw new Error('Format JSON invalide : questions manquantes');
      }
  
      let questions = parsedContent.questions;
      if (questions.length > sectionConfig.count) {
        questions = questions.slice(0, sectionConfig.count);
      } else if (questions.length < sectionConfig.count) {
        throw new Error(`Nombre insuffisant de questions : ${questions.length}`);
      }
  
      const validQuestions = questions.filter(question => this._validateQuestionFormat(question));
  
      if (validQuestions.length !== sectionConfig.count) {
        throw new Error(`Nombre de questions valides incorrect : ${validQuestions.length}`);
      }
  
      return validQuestions;
  
    } catch (error) {
      console.error('Erreur génération section:', error);
      throw error;
    }
  }

  _generateFallbackQuestions(count) {
    return Array.from({ length: count }, (_, index) => ({
      questionText: `Question de secours ${index + 1}`,
      type: "multiple_choice",
      options: [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false},
        {"text": "Option E", "isCorrect": false}
      ],
      difficultyLevel: "intermediate",
      category: "Secours",
      explanation: "Question de secours générée en raison d'une erreur de génération"
    }));
  }

  _validateQuestionFormat(question) {
    try {
      // Normaliser le niveau de difficulté
      const difficultyMap = {
        'basic': 'beginner',
        'easy': 'beginner',
        'medium': 'intermediate',
        'hard': 'advanced',
        'expert': 'advanced'
      };
  
      // Normaliser le niveau de difficulté si nécessaire
      if (question.difficultyLevel) {
        question.difficultyLevel = difficultyMap[question.difficultyLevel.toLowerCase()] || 'intermediate';
      }
  
      return typeof question.questionText === 'string' &&
        question.questionText.trim() !== '' &&
        question.type === 'multiple_choice' &&
        Array.isArray(question.options) &&
        question.options.length === 5 &&
        question.options.every(opt => 
          typeof opt === 'object' &&
          typeof opt.text === 'string' &&
          typeof opt.isCorrect === 'boolean'
        ) &&
        question.options.filter(opt => opt.isCorrect).length >= 1 &&
        question.options.filter(opt => opt.isCorrect).length <= 2 &&
        typeof question.difficultyLevel === 'string' &&
        ['beginner', 'intermediate', 'advanced'].includes(question.difficultyLevel) &&
        typeof question.category === 'string' &&
        typeof question.explanation === 'string' &&
        question.explanation.trim() !== '';
    } catch (e) {
      return false;
    }
  }

  // Les autres méthodes restent identiques au code original
  _buildTechnicalSectionPrompt(requirements) {
    return `Génère un JSON contenant ${this.sectionConfig.technical.questionCount} questions techniques en français sur:
      Technologies: ${requirements.skills.join(', ')}
      Les questions doivent couvrir l'ensemble des compétences techniques requises.`;
  }
  
  _buildToolsSectionPrompt(requirements) {
    return `Génère un JSON contenant ${this.sectionConfig.tools.questionCount} questions en français sur:
      Outils: ${requirements.tools.join(', ')}
      Les questions doivent évaluer la maîtrise pratique de ces outils.`;
  }
  
  _buildSituationalSectionPrompt(requirements) {
    return `Génère un JSON contenant ${this.sectionConfig.situational.questionCount} questions situationnelles en français
      pour un poste de ${requirements.description}.
      Les questions doivent présenter des scénarios réels pertinents pour ce poste.`;
  }

  _normalizeRequirements(requirements) {
    if (typeof requirements === 'string') {
      try {
        requirements = JSON.parse(requirements);
      } catch (e) {
        console.error('Erreur de parsing des requirements:', e);
        requirements = {};
      }
    }

    return {
      jobTitle: requirements.jobTitle || requirements.title || 'Non spécifié',  // Ajout de cette ligne
      description: requirements.jobDescription || requirements.description || '',
      skills: this._normalizeArray(requirements.requiredSkills || requirements.skills),
      tools: this._normalizeArray(requirements.requiredTools || requirements.tools),
      experience_years: this._mapExperienceLevel(requirements.experienceLevel) || Number(requirements.experience_years) || 0,
      education: Array.isArray(requirements.education) ? requirements.education : [],
      languages: Array.isArray(requirements.languages) ? requirements.languages : []
    };
  }

  _normalizeArray(value) {
    if (Array.isArray(value)) {
      return value.filter(item => item && item.trim());
    }
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  }

  _mapExperienceLevel(level) {
    const experienceMap = {
      'junior': 1,
      'mid': 3,
      'senior': 5,
      'expert': 8
    };
    return experienceMap[level?.toLowerCase()] || 0;
  }

  async storeRequirement(requirementData) {
    try {
      const normalizedRequirements = this._normalizeRequirements(requirementData);
      
      const requirement = new Requirement({
        jobTitle: normalizedRequirements.jobTitle || 'Non spécifié',  // Ajout de cette ligne
        jobDescription: normalizedRequirements.description || 'Non spécifié',
        skills: normalizedRequirements.skills || [],
        tools: normalizedRequirements.tools || [],
        experience_years: normalizedRequirements.experience_years || 0,
        education: normalizedRequirements.education || [],
        languages: normalizedRequirements.languages || []
      });
      
      await requirement.save();
      return requirement;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des requirements:', error);
      throw new Error(`Échec de la sauvegarde des requirements: ${error.message}`);
    }
  }
}

module.exports = new QuizGeneratorService();