const Anthropic = require('@anthropic-ai/sdk');
const Quiz = require('../models/Quiz');
const Requirement = require('../models/Requirement');
const QuizSubmission = require('../models/QuizSubmission'); 
const QuestionBank = require('../models/QuestionBank');

class QuizGeneratorService {
  constructor() {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    this.sectionConfig = {
      technical: { title: "Compétences Techniques", questionCount: 15 },
      tools: { title: "Maîtrise des Outils", questionCount: 10 },
      situational: { title: "Questions Situationnelles", questionCount: 5 }
    };
    
    // Configuration de la difficulté des questions selon le niveau d'expérience
    this.experienceLevelConfig = {
      junior: {
        difficultyRatio: { beginner: 0.6, intermediate: 0.3, advanced: 0.1 }
      },
      mid: {
        difficultyRatio: { beginner: 0.3, intermediate: 0.5, advanced: 0.2 }
      },
      senior: {
        difficultyRatio: { beginner: 0.1, intermediate: 0.4, advanced: 0.5 }
      }
    };
    
    // Préconstruction des prompts système au démarrage du service
    this.systemPrompts = {
      technical: this._buildBaseSystemPrompt(),
      tools: this._buildBaseSystemPrompt(),
      situational: this._buildBaseSystemPrompt()
    };
    
    // Préconstruction des templates de prompts utilisateur pour chaque type de section
    this.userPromptTemplates = {
      technical: this._buildTechnicalPromptTemplate(),
      tools: this._buildToolsPromptTemplate(),
      situational: this._buildSituationalPromptTemplate()
    };
  }

  // Méthode pour construire le prompt système de base utilisé pour toutes les sections
  _buildBaseSystemPrompt() {
    return `Expert en création de quiz techniques.
  
RÈGLES:
- IMPORTANT: Générer EXACTEMENT <COUNT> questions en français
- 5 options par question
- 1-2 réponses correctes
- Difficulté: <DIFFICULTY_RATIO>
- Niveaux: "beginner", "intermediate", "advanced"
- IMPORTANT: Retourner UNIQUEMENT le JSON pur sans aucune balise markdown, sans \`\`\`json ou \`\`\` autour du JSON
  
FORMAT JSON:
{
  "questions": [
    {
      "questionText": "Question",
      "type": "multiple_choice",
      "options": [
        {"text": "Option 1", "isCorrect": false},
        {"text": "Option 2", "isCorrect": true},
        {"text": "Option 3", "isCorrect": false},
        {"text": "Option 4", "isCorrect": false},
        {"text": "Option 5", "isCorrect": false}
      ],
      "difficultyLevel": "intermediate",
      "category": "Catégorie",
      "explanation": "Explication"
    }
  ]
}`;
  }
  
  // Templates pour les prompts utilisateur par type de section
  _buildTechnicalPromptTemplate() {
    return `Génère EXACTEMENT <COUNT> questions techniques en français sur:
<CONTENT>
Niveau: <LEVEL_NAME>

<ADDITIONAL_INSTRUCTIONS>`;
  }
  
  _buildToolsPromptTemplate() {
    return `Génère EXACTEMENT <COUNT> questions en français sur:
Outils: <TOOLS>
Niveau: <LEVEL_NAME>

<ADDITIONAL_INSTRUCTIONS>`;
  }
  
  _buildSituationalPromptTemplate() {
    return `Génère EXACTEMENT <COUNT> questions situationnelles en français
pour un poste de <DESCRIPTION>.
Niveau: <LEVEL_NAME>
<CONTEXT>

INSTRUCTIONS IMPORTANTES:
- Chaque question DOIT présenter un problème concret à résoudre qui serait typique dans le cadre du poste.
<SPECIFIC_INSTRUCTIONS>
- Les options de réponse doivent représenter différentes approches pour résoudre le problème.
- Les questions doivent être adaptées au niveau <LEVEL_NAME>, avec des problèmes plus complexes pour les niveaux Senior.`;
  }

  async generateStandardQuiz(requirements, options = {}) {
    try {
      // Options par défaut pour l'utilisation de la banque de questions
      const quizOptions = {
        useQuestionBank: options.useQuestionBank !== false, // Par défaut, utiliser la banque
        preferBankQuestions: options.preferBankQuestions === true, // Préférer les questions de la banque même si incomplètes
        minBankUsagePercent: options.minBankUsagePercent || 0, // Pourcentage minimum d'utilisation de la banque
        bankOnly: options.bankOnly === true // Utiliser uniquement la banque de questions
      };
      
      // Statistiques d'utilisation de la banque
      const bankUsageStats = {
        totalRequiredQuestions: 0,
        totalBankQuestionsUsed: 0,
        bankUsagePercent: 0,
        sectionStats: {},
        subcategoryStats: {}
      };
  
      // Normaliser les requirements une seule fois et les réutiliser
      const normalizedRequirements = this._normalizeRequirements(requirements);
      const requirementDoc = requirements._id ? requirements : await this.storeRequirement(normalizedRequirements);
  
      // Récupérer le niveau d'expérience pour la difficulté (une seule fois)
      const experienceLevel = normalizedRequirements.experienceLevel || 'mid';
      const difficultyRatio = this.experienceLevelConfig[experienceLevel]?.difficultyRatio 
        || this.experienceLevelConfig.mid.difficultyRatio;
  
      // Préanalyse des données pour déterminer quelles sections générer
      const sectionInfo = this._analyzeSectionsToGenerate(normalizedRequirements);
      const sectionTypes = this._prepareSectionTypes(sectionInfo, normalizedRequirements, difficultyRatio);
      
      // Vérifier qu'il y a au moins une section à générer
      if (sectionTypes.length === 0) {
        throw new Error("Impossible de générer un quiz : aucune section valide car les données requises sont manquantes");
      }
      
      // Pour chaque section, ajouter les informations sur les compétences/outils
      sectionTypes.forEach(section => {
        if (section.type === 'technical') {
          section.skills = normalizedRequirements.skills || [];
        } else if (section.type === 'tools') {
          section.tools = normalizedRequirements.tools || [];
        }
        
        // Ajouter le niveau d'expérience
        section.experienceLevel = experienceLevel;
      });
      
      // Si on demande uniquement des questions de la banque, vérifier la disponibilité
      if (quizOptions.bankOnly) {
        let totalRequiredQuestions = 0;
        let availableQuestions = 0;
        
        // Vérifier la disponibilité des questions pour chaque section
        for (const section of sectionTypes) {
          totalRequiredQuestions += section.count;
          
          // Préparer les sous-catégories pour cette section
          const subcategories = [];
          if (section.type === 'technical' && section.skills && section.skills.length > 0) {
            subcategories.push(...section.skills.map(skill => skill.toLowerCase()));
          } else if (section.type === 'tools' && section.tools && section.tools.length > 0) {
            subcategories.push(...section.tools.map(tool => tool.toLowerCase()));
          }
          
          // Si nous avons des sous-catégories, compter les questions par sous-catégorie
          if (subcategories.length > 0) {
            for (const subcategory of subcategories) {
              const count = await QuestionBank.countDocuments({ 
                category: section.type, 
                subcategory: subcategory 
              });
              
              availableQuestions += count;
              
              // Ajouter aux statistiques par sous-catégorie
              bankUsageStats.subcategoryStats[subcategory] = {
                category: section.type,
                required: Math.ceil(section.count / subcategories.length),
                available: count
              };
            }
          } else {
            // Sinon, compter les questions pour la catégorie principale
            const count = await QuestionBank.countDocuments({ category: section.type });
            availableQuestions += count;
          }
          
          // Ajouter aux statistiques par section
          bankUsageStats.sectionStats[section.type] = {
            required: section.count,
            available: availableQuestions,
            usagePercent: section.count > 0 ? Math.floor((availableQuestions / section.count) * 100) : 0
          };
        }
        
        // Mettre à jour les statistiques globales
        bankUsageStats.totalRequiredQuestions = totalRequiredQuestions;
        bankUsageStats.availableBankQuestions = availableQuestions;
        bankUsageStats.bankUsagePercent = totalRequiredQuestions > 0 
          ? Math.floor((availableQuestions / totalRequiredQuestions) * 100)
          : 0;
        
        // Si pas assez de questions et qu'on demande uniquement des questions de la banque
        if (availableQuestions < totalRequiredQuestions) {
          console.log(`Mode banque uniquement: ${availableQuestions}/${totalRequiredQuestions} questions disponibles (${bankUsageStats.bankUsagePercent}%)`);
          return { bankUsageStats };
        }
      }
  
      // Génération optimisée section par section avec gestion des erreurs
      const generateSectionWithRetry = async (section) => {
        let attempts = 0;
        const maxAttempts = 3;
        let bankQuestionsUsed = 0;
        
        while (attempts < maxAttempts) {
          try {
            console.log(`Génération de la section ${section.type}, tentative ${attempts + 1}...`);
            
            // Ajouter l'option d'utilisation de la banque de questions
            section.useQuestionBank = quizOptions.useQuestionBank;
            section.preferBankQuestions = quizOptions.preferBankQuestions;
            section.bankOnly = quizOptions.bankOnly;
            
            // Générer les questions avec utilisation possible de la banque
            const result = await this._generateSectionOptimized(section);
            
            if (!result || !result.questions || result.questions.length !== section.count) {
              throw new Error(`Nombre incorrect de questions générées pour ${section.type}: ${result?.questions?.length || 0}/${section.count}`);
            }
            
            // Mettre à jour les statistiques d'utilisation de la banque
            bankQuestionsUsed = result.bankQuestionsUsed || 0;
            bankUsageStats.sectionStats[section.type] = {
              required: section.count,
              fromBank: bankQuestionsUsed,
              generated: section.count - bankQuestionsUsed,
              usagePercent: Math.floor((bankQuestionsUsed / section.count) * 100)
            };
            bankUsageStats.totalBankQuestionsUsed += bankQuestionsUsed;
            
            // Collecter les statistiques par sous-catégorie
            const subcategoryCounts = {};
            result.questions.forEach(question => {
              if (question.subcategory) {
                subcategoryCounts[question.subcategory] = (subcategoryCounts[question.subcategory] || 0) + 1;
              }
            });
            
            // Ajouter aux statistiques
            Object.entries(subcategoryCounts).forEach(([subcategory, count]) => {
              bankUsageStats.subcategoryStats[subcategory] = {
                ...bankUsageStats.subcategoryStats[subcategory],
                used: count
              };
            });
            
            return {
              title: section.title,
              description: `Section ${section.title} du quiz`,
              questions: result.questions
            };
          } catch (error) {
            console.error(`Erreur génération section ${section.type}, tentative ${attempts + 1}:`, error);
            attempts++;
            
            if (attempts === maxAttempts) {
              throw new Error(`Échec de la génération des questions pour la section ${section.type} après ${maxAttempts} tentatives`);
            }
            
            // Attente exponentielle entre les tentatives
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          }
        }
      };
  
      // Exécuter les générations en parallèle pour de meilleures performances
      console.log(`Génération optimisée de ${sectionTypes.length} sections en parallèle...`);
      const sectionPromises = sectionTypes.map(section => generateSectionWithRetry(section));
      const sections = await Promise.all(sectionPromises);
  
      // Calculer le pourcentage global d'utilisation de la banque
      bankUsageStats.totalRequiredQuestions = sectionTypes.reduce((sum, section) => sum + section.count, 0);
      bankUsageStats.bankUsagePercent = bankUsageStats.totalRequiredQuestions > 0 
        ? Math.floor((bankUsageStats.totalBankQuestionsUsed / bankUsageStats.totalRequiredQuestions) * 100)
        : 0;
  
      const quiz = new Quiz({
        title: `Évaluation poste - ${normalizedRequirements.jobTitle}`,
        description: `Quiz pour évaluer le candidat sur: ${normalizedRequirements.description}`,
        type: 'standard',
        requirement: requirementDoc._id,
        requirementData: {
          jobTitle: normalizedRequirements.jobTitle,
          description: requirementDoc.jobDescription || normalizedRequirements.description,
          skills: normalizedRequirements.skills,
          tools: normalizedRequirements.tools,
          experience_years: normalizedRequirements.experience_years,
          experienceLevel: normalizedRequirements.experienceLevel,
          education: normalizedRequirements.education,
          languages: normalizedRequirements.languages
        },
        sections,
        timeLimit: 45,
        passingScore: 70,
        // Ajouter des métadonnées sur l'utilisation de la banque
        metadata: {
          bankQuestionsUsed: bankUsageStats.totalBankQuestionsUsed,
          bankUsagePercent: bankUsageStats.bankUsagePercent,
          subcategoriesUsed: Object.keys(bankUsageStats.subcategoryStats)
        },
        recruiter: options.recruiter ? {
          _id: options.recruiter._id,
          email: options.recruiter.email
        } : undefined
      });
  
      await quiz.save();
      return { quiz, bankUsageStats };
  
    } catch (error) {
      console.error('Erreur génération quiz:', error);
      throw new Error(`Échec de la génération du quiz: ${error.message}`);
    }
  }
  
