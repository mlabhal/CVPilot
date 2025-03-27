// controllers/questionBankController.js
const QuestionBank = require('../models/QuestionBank');
const quizGeneratorService = require('../services/quizGeneratorService');
const { validationResult } = require('express-validator');

class QuestionBankController {
  /**
   * Obtenir les statistiques globales de la banque de questions
   */
  async getStats(req, res) {
    try {
      const stats = await quizGeneratorService.getQuestionBankStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de la banque de questions',
        error: error.message
      });
    }
  }

  /**
   * Rechercher des questions dans la banque
   */
  async searchQuestions(req, res) {
    try {
      const { 
        category, 
        difficultyLevel, 
        searchText, 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * parseInt(limit);
      const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
      
      const result = await quizGeneratorService.searchQuestionBank({
        category,
        difficultyLevel,
        searchText,
        limit: parseInt(limit),
        skip,
        sortBy,
        sortOrder: sortOrderValue
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche dans la banque de questions',
        error: error.message
      });
    }
  }

  /**
   * Obtenir une question spécifique par ID
   */
  async getQuestion(req, res) {
    try {
      const { id } = req.params;
      
      const question = await quizGeneratorService.getQuestionFromBank(id);
      
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question non trouvée'
        });
      }
      
      res.status(200).json({
        success: true,
        data: question
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la question',
        error: error.message
      });
    }
  }

  /**
   * Ajouter une nouvelle question à la banque
   */
  async addQuestion(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const questionData = req.body;
      
      // Vérification des champs requis
      if (!questionData.questionText || !questionData.options || !questionData.category || !questionData.difficultyLevel) {
        return res.status(400).json({
          success: false,
          message: 'Données de question incomplètes. questionText, options, category et difficultyLevel sont requis.'
        });
      }
      
      // Vérification du format des options
      if (!Array.isArray(questionData.options) || questionData.options.length !== 5) {
        return res.status(400).json({
          success: false,
          message: 'La question doit avoir exactement 5 options.'
        });
      }
      
      // Vérification qu'au moins une option est correcte
      const correctOptions = questionData.options.filter(opt => opt.isCorrect === true);
      if (correctOptions.length < 1 || correctOptions.length > 2) {
        return res.status(400).json({
          success: false,
          message: 'La question doit avoir 1 ou 2 options correctes.'
        });
      }
      
      const question = await quizGeneratorService.addQuestionToBank(questionData);
      
      res.status(201).json({
        success: true,
        message: 'Question ajoutée avec succès à la banque',
        data: question
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajout de la question à la banque',
        error: error.message
      });
    }
  }

  /**
   * Mettre à jour une question existante
   */
  async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Vérification que la question existe
      const existingQuestion = await quizGeneratorService.getQuestionFromBank(id);
      if (!existingQuestion) {
        return res.status(404).json({
          success: false,
          message: 'Question non trouvée'
        });
      }
      
      // Si les options sont fournies, vérifier leur validité
      if (updates.options) {
        if (!Array.isArray(updates.options) || updates.options.length !== 5) {
          return res.status(400).json({
            success: false,
            message: 'La question doit avoir exactement 5 options.'
          });
        }
        
        const correctOptions = updates.options.filter(opt => opt.isCorrect === true);
        if (correctOptions.length < 1 || correctOptions.length > 2) {
          return res.status(400).json({
            success: false,
            message: 'La question doit avoir 1 ou 2 options correctes.'
          });
        }
      }
      
      const updatedQuestion = await quizGeneratorService.updateQuestionInBank(id, updates);
      
      res.status(200).json({
        success: true,
        message: 'Question mise à jour avec succès',
        data: updatedQuestion
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la question',
        error: error.message
      });
    }
  }

  /**
   * Supprimer une question
   */
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      
      // Vérification que la question existe
      const existingQuestion = await quizGeneratorService.getQuestionFromBank(id);
      if (!existingQuestion) {
        return res.status(404).json({
          success: false,
          message: 'Question non trouvée'
        });
      }
      
      const result = await quizGeneratorService.deleteQuestionFromBank(id);
      
      res.status(200).json({
        success: true,
        message: 'Question supprimée avec succès',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la question',
        error: error.message
      });
    }
  }

  /**
   * Importer plusieurs questions
   */
  async importQuestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { questions, category } = req.body;
      
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Le tableau de questions est requis et ne peut pas être vide'
        });
      }
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'La catégorie principale est requise pour l\'importation'
        });
      }
      
      const result = await quizGeneratorService.importQuestionsToBank(questions, category);
      
      res.status(200).json({
        success: true,
        message: `${result.added} questions importées avec succès sur ${result.valid} valides (${result.total} total)`,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'importation des questions',
        error: error.message
      });
    }
  }
  
  /**
   * Obtenir les catégories disponibles
   */
  async getCategories(req, res) {
    try {
      const categories = await quizGeneratorService.getQuestionBankCategories();
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des catégories',
        error: error.message
      });
    }
  }
  
  /**
   * Générer des questions à ajouter à la banque sans créer de quiz
   */
  async generateQuestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { 
        category, 
        subcategory, 
        count = 10, 
        difficulty = 'mixed',
        topic,
        context
      } = req.body;
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'La catégorie est requise'
        });
      }
      
      // Configuration de la difficulté
      let difficultyRatio;
      switch (difficulty) {
        case 'beginner':
          difficultyRatio = { beginner: 0.8, intermediate: 0.2, advanced: 0 };
          break;
        case 'intermediate':
          difficultyRatio = { beginner: 0.2, intermediate: 0.6, advanced: 0.2 };
          break;
        case 'advanced':
          difficultyRatio = { beginner: 0, intermediate: 0.3, advanced: 0.7 };
          break;
        case 'mixed':
        default:
          difficultyRatio = { beginner: 0.3, intermediate: 0.4, advanced: 0.3 };
      }
      
      const result = await quizGeneratorService.generateQuestionsForBank({
        category,
        subcategory,
        count: parseInt(count),
        difficultyRatio,
        topic,
        context
      });
      
      res.status(201).json({
        success: true,
        message: `${result.added} questions générées et ajoutées à la banque`,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des questions',
        error: error.message
      });
    }
  }
  /**
 * Obtenir la liste des sous-catégories disponibles (filtrable par catégorie principale)
 */
