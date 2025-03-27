const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class FileExtractionService {
  constructor() {
    // Pas de configuration particulière
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
    try {
      // Importer explicitement les modules nécessaires
      const fsPromises = require('fs').promises;
      const fs = require('fs'); // Pour le streaming si nécessaire
      
      // Vérifier la taille du fichier de manière sécurisée
      let isLarge = false;
      try {
        const stats = await fsPromises.stat(filePath);
        isLarge = stats.size > 10 * 1024 * 1024; // 10MB
      } catch (statError) {
        console.warn(`Impossible de vérifier la taille du fichier, utilisation de l'approche standard: ${statError.message}`);
      }
      
      if (isLarge) {
        // Approche par stream pour les PDF volumineux
        return new Promise((resolve, reject) => {
          const pdfParser = new (require('pdf-parse').PDFParser)();
          
          pdfParser.on('pdfParser_dataReady', data => {
            try {
              const text = data.Pages.map(page => 
                page.Texts.map(text => 
                  text.R.map(r => r.T).join('')
                ).join(' ')
              ).join('\n');
              resolve(text);
            } catch (parseError) {
              reject(new Error(`Erreur lors du parsing du PDF: ${parseError.message}`));
            }
          });
          
          pdfParser.on('pdfParser_dataError', err => {
            reject(err);
          });
          
          const readStream = fs.createReadStream(filePath);
          readStream.pipe(pdfParser);
        });
      } else {
        // Pour les petits fichiers, utiliser l'approche standard
        const dataBuffer = await fsPromises.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
      }
    } catch (error) {
      console.error(`Erreur lors de l'extraction du texte PDF (${filePath}):`, error);
      throw new Error(`Impossible de lire le fichier PDF: ${error.message}`);
    }
  }

  async extractTextFromWord(filePath) {
    try {
      // Utiliser fs.promises au lieu de fs standard
      const fsPromises = require('fs').promises;
      const buffer = await fsPromises.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte Word:', error);
      throw new Error(`Impossible de lire le fichier Word: ${error.message}`);
    }
  }

  async cleanupFile(filePath) {
    try {
      const fsPromises = require('fs').promises;
      await fsPromises.unlink(filePath);
      console.log(`Fichier supprimé: ${filePath}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier ${filePath}:`, error);
    }
  }
}

module.exports = new FileExtractionService();