  // Nouvelle méthode pour préanalyser les données et déterminer quelles sections générer
  _analyzeSectionsToGenerate(normalizedRequirements) {
    return {
      hasTechnicalData: Boolean(normalizedRequirements.description || (normalizedRequirements.skills && normalizedRequirements.skills.length > 0)),
      hasToolsData: Boolean(normalizedRequirements.tools && normalizedRequirements.tools.length > 0),
      hasSituationalPotential: Boolean(normalizedRequirements.description)
    };
  }
  
  // Nouvelle méthode pour préparer les configurations de sections basées sur l'analyse
  _prepareSectionTypes(sectionInfo, normalizedRequirements, difficultyRatio) {
    const sectionTypes = [];
    
    // Section technique : basée sur les compétences OU sur la description
    if (sectionInfo.hasTechnicalData) {
      sectionTypes.push({
        type: 'technical',
        count: this.sectionConfig.technical.questionCount,
        title: this.sectionConfig.technical.title,
        prompt: this._buildTechnicalSectionPrompt(normalizedRequirements),
        difficultyRatio
      });
    }
    
    // Section outils : uniquement si des outils sont spécifiés
    if (sectionInfo.hasToolsData) {
      sectionTypes.push({
        type: 'tools',
        count: this.sectionConfig.tools.questionCount,
        title: this.sectionConfig.tools.title,
        prompt: this._buildToolsSectionPrompt(normalizedRequirements),
        difficultyRatio
      });
    }
    
    // Section situationnelle : basée sur la description
    if (sectionInfo.hasSituationalPotential) {
      sectionTypes.push({
        type: 'situational',
        count: this.sectionConfig.situational.questionCount,
        title: this.sectionConfig.situational.title,
        prompt: this._buildSituationalSectionPrompt(normalizedRequirements),
        difficultyRatio
      });
    }
    
    return sectionTypes;
  }

