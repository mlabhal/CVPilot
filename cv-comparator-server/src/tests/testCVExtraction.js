const path = require('path');
const fs = require('fs').promises;
const cvService = require('../services/cv.service');

async function testCVExtraction(filePath, description = '') {
  try {
    // Extraction du texte
    const text = await cvService.extractText(filePath);
    console.log('Texte extrait avec succès');
    console.log('Longueur du texte:', text.length);
    console.log('Début du texte:', text.substring(0, 500));

    // Analyse du CV avec attente de l'initialisation des modèles
    console.log('Démarrage de l\'analyse...');
    const analysis = await cvService.analyzeCV(text, description);
    
    // Affichage détaillé des résultats
    console.log('\nRésultats de l\'analyse:');
    console.log('------------------------');
    console.log('Compétences:', analysis.skills.length, 'trouvées');
    console.log('Outils:', analysis.tools.length, 'trouvés');
    console.log('Années d\'expérience:', analysis.experience_years);
    console.log('Formation:', analysis.education.length, 'entrées');
    console.log('Langues:', analysis.languages.length, 'trouvées');
    
    // Affichage des résultats de correspondance avec la description si fournie
    if (description) {
      console.log('\nAnalyse de la correspondance avec la description:');
      console.log('------------------------');
      if (analysis.descriptionMatch) {
        console.log('Score de correspondance:', (analysis.descriptionMatch.score * 100).toFixed(1) + '%');
        
        if (analysis.descriptionMatch.relevantExperiences?.length > 0) {
          console.log('\nExpériences pertinentes:');
          analysis.descriptionMatch.relevantExperiences.forEach(exp => console.log(`- ${exp}`));
        }
        
        if (analysis.descriptionMatch.keywordMatches?.length > 0) {
          console.log('\nMots-clés correspondants:');
          analysis.descriptionMatch.keywordMatches.forEach(keyword => console.log(`- ${keyword}`));
        }
      } else {
        console.log('Pas d\'analyse de correspondance disponible');
      }
    }
    
    // Affichage détaillé des compétences et outils
    if (analysis.skills.length > 0) {
      console.log('\nCompétences détectées:');
      analysis.skills.forEach(skill => console.log(`- ${skill}`));
    }
    
    if (analysis.tools.length > 0) {
      console.log('\nOutils détectés:');
      analysis.tools.forEach(tool => console.log(`- ${tool}`));
    }

  } catch (error) {
    console.error('Erreur lors du test:', {
      message: error.message,
      stack: error.stack,
      fileName: path.basename(filePath)
    });
  }
}

// Fonction pour tester tous les CVs du dossier
async function testAllCVs() {
  try {
    // Description de test
    const testDescription = `Nous recherchons un développeur fullstack expérimenté avec une expertise en JavaScript/TypeScript, 
    React et Node.js. Le candidat idéal aura une expérience dans le développement d'applications web modernes et une bonne 
    compréhension des principes de l'architecture logicielle.`;

    // Attendre que les modèles ML soient initialisés
    console.log('Initialisation des modèles ML...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    const files = await fs.readdir(uploadDir);
    const cvFiles = files.filter(file => 
      file.endsWith('.pdf') || 
      file.endsWith('.docx') || 
      file.endsWith('.doc')
    );

    if (cvFiles.length === 0) {
      console.log('Aucun CV trouvé dans le dossier uploads');
      return;
    }

    console.log(`\nDébut des tests - ${cvFiles.length} fichier(s) trouvé(s)`);
    
    // Test sans description
    console.log('\n=== Tests sans description de poste ===');
    for (const file of cvFiles) {
      console.log(`\n=== Test du fichier: ${file} ===`);
      const filePath = path.join(uploadDir, file);
      await testCVExtraction(filePath);
      console.log('='.repeat(40));
    }

    // Test avec description
    console.log('\n=== Tests avec description de poste ===');
    for (const file of cvFiles) {
      console.log(`\n=== Test du fichier: ${file} avec description ===`);
      const filePath = path.join(uploadDir, file);
      await testCVExtraction(filePath, testDescription);
      console.log('='.repeat(40));
    }

    console.log('\nTests terminés');
  } catch (error) {
    console.error('Erreur lors des tests:', error);
  }
}

// Vérification du dossier uploads
async function checkUploadsFolder() {
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  try {
    await fs.access(uploadDir);
  } catch (error) {
    console.log('Création du dossier uploads...');
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

// Lancement des tests
(async () => {
  await checkUploadsFolder();
  await testAllCVs();
})();