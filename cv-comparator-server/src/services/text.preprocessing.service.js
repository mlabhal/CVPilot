class TextPreprocessingService {
    constructor() {
      this.MAX_CV_LENGTH = 15000; // Nombre maximum de caractères à envoyer à Claude
    }
  
    preprocessCV(cvText) {
      if (!cvText) return '';
      
      // Supprimer les caractères spéciaux inutiles
      let processed = cvText.replace(/[\r\n]+/g, '\n');
      
      // Supprimer les espaces multiples
      processed = processed.replace(/\s+/g, ' ');
      
      // Normaliser les formats de date
      processed = processed.replace(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})/g, '$1/$2/$3');
      
      // Limiter la taille pour les CV trop longs
      if (processed.length > this.MAX_CV_LENGTH) {
        const relevantSections = this.extractRelevantSections(processed);
        if (relevantSections.length > 0 && relevantSections.length < this.MAX_CV_LENGTH) {
          processed = relevantSections;
        } else {
          processed = processed.substring(0, this.MAX_CV_LENGTH);
        }
      }
      
      return processed;
    }
  
    extractRelevantSections(cvText) {
      // Tentative d'identification des sections importantes
      const sections = {
        experience: this.extractSection(cvText, /expérience|experience|parcours professionnel|emplois/i),
        education: this.extractSection(cvText, /formation|education|études|diplômes/i),
        skills: this.extractSection(cvText, /compétences|skills|technologies|connaissances/i),
        languages: this.extractSection(cvText, /langues|languages/i),
        contact: this.extractSection(cvText, /contact|coordonnées|email|téléphone/i)
      };
      
      // Assembler les sections dans un ordre prioritaire
      return [
        sections.contact,
        sections.experience,
        sections.skills,
        sections.education,
        sections.languages
      ].filter(Boolean).join('\n\n');
    }
  
    extractSection(text, sectionRegex) {
      const lines = text.split('\n');
      let inSection = false;
      let sectionContent = [];
      let sectionEndMarkers = [
        /expérience|formation|compétences|langues|contact|projets|certifications/i
      ];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Détection du début de la section
        if (!inSection && line.match(sectionRegex)) {
          inSection = true;
          sectionContent.push(line);
          continue;
        }
        
        // Ajout des lignes de la section
        if (inSection) {
          // Détection de la fin de section (début d'une autre section)
          if (i > 0 && sectionEndMarkers.some(marker => line.match(marker)) && 
              !line.match(sectionRegex)) {
            break;
          }
          sectionContent.push(line);
        }
      }
      
      return sectionContent.join('\n');
    }
  
    extractBasicInfo(cvText) {
      // Extraction de l'email
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const emails = cvText.match(emailRegex) || [];
      
      // Extraction du téléphone (formats variés)
      const phoneRegex = /(\+?[0-9]{10,14})|(\+?[0-9]{2,4}[\s-][0-9]{2,3}[\s-][0-9]{2,3}[\s-][0-9]{2,3})/g;
      const phones = cvText.match(phoneRegex) || [];
      
      // Tentative d'extraction du nom
      const nameRegex = /(curriculum vitae|cv)[\s:]*([a-zÀ-ÿ\s]{2,40})/i;
      const nameMatch = cvText.match(nameRegex);
      const name = nameMatch ? nameMatch[2].trim() : '';
      
      return {
        email: emails[0] || "",
        phone_number: phones[0] || "",
        candidate_name: name
      };
    }
  }
  
  module.exports = new TextPreprocessingService();