  // Méthode optimisée qui utilise les templates préchargés
  async _generateSectionOptimized(sectionConfig) {
    try {
      // Déterminer la catégorie pour cette section
      const sectionCategory = sectionConfig.type.toLowerCase(); // 'technical', 'tools', 'situational'
      
      // Statistiques d'utilisation de la banque
      let bankQuestionsUsed = 0;
      let questions = [];
      let questionBankIds = []; // Pour stocker les IDs des questions de la banque
      
      // Vérifier si nous devons utiliser la banque de questions
      if (sectionConfig.useQuestionBank !== false) {
        // Obtenir les sous-catégories pertinentes pour cette section
        const subcategories = [];
        
        // Si nous avons des technologies/compétences spécifiques pour la section 'technical'
        if (sectionCategory === 'technical' && sectionConfig.skills && sectionConfig.skills.length > 0) {
          // Ajouter chaque compétence comme sous-catégorie (en minuscules pour uniformité)
          subcategories.push(...sectionConfig.skills.map(skill => skill.toLowerCase()));
        }
        
        // Si nous avons des outils spécifiques pour la section 'tools'
        if (sectionCategory === 'tools' && sectionConfig.tools && sectionConfig.tools.length > 0) {
          // Ajouter chaque outil comme sous-catégorie (en minuscules)
          subcategories.push(...sectionConfig.tools.map(tool => tool.toLowerCase()));
        }
        
        console.log(`Section ${sectionCategory} avec sous-catégories:`, subcategories);
        
        // S'il y a des sous-catégories, on récupère des questions pour chacune d'entre elles
        if (subcategories.length > 0) {
          // Calculer combien de questions par sous-catégorie
          const questionsPerSubcategory = Math.ceil(sectionConfig.count / subcategories.length);
          
          // Récupérer des questions pour chaque sous-catégorie
          for (const subcategory of subcategories) {
            const bankCriteria = {
              category: sectionCategory,
              subcategory: subcategory,
              difficultyRatio: sectionConfig.difficultyRatio
            };
            
            // Compter les questions disponibles pour cette sous-catégorie
            const availableCount = await QuestionBank.countDocuments({ 
              category: sectionCategory,
              subcategory: subcategory
            });
            
            console.log(`Sous-catégorie ${subcategory}: ${availableCount} questions disponibles, ${questionsPerSubcategory} requises`);
            
            // Si nous avons des questions pour cette sous-catégorie
            if (availableCount > 0) {
              // Récupérer les questions
              const subcategoryQuestions = await this._retrieveQuestionsFromBank(
                bankCriteria,
                Math.min(questionsPerSubcategory, availableCount)
              );
              
              // Ajouter ces questions à notre liste
              questions.push(...subcategoryQuestions);
              
              // Mettre à jour notre compteur et la liste des IDs
              bankQuestionsUsed += subcategoryQuestions.length;
              questionBankIds.push(...subcategoryQuestions.map(q => q._id));
              
              console.log(`Récupéré ${subcategoryQuestions.length} questions pour sous-catégorie ${subcategory}`);
            }
          }
        } else {
          // Pas de sous-catégories spécifiques, récupérer des questions par catégorie principale
          const bankCriteria = {
            category: sectionCategory,
            difficultyRatio: sectionConfig.difficultyRatio
          };
          
          // Compter les questions disponibles
          const availableCount = await QuestionBank.countDocuments({ category: sectionCategory });
          
          console.log(`Section ${sectionCategory} (sans sous-catégories): ${availableCount} questions disponibles, ${sectionConfig.count} requises`);
          
          if (availableCount > 0) {
            // Récupérer les questions
            const categoryQuestions = await this._retrieveQuestionsFromBank(
              bankCriteria,
              Math.min(sectionConfig.count, availableCount)
            );
            
            // Ajouter ces questions à notre liste
            questions.push(...categoryQuestions);
            
            // Mettre à jour notre compteur et la liste des IDs
            bankQuestionsUsed += categoryQuestions.length;
            questionBankIds.push(...categoryQuestions.map(q => q._id));
            
            console.log(`Récupéré ${categoryQuestions.length} questions pour catégorie ${sectionCategory}`);
          }
        }
      }
      
      // Si mode banque uniquement et pas assez de questions, retourner ce que nous avons
      if (sectionConfig.bankOnly && questions.length < sectionConfig.count) {
        console.log(`Mode banque uniquement: impossible de compléter la section ${sectionCategory}, retour des ${questions.length} questions disponibles`);
        return { 
          questions,
          bankQuestionsUsed,
          complete: false
        };
      }
      
      // S'il nous manque des questions et que nous ne sommes pas en mode banque uniquement, générer les questions manquantes
      if (questions.length < sectionConfig.count && !sectionConfig.bankOnly) {
        console.log(`Génération de nouvelles questions pour la section ${sectionConfig.type} (${sectionConfig.count - questions.length} nécessaires)`);
        
        // Le nombre de questions à générer
        const generateCount = sectionConfig.count - questions.length;
        
        // Récupérer les sous-catégories pour lesquelles nous avons besoin de questions supplémentaires
        const subcategories = [];
        
        if (sectionCategory === 'technical' && sectionConfig.skills && sectionConfig.skills.length > 0) {
          subcategories.push(...sectionConfig.skills.map(skill => skill.toLowerCase()));
        }
        
        if (sectionCategory === 'tools' && sectionConfig.tools && sectionConfig.tools.length > 0) {
          subcategories.push(...sectionConfig.tools.map(tool => tool.toLowerCase()));
        }
        
        // Si nous avons des sous-catégories, générer des questions pour chacune
        if (subcategories.length > 0) {
          // Pour chaque sous-catégorie, calculer combien de questions manquantes
          const existingQuestionsBySubcategory = {};
          
          // Compter les questions existantes par sous-catégorie
          for (const question of questions) {
            const subcat = question.subcategory?.toLowerCase();
            if (subcat && subcategories.includes(subcat)) {
              existingQuestionsBySubcategory[subcat] = (existingQuestionsBySubcategory[subcat] || 0) + 1;
            }
          }
          
          // Calculer combien de questions idéalement par sous-catégorie
          const idealQuestionsPerSubcategory = Math.ceil(sectionConfig.count / subcategories.length);
          
          // Pour chaque sous-catégorie, générer les questions manquantes
          for (const subcategory of subcategories) {
            const existingCount = existingQuestionsBySubcategory[subcategory] || 0;
            const neededCount = Math.min(
              idealQuestionsPerSubcategory - existingCount,
              generateCount - (questions.length - bankQuestionsUsed) // Ne pas dépasser le total nécessaire
            );
            
            if (neededCount <= 0) continue;
            
            console.log(`Génération de ${neededCount} questions pour sous-catégorie ${subcategory}`);
            
            // Générer les questions pour cette sous-catégorie
            const subcategoryQuestions = await this._generateQuestionsForSubcategory(
              sectionConfig,
              subcategory,
              neededCount
            );
            
            // Si des questions ont été générées
            if (subcategoryQuestions && subcategoryQuestions.length > 0) {
              // Stocker dans la banque avec la sous-catégorie appropriée
              try {
                const storeResult = await this._storeQuestionsInBank(
                  subcategoryQuestions, 
                  sectionCategory,
                  subcategory
                );
                
                // Si des questions ont été correctement stockées, récupérer leurs IDs
                if (storeResult && storeResult.upsertedIds) {
                  Object.values(storeResult.upsertedIds).forEach(id => {
                    questionBankIds.push(id);
                  });
                }
                
                console.log(`${storeResult?.upsertedCount || 0} nouvelles questions ajoutées à la banque pour sous-catégorie ${subcategory}`);
              } catch (storeError) {
                console.error(`Erreur lors du stockage des questions pour sous-catégorie ${subcategory}:`, storeError);
              }
              
              // Ajouter les questions générées à notre liste
              questions.push(...subcategoryQuestions);
            }
          }
        } else {
          // Pas de sous-catégories spécifiques, générer des questions générales
          const generatedQuestions = await this._generateQuestionsGeneric(
            sectionConfig,
            generateCount
          );
          
          // Si des questions ont été générées
          if (generatedQuestions && generatedQuestions.length > 0) {
            // Stocker dans la banque sans sous-catégorie spécifique
            try {
              const storeResult = await this._storeQuestionsInBank(
                generatedQuestions, 
                sectionCategory
              );
              
              // Si des questions ont été correctement stockées, récupérer leurs IDs
              if (storeResult && storeResult.upsertedIds) {
                Object.values(storeResult.upsertedIds).forEach(id => {
                  questionBankIds.push(id);
                });
              }
              
              console.log(`${storeResult?.upsertedCount || 0} nouvelles questions génériques ajoutées à la banque pour catégorie ${sectionCategory}`);
            } catch (storeError) {
              console.error(`Erreur lors du stockage des questions génériques:`, storeError);
            }
            
            // Ajouter les questions générées à notre liste
            questions.push(...generatedQuestions);
          }
        }
      }
      
      // S'assurer d'avoir exactement le nombre demandé de questions
      questions = questions.slice(0, sectionConfig.count);
      
      if (questions.length < sectionConfig.count) {
        throw new Error(`Nombre insuffisant de questions valides pour section ${sectionConfig.type}: ${questions.length}/${sectionConfig.count}`);
      }
      
      // Ajouter la référence à la question dans la banque pour chaque question (pour mise à jour des statistiques)
      if (questionBankIds.length > 0) {
        for (let i = 0; i < Math.min(questions.length, questionBankIds.length); i++) {
          questions[i].questionBankId = questionBankIds[i];
        }
      }
      
      return { 
        questions,
        bankQuestionsUsed,
        complete: true
      };
      
    } catch (error) {
      console.error(`Erreur génération section ${sectionConfig.type}:`, error);
      throw error;
    }
  }
  
  // Méthode existante maintenue pour compatibilité - elle appelle l'implémentation optimisée
  async _generateSection(sectionConfig) {
    console.warn("ATTENTION: La méthode _generateSection est depreciée. Utilisez _generateSectionOptimized directement.");
    return this._generateSectionOptimized(sectionConfig);
  }
  
  _generateExperienceLevelPrompt(difficultyRatio) {
    return `${Math.round(difficultyRatio.beginner * 100)}% débutant, ${Math.round(difficultyRatio.intermediate * 100)}% intermédiaire, ${Math.round(difficultyRatio.advanced * 100)}% avancé`;
  }
  
