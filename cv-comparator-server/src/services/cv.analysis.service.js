const { Anthropic } = require('@anthropic-ai/sdk');
const textService = require('./text.preprocessing.service');

class CVAnalysisService {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY must be set in environment variables');
    }

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.CLAUDE_MODEL = "claude-3-7-sonnet-20250219";
    this.CLAUDE_FAST_MODEL = "claude-3-haiku-20240307"; // Modèle plus rapide pour les cas simples
    
    // Cache simple pour stocker les résultats (sans dépendance externe)
    this.analysisCache = new Map();
    this.matchingCache = new Map();
    
    // Paramètres pour optimiser les performances
    this.CACHE_TTL = 3600 * 1000; // 1 heure en millisecondes
    this.MAX_CV_LENGTH = 10000; // Limiter la taille du CV pour l'analyse
    this.USE_FAST_MODEL_THRESHOLD = 5000; // Seuil pour basculer vers le modèle rapide
  }

  async analyzeCV(cvText, requirements = {}) {
    // Prétraitement et extraction des informations de base
    const preprocessedCV = textService.preprocessCV(cvText);
    const basicInfo = textService.extractBasicInfo(cvText);
    const normalizedRequirements = this.normalizeRequirements(requirements);
    
    // Vérifier le cache (clé unique basée sur le texte et les requirements)
    const cacheKey = this.generateCacheKey(preprocessedCV, normalizedRequirements);
    const cachedResult = this.analysisCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp < this.CACHE_TTL)) {
      console.log('[Claude] Utilisation du résultat en cache');
      return cachedResult.data;
    }
    
    // Limitation de la taille du CV pour améliorer les performances
    const trimmedCV = preprocessedCV.length > this.MAX_CV_LENGTH ? 
      preprocessedCV.substring(0, this.MAX_CV_LENGTH) + "... [contenu tronqué pour optimisation]" : 
      preprocessedCV;
    
    // Déterminer le modèle à utiliser (plus rapide pour les cas simples)
    const isSimpleAnalysis = trimmedCV.length < this.USE_FAST_MODEL_THRESHOLD && 
                            (!normalizedRequirements.skills?.length || normalizedRequirements.skills.length < 5);
    const modelToUse = isSimpleAnalysis ? this.CLAUDE_FAST_MODEL : this.CLAUDE_MODEL;
    
    try {
      console.log('[Claude] Début extraction', {
        textLength: trimmedCV?.length,
        requirementsLength: JSON.stringify(normalizedRequirements).length,
        model: modelToUse,
        isSimpleAnalysis
      });

      const response = await this.callClaudeAPI(trimmedCV, normalizedRequirements, basicInfo, modelToUse);
      
      if (!response?.content?.[0]?.text) {
        throw new Error('Réponse Anthropic invalide');
      }
      
      const result = this.parseClaudeResponse(response.content[0].text);
      
      // Fusionner avec les informations extraites par regex
      if (!result.email && basicInfo.email) {
        result.email = basicInfo.email;
      }
      if (!result.phone_number && basicInfo.phone_number) {
        result.phone_number = basicInfo.phone_number;
      }
      
      // Passer le CV original pour la vérification
      const normalizedResult = await this.normalizeExtractionResult(result, cvText);

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
        
        // Calcul des scores (pour compatibilité)
        normalizedResult.skill_match_score = this.calculateSkillsScore(
          normalizedResult.skills || [],
          normalizedRequirements.skills || []
        );
        normalizedResult.tool_match_score = this.calculateToolsScore(
          normalizedResult.tools || [],
          normalizedRequirements.tools || []
        );
      }

      // Mise en cache du résultat
      this.analysisCache.set(cacheKey, {
        data: normalizedResult,
        timestamp: Date.now()
      });
      
      return normalizedResult;
      
    } catch (error) {
      console.error('[Claude] Erreur extraction:', {
        name: error.name,
        message: error.message,
        type: error.type,
        status: error.status
      });
      throw new Error(`Erreur lors de l'extraction avec Claude: ${error.message}`);
    }
  }

  generateCacheKey(cvText, requirements) {
    // Fonction simple pour générer une clé de cache sans dépendance crypto
    const stringToHash = cvText.substring(0, 1000) + JSON.stringify(requirements);
    let hash = 0;
    for (let i = 0; i < stringToHash.length; i++) {
      const char = stringToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Conversion en 32bit integer
    }
    return `cv_${hash}`;
  }

  normalizeRequirements(requirements) {
    // Fonction utilitaire pour normaliser une chaîne de requirements
    const normalizeRequirementString = (str) => {
      if (Array.isArray(str)) return str;
      if (typeof str !== 'string') return [];
      return str.split(',')
                .map(item => item.trim())
                .filter(Boolean);
    };
    
    // Normalisation des requirements pour le prompt
    return {
      ...requirements,
      skills: normalizeRequirementString(requirements.skills),
      tools: normalizeRequirementString(requirements.tools)
    };
  }

  async callClaudeAPI(preprocessedCV, normalizedRequirements, basicInfo, modelToUse) {
    // Préparation du contexte des requirements pour le prompt (version condensée)
    const requirementsParts = [];
    
    if (normalizedRequirements.title) requirementsParts.push(`Poste: ${normalizedRequirements.title}`);
    if (normalizedRequirements.skills?.length) requirementsParts.push(`Compétences: ${normalizedRequirements.skills.join(', ')}`);
    if (normalizedRequirements.tools?.length) requirementsParts.push(`Outils: ${normalizedRequirements.tools.join(', ')}`);
    if (normalizedRequirements.experience_years) requirementsParts.push(`Expérience: ${normalizedRequirements.experience_years} ans`);
    
    const requirementsContext = requirementsParts.join(' | ');

    // Prompt amélioré avec instructions plus strictes
    return await this.anthropic.messages.create({
      model: modelToUse,
      max_tokens: 3000, // Réduit pour accélérer la génération
      temperature: 0.1, // Réduit pour plus de cohérence
      system: `Tu es un expert en analyse de CV chargé d'extraire des informations structurées.
        Tu dois TOUJOURS répondre avec un objet JSON valide, rien d'autre.

        Instructions TRÈS IMPORTANTES pour l'analyse :
        - Extraire UNIQUEMENT les informations EXPLICITEMENT mentionnées dans le CV
        - NE PAS inférer ou supposer des compétences ou outils qui ne sont pas clairement indiqués
        - Pour les compétences et outils, ne lister QUE ceux qui sont mentionnés textuellement
        - Pour le résumé: court (3-4 phrases max) incluant:
          1. Profil général du candidat
          2. Ses points forts principaux
          3. Les correspondances clés avec les prérequis du poste
          4. Les écarts notables avec les prérequis du poste
        - Ne pas essayer de faire correspondre artificiellement le CV aux requirements
      
        Structure de réponse requise :
        {
          "summary":string, // Court résumé d'analyse
          "phone_number":string,
          "email":string, 
          "skills": string[], // UNIQUEMENT les compétences EXPLICITEMENT mentionnées
          "tools": string[], // UNIQUEMENT les outils/technologies EXPLICITEMENT mentionnés
          "education": string[], 
          "languages": string[], 
          "experiences": [ // Liste des expériences
            {
              "title": string, 
              "company": string, 
              "description": string, 
              "duration": string, // Format "MM/YYYY - MM/YYYY"
              "duration_in_months": number 
            }
          ],
          "experience_years": number, 
          "certifications": string[], 
          "projects": []
        }`,
      messages: [
        {
          role: "user",
          content: `Analyse ce CV en tenant compte des requirements du poste. Réponds uniquement en JSON.

          Requirements:
          ${requirementsContext || "Aucun requirement spécifique fourni"}
          
          CV à analyser:
          ${preprocessedCV}
          
          Informations déjà identifiées:
          ${basicInfo.email ? `- Email: ${basicInfo.email}` : ''}
          ${basicInfo.phone_number ? `- Téléphone: ${basicInfo.phone_number}` : ''}

          Pour le résumé, compare le profil avec les requirements et mentionne explicitement:
          - Les compétences et expériences qui correspondent bien aux requirements
          - Les écarts ou compétences manquantes par rapport aux requirements
          
          IMPORTANT: 
          - Retourne UNIQUEMENT l'objet JSON
          - N'invente pas de compétences ou d'outils non mentionnés dans le CV
          - Calcule précisément la durée de chaque expérience
          - Sépare bien les compétences des outils/technologies`
        }
      ]
    });
  }

  parseClaudeResponse(content) {
    try {
      // Optimisation du parsing pour gérer les cas où Claude ajoute du texte
      content = content.trim();
      
      // Extraction du JSON si entouré de texte
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      } else if (!content.startsWith('{') || !content.endsWith('}')) {
        throw new Error('La réponse n\'est pas un objet JSON valide');
      }
      
      return JSON.parse(content);
    } catch (parseError) {
      console.error('[Claude] Erreur parsing JSON:', {
        error: parseError.message,
        content: content.substring(0, 200) + '...',
        contentLength: content.length
      });
      throw new Error(`Format de réponse invalide: ${parseError.message}`);
    }
  }

  async normalizeExtractionResult(result, rawCvText) {
    try {
      const defaultResult = {
        summary: "",
        phone_number: "",
        email: "",
        skills: [],
        tools: [],
        experience_years: 0,
        education: [],
        languages: [],
        experiences: [],
        matching_skills: [],
        matching_tools: [],
        skill_match_score: 0,
        tool_match_score: 0,
        certifications: [],
        projects: []
      };
  
      // Optimisation: S'assurer que chaque expérience a le champ duration_in_months
      const normalizedExperiences = (result.experiences || []).map(exp => {
        const durationInMonths = exp.duration_in_months || this.calculateDurationInMonths(exp.duration);
        return {
          ...exp,
          duration_in_months: durationInMonths
        };
      });
    
      // Vérification des compétences et outils contre le texte du CV
      const verifiedSkills = this.verifyItemsInText(result.skills || [], rawCvText);
      const verifiedTools = this.verifyItemsInText(result.tools || [], rawCvText);
  
      console.log('[Claude] Vérification compétences:', {
        original: result.skills?.length || 0,
        verified: verifiedSkills.length,
        removed: (result.skills || []).filter(s => !verifiedSkills.includes(s))
      });
  
      console.log('[Claude] Vérification outils:', {
        original: result.tools?.length || 0,
        verified: verifiedTools.length,
        removed: (result.tools || []).filter(t => !verifiedTools.includes(t))
      });
  
      return {
        ...defaultResult,
        ...result,
        skills: verifiedSkills,
        tools: verifiedTools,
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
  
  // Nouvelle méthode pour vérifier si les éléments existent vraiment dans le texte du CV
  verifyItemsInText(items, text) {
    if (!items || !text) return [];
    
    const normalizedText = this.normalizeForMatching(text);
    const verifiedItems = [];
    
    for (const item of items) {
      const normalizedItem = this.normalizeForMatching(item);
      
      // Plusieurs approches de vérification
      const exactMatch = normalizedText.includes(normalizedItem);
      
      // Vérifier mot par mot pour les termes multi-mots
      const wordByWordMatch = normalizedItem.split(/\s+/).every(word => 
        word.length > 2 && normalizedText.includes(word)
      );
      
      // Vérifier les variations courantes (singulier/pluriel)
      const singularForm = normalizedItem.endsWith('s') ? normalizedItem.slice(0, -1) : normalizedItem;
      const pluralForm = normalizedItem.endsWith('s') ? normalizedItem : normalizedItem + 's';
      const variationMatch = normalizedText.includes(singularForm) || normalizedText.includes(pluralForm);
      
      if (exactMatch || (wordByWordMatch && normalizedItem.length > 5) || variationMatch) {
        verifiedItems.push(item);
      }
    }
    
    return verifiedItems;
  }

  // Méthode pour calculer la durée en mois
  calculateDurationInMonths(durationStr) {
    if (!durationStr) return 0;
    
    try {
      // Format attendu: "MM/YYYY - MM/YYYY" ou similaire
      const parts = durationStr.split(' - ');
      if (parts.length !== 2) return 0;
      
      const parseDate = (dateStr) => {
        // Gérer plusieurs formats possibles
        const matches = dateStr.match(/(\d{1,2})\/(\d{4})/);
        if (!matches) return null;
        
        const month = parseInt(matches[1], 10) - 1; // 0-indexed months
        const year = parseInt(matches[2], 10);
        
        return new Date(year, month);
      };
      
      const startDate = parseDate(parts[0]);
      
      // Gérer "Aujourd'hui" ou "Present"
      const endDate = parts[1].toLowerCase().includes('aujourd') || 
                     parts[1].toLowerCase().includes('present') ? 
                     new Date() : 
                     parseDate(parts[1]);
      
      if (!startDate || !endDate) return 0;
      
      // Calcul précis des mois entre deux dates
      return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
             (endDate.getMonth() - startDate.getMonth());
    } catch (e) {
      console.error('Erreur lors du calcul de la durée:', e);
      return 0;
    }
  }

  findMatches(candidateItems, requiredItems) {
    if (!candidateItems || !requiredItems) return [];
    
    // Optimisation: Vérifie si nous avons déjà calculé ces correspondances
    const cacheKey = `${candidateItems.join(',')}_${requiredItems.join(',')}`;
    if (this.matchingCache.has(cacheKey)) {
      return this.matchingCache.get(cacheKey);
    }
    
    // S'assurer que nous avons des tableaux
    const candidates = Array.isArray(candidateItems) ? candidateItems : [candidateItems];
    const required = Array.isArray(requiredItems) ? requiredItems : [requiredItems];
    
    // Optimisation: pré-normaliser toutes les valeurs des candidats
    const normalizedCandidates = candidates.map(c => this.normalizeForMatching(c));
    
    // Pour chaque requirement, chercher une correspondance
    const matches = required.filter(req => {
      const normalizedReq = this.normalizeForMatching(req);
      const found = normalizedCandidates.some(candidate => 
        this.isFlexibleMatch(candidate, normalizedReq)
      );
      
      return found;
    });
    
    // Mettre en cache pour des appels futurs
    this.matchingCache.set(cacheKey, matches);
    
    return matches;
  }

  // Fonction de normalisation pour le matching
  normalizeForMatching(str) {
    if (!str) return '';
    return String(str).toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, '')
      .trim();
  }

  // Fonction de matching améliorée et moins permissive
  isFlexibleMatch(candidateNorm, requiredNorm) {
    if (!candidateNorm || !requiredNorm) {
      return false;
    }
    
    // Correspondance exacte après normalisation
    if (candidateNorm === requiredNorm) {
      return true;
    }

    // Gestion des versions (ex: python3 === python)
    // Mais seulement si la base est identique et il s'agit juste de versions
    if (candidateNorm.replace(/[0-9.]/g, '') === requiredNorm.replace(/[0-9.]/g, '')) {
      // Vérifier qu'il s'agit d'une vraie correspondance de version
      const baseCandidate = candidateNorm.replace(/[0-9.]/g, '').trim();
      // Seulement pour les technologies courantes qui ont des versions numériques
      const techWithVersions = ['python', 'java', 'javascript', 'typescript', 'php', 'ruby', 'go', 'node', 'angular', 'react', 'vue'];
      
      if (techWithVersions.includes(baseCandidate)) {
        return true;
      }
      return false;
    }

    // Vérifier si c'est un acronyme
    const isAcronym = (full, abbr) => {
      const fullWords = full.split(/\s+/);
      if (fullWords.length < 2) return false;
      
      const initials = fullWords.map(word => word.charAt(0)).join('');
      return initials.toLowerCase() === abbr.toLowerCase();
    };
    
    // Vérifier les acronymes dans les deux sens
    if (isAcronym(candidateNorm, requiredNorm) || isAcronym(requiredNorm, candidateNorm)) {
      return true;
    }
    
    // Vérifier les mots exacts (toujours utile mais plus strict)
    const candidateWords = candidateNorm.split(/\s+/);
    const requiredWords = requiredNorm.split(/\s+/);
    
    // Tous les mots doivent correspondre exactement, pas juste une partie
    if (candidateWords.length === requiredWords.length) {
      const allWordsMatch = candidateWords.every(cWord => 
        requiredWords.includes(cWord)
      );
      return allWordsMatch;
    }

    return false;
  }

  // Conserver ces fonctions pour compatibilité avec le code existant
  calculateSkillsScore(candidateItems, requiredItems) {
    if (!requiredItems || requiredItems.length === 0) return 1;
    if (!candidateItems || candidateItems.length === 0) return 0;

    const matches = this.findMatches(candidateItems, requiredItems);
    return matches.length / requiredItems.length;
  }

  calculateToolsScore(candidateTools, requiredTools) {
    if (!requiredTools || requiredTools.length === 0) return 1;
    if (!candidateTools || candidateTools.length === 0) return 0;

    const matches = this.findMatches(candidateTools, requiredTools);
    return matches.length / requiredTools.length;
  }

  isComplexAnalysis(requirements, cvText) {
    // Critères de complexité simplifiés et optimisés
    const hasDetailedRequirements = 
      (requirements.skills && requirements.skills.length > 5) || 
      (requirements.tools && requirements.tools.length > 5);
    
    const isLongCV = cvText.length > 5000;
    
    // Vérification rapide pour les termes techniques
    const technicalTerms = ['machine learning', 'intelligence artificielle', 'blockchain', 'architecture', 'microservices'];
    const hasTechnicalTerms = technicalTerms.some(term => cvText.toLowerCase().includes(term));
    
    return hasDetailedRequirements || (isLongCV && hasTechnicalTerms);
  }
}

module.exports = new CVAnalysisService();