async getSubcategories(req, res) {
  try {
    const { category } = req.query;
    
    // Créer la requête
    const query = {};
    if (category) {
      query.category = category;
    }
    
    // Obtenir les sous-catégories distinctes
    const subcategories = await QuestionBank.distinct('subcategory', query);
    
    // Filtrer les sous-catégories null ou undefined
    const validSubcategories = subcategories.filter(subcategory => subcategory);
    
    // Obtenir le compte de questions pour chaque sous-catégorie
    const result = [];
    for (const subcategory of validSubcategories) {
      const countQuery = { subcategory };
      if (category) {
        countQuery.category = category;
      }
      
      const count = await QuestionBank.countDocuments(countQuery);
      
      result.push({
        name: subcategory,
        count,
        category: category || await this._getDominantCategory(subcategory)
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sous-catégories',
      error: error.message
    });
  }
}

/**
 * Obtenir la catégorie dominante pour une sous-catégorie
 * (utilisé lorsqu'une sous-catégorie peut appartenir à plusieurs catégories)
 */
async _getDominantCategory(subcategory) {
  try {
    const categories = await QuestionBank.aggregate([
      { $match: { subcategory } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    
    return categories.length > 0 ? categories[0]._id : null;
  } catch (error) {
    console.error(`Erreur lors de la détermination de la catégorie dominante pour ${subcategory}:`, error);
    return null;
  }
}

/**
 * Obtenir des questions pour une sous-catégorie spécifique
 */
async getQuestionsBySubcategory(req, res) {
  try {
    const { subcategory } = req.params;
    const { 
      difficultyLevel, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    if (!subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Sous-catégorie requise'
      });
    }
    
    const skip = (page - 1) * parseInt(limit);
    const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
    
    // Construire la requête
    const query = { subcategory };
    
    if (difficultyLevel) {
      query.difficultyLevel = difficultyLevel;
    }
    
    // Construire l'ordre de tri
    const sort = {};
    sort[sortBy] = sortOrderValue;
    
    // Récupérer les questions
    const questions = await QuestionBank.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await QuestionBank.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        questions,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des questions par sous-catégorie',
      error: error.message
    });
  }
}

/**
 * Générer des questions pour une sous-catégorie spécifique
 */
async generateQuestionsBySubcategory(req, res) {
  try {
    const { 
      category, 
      subcategory, 
      count = 10, 
      difficulty = 'mixed'
    } = req.body;
    
    if (!category || !subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie et sous-catégorie requises'
      });
    }
    
    // Configuration de la difficulté
    let difficultyRatio;
    switch (difficulty) {
      case 'beginner':
        difficultyRatio = { beginner: 0.8, intermediate: 0.2, advanced: 0 };
        break;
      case 'intermediate':
        difficultyRatio = { beginner: 0.2, intermediate: 0.6, advanced: 0.2 };
        break;
      case 'advanced':
        difficultyRatio = { beginner: 0, intermediate: 0.3, advanced: 0.7 };
        break;
      case 'mixed':
      default:
        difficultyRatio = { beginner: 0.3, intermediate: 0.4, advanced: 0.3 };
    }
    
    // Créer une configuration de section temporaire pour la génération
    const sectionConfig = {
      type: category,
      experienceLevel: 'mid',
      difficultyRatio
    };
    
    // Générer les questions
    const questions = await quizGeneratorService._generateQuestionsForSubcategory(
      sectionConfig,
      subcategory,
      parseInt(count)
    );
    
    // Stocker les questions générées dans la banque
    const storeResult = await quizGeneratorService._storeQuestionsInBank(
      questions,
      category,
      subcategory
    );
    
    res.status(201).json({
      success: true,
      message: `${questions.length} questions générées pour sous-catégorie ${subcategory}`,
      data: {
        generated: questions.length,
        stored: storeResult?.upsertedCount || 0,
        questions: questions.map(q => ({
          questionText: q.questionText,
          difficultyLevel: q.difficultyLevel
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération de questions par sous-catégorie',
      error: error.message
    });
  }
}

}

module.exports = new QuestionBankController();