  _normalizeQuestion(question) {
    // Normaliser le niveau de difficulté
    const difficultyMap = {
      'basic': 'beginner',
      'easy': 'beginner',
      'débutant': 'beginner',
      'facile': 'beginner',
      'medium': 'intermediate',
      'moyen': 'intermediate',
      'intermédiaire': 'intermediate',
      'hard': 'advanced',
      'difficile': 'advanced',
      'expert': 'advanced',
      'avancé': 'advanced'
    };
  
    // Normaliser le niveau de difficulté si nécessaire
    if (question.difficultyLevel) {
      question.difficultyLevel = difficultyMap[question.difficultyLevel.toLowerCase()] || question.difficultyLevel;
    }
    
    return question;
  }
  
  _adjustQuestionDifficultyDistribution(questions, targetRatio) {
    // Comptage initial des questions par niveau de difficulté
    const currentDifficultyCount = {
      beginner: questions.filter(q => q.difficultyLevel === 'beginner').length,
      intermediate: questions.filter(q => q.difficultyLevel === 'intermediate').length,
      advanced: questions.filter(q => q.difficultyLevel === 'advanced').length
    };
    
    console.log("Distribution initiale:", currentDifficultyCount);
    
    const totalQuestions = questions.length;
    
    // Calculer le nombre cible de questions par niveau
    const targetCount = {
      beginner: Math.round(totalQuestions * targetRatio.beginner),
      intermediate: Math.round(totalQuestions * targetRatio.intermediate),
      advanced: Math.round(totalQuestions * targetRatio.advanced)
    };
    
    // Ajuster si la somme n'est pas égale au total (à cause des arrondis)
    const sumTargetCount = targetCount.beginner + targetCount.intermediate + targetCount.advanced;
    if (sumTargetCount !== totalQuestions) {
      const diff = totalQuestions - sumTargetCount;
      if (diff > 0) {
        targetCount.intermediate += diff;
      } else {
        if (targetCount.intermediate + diff >= 0) {
          targetCount.intermediate += diff;
        } else {
          targetCount.beginner += diff;
        }
      }
    }
    
    console.log("Distribution cible:", targetCount);
    
    // Copie des questions originales
    const adjustedQuestions = [...questions];
    
    // Marquer manuellement les questions selon les ratios souhaités
    // Réinitialiser tous les niveaux de difficulté à beginner par défaut
    adjustedQuestions.forEach(q => q.difficultyLevel = 'beginner');
    
    // Maintenant, marquer les questions intermédiaires
    for (let i = 0; i < targetCount.intermediate; i++) {
      if (i < adjustedQuestions.length) {
        adjustedQuestions[targetCount.beginner + i].difficultyLevel = 'intermediate';
      }
    }
    
    // Enfin, marquer les questions avancées
    for (let i = 0; i < targetCount.advanced; i++) {
      if (targetCount.beginner + targetCount.intermediate + i < adjustedQuestions.length) {
        adjustedQuestions[targetCount.beginner + targetCount.intermediate + i].difficultyLevel = 'advanced';
      }
    }
    
    // Vérifier la distribution finale
    const finalDifficultyCount = {
      beginner: adjustedQuestions.filter(q => q.difficultyLevel === 'beginner').length,
      intermediate: adjustedQuestions.filter(q => q.difficultyLevel === 'intermediate').length,
      advanced: adjustedQuestions.filter(q => q.difficultyLevel === 'advanced').length
    };
    
    console.log("Distribution finale:", finalDifficultyCount);
    
    return adjustedQuestions;
}

  _validateQuestionFormat(question) {
    try {
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

  _buildTechnicalSectionPrompt(requirements) {
    const experienceLevel = requirements.experienceLevel || 'mid';
    const levelName = experienceLevel === 'junior' ? 'Junior' : experienceLevel === 'senior' ? 'Senior' : 'Intermédiaire';
    
    // Utiliser le template préchargé et le remplir avec les valeurs spécifiques
    let prompt = this.userPromptTemplates.technical;
    
    // Si des compétences sont spécifiées, on se concentre dessus
    if (requirements.skills && requirements.skills.length > 0) {
      prompt = prompt
        .replace('<COUNT>', this.sectionConfig.technical.questionCount.toString())
        .replace('<CONTENT>', `Technologies: ${requirements.skills.join(', ')}`)
        .replace('<LEVEL_NAME>', levelName)
        .replace('<ADDITIONAL_INSTRUCTIONS>', 'Les questions doivent couvrir l\'ensemble des compétences techniques listées ci-dessus et être adaptées au niveau indiqué.');
    } 
    // Sinon, on se base sur la description du poste pour déduire les compétences techniques à tester
    else {
      prompt = prompt
        .replace('<COUNT>', this.sectionConfig.technical.questionCount.toString())
        .replace('<CONTENT>', `Poste: ${requirements.jobTitle}\nDescription: ${requirements.description}`)
        .replace('<LEVEL_NAME>', levelName)
        .replace('<ADDITIONAL_INSTRUCTIONS>', `INSTRUCTIONS IMPORTANTES:
- Analyser la description du poste pour identifier les compétences techniques probablement requises.
- Créer des questions techniques pertinentes qui évaluent ces compétences déduites.
- Les questions doivent être adaptées au niveau ${levelName}.
- Couvrir un éventail équilibré de compétences techniques pertinentes pour ce type de poste.
- Inclure des questions sur les concepts fondamentaux et les meilleures pratiques du domaine.`);
    }
    
    return prompt;
  }
  
  _buildToolsSectionPrompt(requirements) {
    const experienceLevel = requirements.experienceLevel || 'mid';
    const levelName = experienceLevel === 'junior' ? 'Junior' : experienceLevel === 'senior' ? 'Senior' : 'Intermédiaire';
    
    // Utiliser le template préchargé et le remplir avec les valeurs spécifiques
    let prompt = this.userPromptTemplates.tools;
    
    // Si des outils sont spécifiés, on se concentre dessus
    if (requirements.tools && requirements.tools.length > 0) {
      prompt = prompt
        .replace('<COUNT>', this.sectionConfig.tools.questionCount.toString())
        .replace('<TOOLS>', requirements.tools.join(', '))
        .replace('<LEVEL_NAME>', levelName)
        .replace('<ADDITIONAL_INSTRUCTIONS>', 'Les questions doivent évaluer la maîtrise pratique de ces outils spécifiques et être adaptées au niveau indiqué.');
    } 
    // Cas improbable avec cette implémentation, mais gardé pour cohérence
    else {
      prompt = prompt
        .replace('<COUNT>', this.sectionConfig.tools.questionCount.toString())
        .replace('<TOOLS>', 'pertinents pour un poste de ' + requirements.jobTitle)
        .replace('<LEVEL_NAME>', levelName)
        .replace('<ADDITIONAL_INSTRUCTIONS>', `INSTRUCTIONS IMPORTANTES:
- Analyser la description du poste pour identifier les outils probablement utilisés dans ce type de poste.
- Créer des questions qui évaluent la maîtrise pratique de ces outils déduits de la description.
- Les questions doivent couvrir différents aspects de l'utilisation de ces outils.
- Les questions doivent être adaptées au niveau ${levelName}.
- Inclure des outils qui sont standards dans l'industrie pour ce type de poste.`);
    }
    
    return prompt;
  }
  _buildSituationalSectionPrompt(requirements) {
    const experienceLevel = requirements.experienceLevel || 'mid';
    const levelName = experienceLevel === 'junior' ? 'Junior' : experienceLevel === 'senior' ? 'Senior' : 'Intermédiaire';
    
    // Préparer le contexte en fonction des données disponibles
    let contexte = "";
    let instructionsSpecifiques = "";
    
    // Si des compétences sont spécifiées
    if (requirements.skills && requirements.skills.length > 0) {
      contexte += `Compétences: ${requirements.skills.join(', ')}\n`;
      instructionsSpecifiques += "- Le problème doit explicitement nécessiter l'utilisation d'au moins une compétence spécifique listée ci-dessus.\n";
    }
    
    // Si des outils sont spécifiés
    if (requirements.tools && requirements.tools.length > 0) {
      contexte += `Outils: ${requirements.tools.join(', ')}\n`;
      instructionsSpecifiques += "- Intégrer l'utilisation d'au moins un des outils spécifiés dans les scénarios lorsque pertinent.\n";
    }
    
    // Si ni compétences ni outils ne sont spécifiés
    if ((!requirements.skills || requirements.skills.length === 0) && 
        (!requirements.tools || requirements.tools.length === 0)) {
      instructionsSpecifiques += "- Analyser la description du poste pour identifier les compétences et outils probablement requis.\n";
      instructionsSpecifiques += "- Créer des scénarios qui évaluent ces compétences et l'utilisation de ces outils.\n";
    }
    
    // Utiliser le template préchargé et le remplir avec les valeurs spécifiques
    let prompt = this.userPromptTemplates.situational;
    prompt = prompt
      .replace('<COUNT>', this.sectionConfig.situational.questionCount.toString())
      .replace('<DESCRIPTION>', requirements.description)
      .replace('<LEVEL_NAME>', levelName)
      .replace('<CONTEXT>', contexte)
      .replace('<SPECIFIC_INSTRUCTIONS>', instructionsSpecifiques);
    
    // Ajouter les exemples de formulation
    prompt += `
- Exemples de formulation:
  * "En tant que [poste], vous êtes confronté à [problème spécifique]. Comment résoudriez-vous cette situation?"
  * "Un client signale [problème concret]. Quelle approche adopteriez-vous pour résoudre ce problème?"
- Les scénarios doivent être pertinents, réalistes et spécifiques au secteur d'activité.
- Les problèmes doivent tester à la fois les connaissances techniques ET la capacité à appliquer ces connaissances dans un contexte pratique.`;
    
    return prompt;
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
      jobTitle: requirements.jobTitle || requirements.title || 'Non spécifié',
      description: requirements.jobDescription || requirements.description || '',
      skills: this._normalizeArray(requirements.requiredSkills || requirements.skills),
      tools: this._normalizeArray(requirements.requiredTools || requirements.tools),
      experienceLevel: requirements.experienceLevel || 'mid',
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
    return level && typeof level === 'string' ? (experienceMap[level.toLowerCase()] || 0) : 0;
  }

  async storeRequirement(requirementData) {
    try {
      const normalizedRequirements = this._normalizeRequirements(requirementData);
      
      const requirement = new Requirement({
        jobTitle: normalizedRequirements.jobTitle || 'Non spécifié',
        jobDescription: normalizedRequirements.description || 'Non spécifié',
        skills: normalizedRequirements.skills || [],
        tools: normalizedRequirements.tools || [],
        experienceLevel: normalizedRequirements.experienceLevel || 'mid',
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

  async evaluateQuizSubmission(quizId, candidateId, answers) {
    try {
      // Récupérer le quiz avec les réponses correctes
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        throw new Error('Quiz non trouvé');
      }
      
      // Créer un nouveau modèle de soumission
      const submission = new QuizSubmission({
        quizId,
        candidateId,
        answers,
        submittedAt: new Date()
      });
      
      // Calculer le score
      let totalQuestions = 0;
      let correctAnswers = 0;
      
      quiz.sections.forEach(section => {
        section.questions.forEach(question => {
          totalQuestions++;
          
          // Vérifier si la réponse du candidat est correcte
          const candidateAnswer = answers.find(a => a.questionId.toString() === question._id.toString());
          if (candidateAnswer && this._isAnswerCorrect(question, candidateAnswer.answer)) {
            correctAnswers++;
          }
        });
      });
      
      // Calculer le pourcentage
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      
      // Mettre à jour et sauvegarder la soumission
      submission.score = score;
      submission.correctAnswers = correctAnswers;
      submission.totalQuestions = totalQuestions;
      
      await submission.save();
      
      // Mettre à jour les statistiques des questions dans la banque
      await this._updateQuestionSuccessRates(quizId, answers);
      
      return {
        submissionId: submission._id,
        score,
        correctAnswers,
        totalQuestions
      };
    } catch (error) {
      console.error('Erreur lors de l\'évaluation de la soumission du quiz:', error);
      throw new Error(`Échec de l'évaluation de la soumission: ${error.message}`);
    }
  }
  
  // Méthode helper corrigée pour vérifier si une réponse est correcte
_isAnswerCorrect(question, answer) {
  // Pour la structure actuelle des questions avec options/isCorrect
  if (question.options) {
    // Si c'est un choix unique (1 seule bonne réponse)
    if (typeof answer === 'string' || typeof answer === 'number') {
      // answer contient l'index ou l'ID de l'option choisie
      const selectedOption = question.options[answer] || question.options.find(opt => opt._id && opt._id.toString() === answer.toString());
      return selectedOption && selectedOption.isCorrect;
    }
    // Si c'est un choix multiple (potentiellement plusieurs bonnes réponses)
    else if (Array.isArray(answer)) {
      // Vérifier que chaque réponse sélectionnée est correcte
      const selectedOptions = answer.map(ans => {
        return typeof ans === 'number' 
          ? question.options[ans] 
          : question.options.find(opt => opt._id && opt._id.toString() === ans.toString());
      });
      
      // Vérifier que toutes les options sélectionnées sont correctes
      const allSelectedAreCorrect = selectedOptions.every(opt => opt && opt.isCorrect);
      
      // Vérifier que toutes les options correctes sont sélectionnées
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      const allCorrectAreSelected = correctOptions.every(correctOpt => 
        selectedOptions.some(selectedOpt => selectedOpt && 
          (selectedOpt === correctOpt || 
           (selectedOpt._id && correctOpt._id && selectedOpt._id.toString() === correctOpt._id.toString())
          )
        )
      );
      
      return allSelectedAreCorrect && allCorrectAreSelected;
    }
    return false;
  }
  
  // Conserver le code d'origine pour la rétrocompatibilité (au cas où)
  switch (question.type) {
    case 'singleChoice':
      return answer === question.correctAnswer;
    case 'multipleChoice':
      return JSON.stringify(answer.sort()) === JSON.stringify(question.correctAnswers.sort());
    case 'text':
      return answer.toLowerCase() === question.correctAnswer.toLowerCase();
    default:
      return false;
  }
}

  async getSubmissionResult(submissionId) {
    try {
      if (!submissionId) {
        throw new Error('ID de soumission requis');
      }
      
      // Récupérer la soumission avec ses détails
      const submission = await QuizSubmission.findById(submissionId);
      
      if (!submission) {
        throw new Error('Soumission non trouvée');
      }
      
      // Récupérer le quiz associé pour obtenir des informations supplémentaires
      const quiz = await Quiz.findById(submission.quizId);
      
      if (!quiz) {
        throw new Error('Quiz associé non trouvé');
      }
      
      // Construire un objet de résultat détaillé
      const result = {
        submissionId: submission._id,
        quizId: submission.quizId,
        candidateId: submission.candidateId,
        submittedAt: submission.submittedAt,
        score: submission.score,
        correctAnswers: submission.correctAnswers,
        totalQuestions: submission.totalQuestions,
        passingScore: quiz.passingScore,
        passed: submission.score >= quiz.passingScore,
        quizTitle: quiz.title,
        // Ajouter des détails par section si nécessaire
        sectionResults: this._calculateSectionResults(quiz, submission)
      };
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat de la soumission:', error);
      throw new Error(`Échec de la récupération du résultat: ${error.message}`);
    }
  }
  
  // Méthode helper pour calculer les résultats par section
  _calculateSectionResults(quiz, submission) {
    // Initialiser un objet pour stocker les résultats par section
    const sectionResults = [];
    
    // Parcourir chaque section du quiz
    quiz.sections.forEach(section => {
      let sectionQuestionCount = section.questions.length;
      let sectionCorrectCount = 0;
      
      // Parcourir chaque question de la section
      section.questions.forEach(question => {
        // Trouver la réponse correspondante dans la soumission
        const answer = submission.answers.find(a => a.questionId.toString() === question._id.toString());
        
        if (answer && this._isAnswerCorrect(question, answer.answer)) {
          sectionCorrectCount++;
        }
      });
      
      // Calculer le score pour cette section
      const sectionScore = sectionQuestionCount > 0 
        ? (sectionCorrectCount / sectionQuestionCount) * 100 
        : 0;
      
      // Ajouter les résultats de la section
      sectionResults.push({
        sectionTitle: section.title,
        correctAnswers: sectionCorrectCount,
        totalQuestions: sectionQuestionCount,
        score: sectionScore
      });
    });
    
    return sectionResults;
  }
/**
 * Stocke des questions dans la banque avec gestion améliorée des sous-catégories
 * @param {Array} questions - Liste des questions à stocker
 * @param {String} primaryCategory - Catégorie principale des questions (technical, tools, situational)
 * @param {String} subcategory - Sous-catégorie des questions (php, typescript, etc.)
 */
async _storeQuestionsInBank(questions, primaryCategory, subcategory = null) {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return;
  }
  
  const operations = questions.map(question => {
    // Déterminer la sous-catégorie
    // Si une sous-catégorie est spécifiée en paramètre, l'utiliser
    // Sinon, essayer d'extraire depuis la question elle-même
    // Si ce n'est pas possible, utiliser la catégorie de la question si elle est différente de la catégorie principale
    const effectiveSubcategory = subcategory || 
                                question.subcategory || 
                                (question.category !== primaryCategory ? question.category : null);
    
    // Créer un nouveau document pour la banque de questions
    const bankQuestion = {
      questionText: question.questionText,
      type: question.type,
      options: question.options,
      difficultyLevel: question.difficultyLevel,
      category: primaryCategory,
      subcategory: effectiveSubcategory,
      explanation: question.explanation
    };
    
    // Utiliser upsert pour éviter les doublons (basé sur le texte de la question)
    return {
      updateOne: {
        filter: { questionText: question.questionText },
        update: { $setOnInsert: bankQuestion },
        upsert: true
      }
    };
  });
  
  try {
    const result = await QuestionBank.bulkWrite(operations);
    console.log(`Banque de questions mise à jour: ${result.upsertedCount} nouvelles questions ajoutées (catégorie: ${primaryCategory}, sous-catégorie: ${subcategory || 'diverse'})`);
    return result;
  } catch (error) {
    console.error('Erreur lors du stockage des questions dans la banque:', error);
    // Ne pas propager l'erreur pour ne pas perturber le flux principal
    return null;
  }
}

/**
 * Récupère des questions de la banque selon des critères
 * @param {Object} criteria - Critères de recherche
 * @param {Number} count - Nombre de questions à récupérer
 */
async _retrieveQuestionsFromBank(criteria, count) {
  try {
    const {
      category,
      subcategory,
      difficultyRatio,
      excludeQuestionIds = []
    } = criteria;
    
    // Calculer combien de questions récupérer pour chaque niveau de difficulté
    const targetCount = {
      beginner: Math.round(count * difficultyRatio.beginner),
      intermediate: Math.round(count * difficultyRatio.intermediate),
      advanced: Math.round(count * difficultyRatio.advanced)
    };
    
    // Ajuster les compteurs pour correspondre au total
    const sumTargetCount = targetCount.beginner + targetCount.intermediate + targetCount.advanced;
    if (sumTargetCount !== count) {
      const diff = count - sumTargetCount;
      if (diff > 0) {
        targetCount.intermediate += diff;
      } else {
        targetCount.intermediate += diff;
      }
    }
    
    // Préparer la requête de base
    const baseQuery = {
      category: category
    };
    
    if (subcategory) {
      baseQuery.$or = [
        { subcategory: subcategory },
        { subcategory: { $exists: false } }
      ];
    }
    
    // Exclure les questions déjà utilisées
    if (excludeQuestionIds.length > 0) {
      baseQuery._id = { $nin: excludeQuestionIds };
    }
    
    // Récupérer les questions pour chaque niveau de difficulté
    const questions = [];
    
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      if (targetCount[level] > 0) {
        const levelQuery = { ...baseQuery, difficultyLevel: level };
        
        // Récupérer un peu plus que nécessaire pour avoir de la diversité
        const fetchCount = Math.min(targetCount[level] * 2, targetCount[level] + 5);
        
        const levelQuestions = await QuestionBank.find(levelQuery)
          .sort({ lastUsed: 1, usageCount: 1 })
          .limit(fetchCount);
        
        // Sélectionner aléatoirement le nombre requis si nous en avons plus
        const selectedQuestions = this._getRandomSubset(levelQuestions, targetCount[level]);
        questions.push(...selectedQuestions);
      }
    }
    
    // Si nous n'avons pas assez de questions, retourner ce que nous avons
    if (questions.length < count) {
      console.log(`Attention: Seulement ${questions.length}/${count} questions trouvées dans la banque pour les critères donnés`);
    }
    
    // Marquer les questions comme utilisées
    if (questions.length > 0) {
      const questionIds = questions.map(q => q._id);
      await QuestionBank.updateMany(
        { _id: { $in: questionIds } },
        { 
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        }
      );
    }
    
    return questions;
  } catch (error) {
    console.error('Erreur lors de la récupération des questions depuis la banque:', error);
    return [];
  }
}

/**
 * Récupère un sous-ensemble aléatoire d'éléments
 */
_getRandomSubset(array, count) {
  if (array.length <= count) {
    return array;
  }
  
  // Créer une copie et mélanger
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

/**
 * Vérifie s'il y a assez de questions dans la banque pour des critères donnés
 */
async _hasEnoughQuestionsInBank(criteria, requiredCount) {
  try {
    const { category, subcategory } = criteria;
    
    const query = { category };
    if (subcategory) {
      query.$or = [
        { subcategory },
        { subcategory: { $exists: false } }
      ];
    }
    
    const count = await QuestionBank.countDocuments(query);
    return count >= requiredCount;
  } catch (error) {
    console.error('Erreur lors de la vérification du nombre de questions dans la banque:', error);
    return false;
  }
}

/**
 * Met à jour les taux de succès des questions après évaluation
 */
async _updateQuestionSuccessRates(quizId, answers) {
  try {
    // Récupérer le quiz avec les questions
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return;
    }
    
    // Parcourir toutes les questions du quiz
    const questionUpdates = [];
    
    quiz.sections.forEach(section => {
      section.questions.forEach(question => {
        // Trouver la réponse correspondante dans la soumission
        const answer = answers.find(a => a.questionId.toString() === question._id.toString());
        
        // Vérifier si la question est basée sur une question de la banque (a un questionBankId)
        if (question.questionBankId) {
          const isCorrect = answer && this._isAnswerCorrect(question, answer.answer);
          
          // Préparer la mise à jour
          questionUpdates.push({
            updateOne: {
              filter: { _id: question.questionBankId },
              update: { 
                $inc: { 
                  'successCount': isCorrect ? 1 : 0,
                  'totalAnswers': 1
                }
              }
            }
          });
        }
      });
    });
    
    // Effectuer les mises à jour en bloc si nécessaire
    if (questionUpdates.length > 0) {
      await QuestionBank.bulkWrite(questionUpdates);
      
      // Mettre à jour les taux de succès
      await QuestionBank.updateMany(
        { totalAnswers: { $gt: 0 } },
        [{ $set: { successRate: { $divide: ["$successCount", "$totalAnswers"] } } }]
      );
      
      console.log(`Taux de succès mis à jour pour ${questionUpdates.length} questions`);
    }
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des taux de succès des questions:', error);
    // Ne pas propager l'erreur pour ne pas perturber le flux principal
  }
}

/**
 * Obtenir des statistiques sur la banque de questions
 */
async getQuestionBankStats() {
  try {
    const stats = {
      totalQuestions: await QuestionBank.countDocuments(),
      byCategory: {},
      byDifficulty: {
        beginner: await QuestionBank.countDocuments({ difficultyLevel: 'beginner' }),
        intermediate: await QuestionBank.countDocuments({ difficultyLevel: 'intermediate' }),
        advanced: await QuestionBank.countDocuments({ difficultyLevel: 'advanced' })
      },
      usageStats: {
        neverUsed: await QuestionBank.countDocuments({ usageCount: 0 }),
        mostUsed: await QuestionBank.find().sort({ usageCount: -1 }).limit(1).then(docs => docs[0]?.usageCount || 0),
        averageUsage: await QuestionBank.aggregate([{ $group: { _id: null, avg: { $avg: "$usageCount" } } }]).then(docs => docs[0]?.avg || 0)
      }
    };
    
    // Obtenir les comptes par catégorie
    const categories = await QuestionBank.distinct('category');
    for (const category of categories) {
      stats.byCategory[category] = await QuestionBank.countDocuments({ category });
    }
    
    return stats;
  } catch (error) {
    console.error('Erreur lors de l\'obtention des statistiques de la banque de questions:', error);
    throw new Error(`Échec de l'obtention des statistiques de la banque de questions: ${error.message}`);
  }
}

/**
 * Rechercher des questions dans la banque
 */
async searchQuestionBank(criteria) {
  try {
    const {
      category,
      subcategory, // Ajout du filtrage par sous-catégorie
      difficultyLevel,
      searchText,
      limit = 20,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = -1
    } = criteria;
    
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    if (difficultyLevel) {
      query.difficultyLevel = difficultyLevel;
    }
    
    if (searchText) {
      query.$text = { $search: searchText };
    }
    
    const sort = {};
    sort[sortBy] = sortOrder;
    
    const questions = await QuestionBank.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await QuestionBank.countDocuments(query);
    
    return {
      questions,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Erreur lors de la recherche dans la banque de questions:', error);
    throw new Error(`Échec de la recherche dans la banque de questions: ${error.message}`);
  }
}

/**
 * Ajouter manuellement une question à la banque
 */
async addQuestionToBank(questionData) {
  try {
    const question = new QuestionBank({
      questionText: questionData.questionText,
      type: questionData.type || 'multiple_choice',
      options: questionData.options,
      difficultyLevel: questionData.difficultyLevel,
      category: questionData.category,
      subcategory: questionData.subcategory,
      explanation: questionData.explanation
    });
    
    // Valider le format de la question
    if (!this._validateQuestionFormat(question)) {
      throw new Error('Format de question invalide');
    }
    
    await question.save();
    return question;
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'une question à la banque:', error);
    throw new Error(`Échec de l'ajout de la question à la banque: ${error.message}`);
  }
}

/**
 * Mettre à jour une question dans la banque
 */
async updateQuestionInBank(questionId, updates) {
  try {
    const question = await QuestionBank.findById(questionId);
    
    if (!question) {
      throw new Error('Question non trouvée');
    }
    
    // Mettre à jour les champs autorisés
    const allowedUpdates = ['questionText', 'options', 'difficultyLevel', 'category', 'subcategory', 'explanation'];
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        question[field] = updates[field];
      }
    }
    
    // Valider la question mise à jour
    if (!this._validateQuestionFormat(question)) {
      throw new Error('Format de question invalide après mise à jour');
    }
    
    await question.save();
    return question;
  } catch (error) {
    console.error('Erreur lors de la mise à jour d\'une question dans la banque:', error);
    throw new Error(`Échec de la mise à jour de la question dans la banque: ${error.message}`);
  }
}

/**
 * Supprimer une question de la banque
 */
async deleteQuestionFromBank(questionId) {
  try {
    const result = await QuestionBank.deleteOne({ _id: questionId });
    
    if (result.deletedCount === 0) {
      throw new Error('Question non trouvée');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression d\'une question de la banque:', error);
    throw new Error(`Échec de la suppression de la question de la banque: ${error.message}`);
  }
}

/**
 * Importer plusieurs questions dans la banque
 */
async importQuestionsToBank(questions, category) {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Données de questions invalides pour l\'importation');
    }
    
    // Normaliser et valider toutes les questions
    const validQuestions = questions
      .map(q => this._normalizeQuestion(q))
      .filter(q => this._validateQuestionFormat(q));
    
    if (validQuestions.length === 0) {
      throw new Error('Aucune question valide trouvée dans les données d\'importation');
    }
    
    // Stocker dans la banque
    const result = await this._storeQuestionsInBank(validQuestions, category);
    
    return {
      total: questions.length,
      valid: validQuestions.length,
      added: result ? result.upsertedCount : 0
    };
  } catch (error) {
    console.error('Erreur lors de l\'importation de questions dans la banque:', error);
    throw new Error(`Échec de l'importation de questions dans la banque: ${error.message}`);
  }
}
/**
 * Génère des questions pour la banque sans créer de quiz
 * @param {Object} options - Options de génération
 * @returns {Object} - Résultat de la génération
 */
async generateQuestionsForBank(options) {
  try {
    const {
      category,
      subcategory,
      count = 10,
      difficultyRatio,
      topic,
      context
    } = options;
    
    if (!category) {
      throw new Error('La catégorie est requise pour générer des questions');
    }
    
    // Utiliser le ratio de difficulté spécifié ou un par défaut
    const finalDifficultyRatio = difficultyRatio || {
      beginner: 0.3,
      intermediate: 0.4,
      advanced: 0.3
    };
    
    // Construire un prompt en fonction des informations fournies
    let prompt = '';
    
    if (topic) {
      prompt += `Technologie/Sujet: ${topic}\n`;
    }
    
    if (context) {
      prompt += `Contexte: ${context}\n`;
    }
    
    prompt += `
Instructions supplémentaires:
- Créer des questions variées mais spécifiques au sujet
- Les questions doivent être précises, non ambiguës et en français
- Chaque question doit avoir exactement 5 options
- 1 ou 2 options doivent être correctes
- L'explication doit justifier pourquoi les réponses correctes sont correctes
- Fournir une catégorisation précise`;
    
    // Configurer le système de génération
    const systemPrompt = this.systemPrompts.technical
      .replace('<COUNT>', count.toString())
      .replace('<DIFFICULTY_RATIO>', this._generateExperienceLevelPrompt(finalDifficultyRatio));
    
    // Appel à l'API
    console.log(`Génération de ${count} questions pour la banque, catégorie: ${category}`);
    const startTime = Date.now();
    
    const response = await this.anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: systemPrompt,
      messages: [{ role: "user", content: `Générez EXACTEMENT ${count} questions techniques en français sur: ${prompt}` }],
      temperature: 0.2, // Légèrement plus élevé pour plus de variété
      max_tokens: 8000
    });
    
    const apiDuration = Date.now() - startTime;
    console.log(`Réponse reçue en ${apiDuration}ms`);
    
    // Traiter la réponse
    let content = response.content[0].text;
    
    // Nettoyer le contenu
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        content = match[1].trim();
      }
    }
    
    // Parser le JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Erreur de parsing JSON');
      console.error('Contenu brut reçu:', content.substring(0, 500) + '...');
      throw new Error(`Format JSON invalide: ${parseError.message}`);
    }
    
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error('Structure JSON invalide: questions manquantes ou format incorrect');
    }
    
    // Normaliser et valider les questions
    const questions = parsedContent.questions;
    const normalizedQuestions = questions.map(q => this._normalizeQuestion(q));
    const adjustedQuestions = this._adjustQuestionDifficultyDistribution(
      normalizedQuestions, 
      finalDifficultyRatio
    );
    
    // Filtrer pour obtenir uniquement les questions valides
    const validQuestions = adjustedQuestions.filter(question => this._validateQuestionFormat(question));
    
    console.log(`${validQuestions.length}/${questions.length} questions valides après normalisation`);
    
    // Ajouter la catégorie principale
    validQuestions.forEach(q => {
      q.category = category;
      if (subcategory) {
        q.subcategory = subcategory;
      }
    });
    
    // Stocker les questions dans la banque
    const storeResult = await this._storeQuestionsInBank(validQuestions, category);
    
    return {
      total: questions.length,
      valid: validQuestions.length,
      added: storeResult?.upsertedCount || 0,
      questions: validQuestions.map(q => ({
        questionText: q.questionText,
        difficultyLevel: q.difficultyLevel,
        category: q.category
      })) // Version simplifiée des questions pour l'affichage
    };
  } catch (error) {
    console.error('Erreur lors de la génération de questions pour la banque:', error);
    throw new Error(`Échec de la génération: ${error.message}`);
  }
}
/**
 * Récupère toutes les catégories disponibles dans la banque de questions
 * @returns {Array} Liste des catégories
 */
async getQuestionBankCategories() {
  try {
    // Obtenir les catégories distinctes
    const categories = await QuestionBank.distinct('category');
    
    // Obtenir les sous-catégories distinctes
    const subcategories = await QuestionBank.distinct('subcategory');
    
    // Compter le nombre de questions par catégorie
    const categoryCounts = {};
    for (const category of categories) {
      categoryCounts[category] = await QuestionBank.countDocuments({ category });
    }
    
    // Compter le nombre de questions par sous-catégorie
    const subcategoryCounts = {};
    for (const subcategory of subcategories) {
      if (subcategory) { // Ignorer les sous-catégories undefined/null
        subcategoryCounts[subcategory] = await QuestionBank.countDocuments({ subcategory });
      }
    }
    
    // Construire un objet structuré avec catégories et sous-catégories
    const result = {
      categories: categories.map(category => ({
        name: category,
        count: categoryCounts[category],
        subcategories: subcategories
          .filter(sub => sub) // Filtrer les valeurs null/undefined
          .filter(async sub => {
            // Vérifier si cette sous-catégorie existe pour cette catégorie
            const count = await QuestionBank.countDocuments({ 
              category, 
              subcategory: sub 
            });
            return count > 0;
          })
          .map(sub => ({
            name: sub,
            count: subcategoryCounts[sub]
          }))
      })),
      defaultCategories: ['technical', 'tools', 'situational'] // Catégories par défaut du système
    };
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    throw new Error(`Échec de la récupération des catégories: ${error.message}`);
  }
}

/**
 * Récupère une question spécifique de la banque
 * @param {String} id - ID de la question
 * @returns {Object} Question
 */
async getQuestionFromBank(id) {
  try {
    return await QuestionBank.findById(id);
  } catch (error) {
    console.error('Erreur lors de la récupération de la question:', error);
    throw new Error(`Échec de la récupération de la question: ${error.message}`);
  }
}

/**
 * Génère des questions pour une sous-catégorie spécifique
 * @param {Object} sectionConfig - Configuration de la section
 * @param {String} subcategory - Sous-catégorie (php, typescript, etc.)
 * @param {Number} count - Nombre de questions à générer
 * @returns {Array} Questions générées
 */
async _generateQuestionsForSubcategory(sectionConfig, subcategory, count) {
  try {
    if (count <= 0) return [];
    
    // Créer un prompt spécifique à cette sous-catégorie
    let systemPrompt = this.systemPrompts[sectionConfig.type];
    systemPrompt = systemPrompt
      .replace('<COUNT>', count.toString())
      .replace('<DIFFICULTY_RATIO>', this._generateExperienceLevelPrompt(sectionConfig.difficultyRatio));
    
    // Adapter le prompt utilisateur à la sous-catégorie
    let userPrompt = '';
    const category = sectionConfig.type.toLowerCase();
    
    if (category === 'technical') {
      userPrompt = `Générez EXACTEMENT ${count} questions techniques en français sur la technologie ${subcategory.toUpperCase()}.
Les questions doivent couvrir différents aspects et concepts de ${subcategory}.
Chaque question doit être spécifique à ${subcategory}, ne pas être trop générique.
Adaptez la difficulté selon le niveau: ${this._experienceLevelToFrench(sectionConfig.experienceLevel || 'mid')}.`;
    } else if (category === 'tools') {
      userPrompt = `Générez EXACTEMENT ${count} questions en français sur l'outil/framework ${subcategory.toUpperCase()}.
Les questions doivent couvrir différents aspects de l'utilisation de ${subcategory}.
Chaque question doit être spécifique à ${subcategory}, ne pas être trop générique.
Adaptez la difficulté selon le niveau: ${this._experienceLevelToFrench(sectionConfig.experienceLevel || 'mid')}.`;
    } else {
      // Pour les questions situationnelles ou autres catégories
      userPrompt = `Générez EXACTEMENT ${count} questions en français sur des situations impliquant ${subcategory.toUpperCase()}.
Les questions doivent présenter des scénarios réalistes et pertinents.
Chaque question doit être spécifique à ${subcategory}, ne pas être trop générique.
Adaptez la difficulté selon le niveau: ${this._experienceLevelToFrench(sectionConfig.experienceLevel || 'mid')}.`;
    }
    
    // Appel à l'API avec log pour suivi des performances
    console.log(`Appel API pour générer ${count} questions sur ${subcategory}...`);
    const startTime = Date.now();
    
    const response = await this.anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.2, // Légèrement plus élevé pour variété
      max_tokens: 8000
    });
    
    const apiDuration = Date.now() - startTime;
    console.log(`Réponse reçue en ${apiDuration}ms`);

    let content = response.content[0].text;
    
    // Nettoyer le contenu si Claude renvoie du JSON dans des balises de code markdown
    if (content.includes('```')) {
      // Extraire le JSON entre les balises de code markdown
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        content = match[1].trim();
      }
    }
    
    // Analyser la réponse JSON avec gestion des erreurs
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error(`Erreur de parsing JSON pour sous-catégorie ${subcategory}:`, parseError);
      console.error('Contenu brut reçu:', content.substring(0, 500) + '...');
      throw new Error(`Format JSON invalide pour sous-catégorie ${subcategory}: ${parseError.message}`);
    }

    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      console.error(`Structure JSON invalide pour sous-catégorie ${subcategory}`);
      throw new Error(`Format JSON invalide pour sous-catégorie ${subcategory}: questions manquantes ou format incorrect`);
    }

    let generatedQuestions = parsedContent.questions;
    
    // Logging du nombre de questions reçues
    console.log(`Reçu ${generatedQuestions.length}/${count} questions pour sous-catégorie ${subcategory}`);
    
    // Vérifier si nous avons suffisamment de questions
    if (generatedQuestions.length < count) {
      console.warn(`Nombre insuffisant de questions pour sous-catégorie ${subcategory}: ${generatedQuestions.length}/${count}`);
    }
    
    // S'assurer de ne pas avoir plus de questions que nécessaire
    if (generatedQuestions.length > count) {
      generatedQuestions = generatedQuestions.slice(0, count);
    }

    // Normaliser et valider les questions générées
    const normalizedQuestions = generatedQuestions.map(q => {
      // Normaliser la question
      const normalizedQuestion = this._normalizeQuestion(q);
      
      // Ajouter explicitement la sous-catégorie
      normalizedQuestion.subcategory = subcategory.toLowerCase();
      
      return normalizedQuestion;
    });
    
    const adjustedQuestions = this._adjustQuestionDifficultyDistribution(
      normalizedQuestions, 
      sectionConfig.difficultyRatio
    );
    
    // Filtrer pour obtenir uniquement les questions valides
    const validQuestions = adjustedQuestions.filter(question => this._validateQuestionFormat(question));
    
    return validQuestions;
  } catch (error) {
    console.error(`Erreur lors de la génération de questions pour sous-catégorie ${subcategory}:`, error);
    return [];
  }
}

/**
 * Génère des questions génériques pour une section sans sous-catégorie spécifique
 * @param {Object} sectionConfig - Configuration de la section
 * @param {Number} count - Nombre de questions à générer
 * @returns {Array} Questions générées
 */
async _generateQuestionsGeneric(sectionConfig, count) {
  try {
    if (count <= 0) return [];
    
    // Récupérer le template du prompt système préchargé et personnaliser avec les valeurs spécifiques
    let systemPrompt = this.systemPrompts[sectionConfig.type];
    systemPrompt = systemPrompt
      .replace('<COUNT>', count.toString())
      .replace('<DIFFICULTY_RATIO>', this._generateExperienceLevelPrompt(sectionConfig.difficultyRatio));
    
    // Construire le prompt utilisateur avec le contexte spécifique de la section
    const userPrompt = `Générez EXACTEMENT ${count} questions pour: ${sectionConfig.prompt}`;
    
    // Appel à l'API avec log pour suivi des performances
    console.log(`Appel API pour section ${sectionConfig.type}...`);
    const startTime = Date.now();
    
    const response = await this.anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.1,
      max_tokens: 8000
    });
    
    const apiDuration = Date.now() - startTime;
    console.log(`Réponse reçue pour section ${sectionConfig.type} en ${apiDuration}ms`);

    let content = response.content[0].text;
    
    // Nettoyer le contenu si Claude renvoie du JSON dans des balises de code markdown
    if (content.includes('```')) {
      // Extraire le JSON entre les balises de code markdown
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        content = match[1].trim();
      }
    }
    
    // Analyser la réponse JSON avec gestion des erreurs
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Erreur de parsing JSON pour section', sectionConfig.type);
      console.error('Contenu brut reçu:', content.substring(0, 500) + '...');
      throw new Error(`Format JSON invalide pour section ${sectionConfig.type}: ${parseError.message}`);
    }

    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      console.error('Structure JSON invalide pour section', sectionConfig.type);
      throw new Error(`Format JSON invalide pour section ${sectionConfig.type}: questions manquantes ou format incorrect`);
    }

    let generatedQuestions = parsedContent.questions;
    
    // Logging du nombre de questions reçues
    console.log(`Reçu ${generatedQuestions.length}/${count} questions pour section ${sectionConfig.type}`);
    
    // Vérifier si nous avons suffisamment de questions
    if (generatedQuestions.length < count) {
      throw new Error(`Nombre insuffisant de questions pour section ${sectionConfig.type}: ${generatedQuestions.length}/${count}`);
    }
    
    // S'assurer de ne pas avoir plus de questions que nécessaire
    if (generatedQuestions.length > count) {
      generatedQuestions = generatedQuestions.slice(0, count);
    }

    // Normaliser et valider les questions générées
    const normalizedQuestions = generatedQuestions.map(q => this._normalizeQuestion(q));
    const adjustedQuestions = this._adjustQuestionDifficultyDistribution(
      normalizedQuestions, 
      sectionConfig.difficultyRatio
    );
    
    // Filtrer pour obtenir uniquement les questions valides
    const validQuestions = adjustedQuestions.filter(question => this._validateQuestionFormat(question));
    
    return validQuestions;
  } catch (error) {
    console.error(`Erreur lors de la génération de questions génériques pour section ${sectionConfig.type}:`, error);
    return [];
  }
}

/**
 * Convertit un niveau d'expérience en français
 * @param {String} level - Niveau d'expérience (junior, mid, senior)
 * @returns {String} - Niveau en français
 */
_experienceLevelToFrench(level) {
  switch (level.toLowerCase()) {
    case 'junior':
      return 'Junior (débutant)';
    case 'mid':
      return 'Intermédiaire';
    case 'senior':
      return 'Senior (avancé)';
    default:
      return 'Intermédiaire';
  }
}

}

module.exports = new QuizGeneratorService();