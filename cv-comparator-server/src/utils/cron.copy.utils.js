const { Client } = require('@elastic/elasticsearch');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Création du client Elasticsearch
const esClient = new Client({
  node: 'http://165.22.113.118:9200' // À adapter selon votre configuration
});

// Fonction principale qui gère à la fois les fichiers et Elasticsearch
async function synchronizeFilesAndElasticsearch() {
  try {
    console.log('Début de la synchronisation fichiers/Elasticsearch');
    
    // 1. D'abord supprimer les doublons de fichiers
    const { fileGroups, deletedFiles } = await removeDuplicateFiles();
    
    // 2. Ensuite mettre à jour Elasticsearch
    await updateElasticsearchIndex(fileGroups, deletedFiles);
    
    console.log('Synchronisation terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
    throw error;
  }
}
function reindexCVsOnElasticsearch() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../scripts/reindexCVs.js');
    
    const child = spawn('node', [scriptPath]);

    child.stdout.on('data', (data) => {
      console.log(`Réindexation CVs - Output: ${data}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`Réindexation CVs - Erreur: ${data}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('Réindexation des CVs terminée avec succès');
        resolve();
      } else {
        console.error(`Réindexation des CVs a échoué avec le code ${code}`);
        reject(new Error(`Script de réindexation exited with code ${code}`));
      }
    });
  });
}
async function removeDuplicateFiles() {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    console.log('Dossier uploads:', uploadsDir);

    const files = await fs.readdir(uploadsDir);
    console.log('Nombre de fichiers trouvés:', files.length);
    
    const fileGroups = new Map();
    
    // Fonction améliorée pour normaliser le nom
    function normalizeFileName(name) {
      const normalized = name.toLowerCase()
        .replace(/\(.*?\)/g, '')       // Supprime tout ce qui est entre parenthèses, y compris les chiffres
        .replace(/^(\d+)|(\d+)$/g, '') // Supprime les chiffres au début et à la fin
        .replace(/cv|[-_().,]/g, '')   // Enlève "cv" et les caractères spéciaux
        .replace(/\s+/g, '')           // Enlève tous les espaces
        .replace(/(\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\d{4}|\d{2})$/, '') // Supprime les dates à la fin
        .normalize('NFD')              // Décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, ''); // Enlève les accents
    
      // Nouvelle étape : trier alphabétiquement les lettres du nom
      return normalized.split('').sort().join('');
    }
    
    function getTimestamp(fileName) {
      const match = fileName.match(/^(\d+)-/);
      return match ? parseInt(match[1]) : 0;
    }

    // Debug: Afficher les noms normalisés
    for (const file of files) {
      const nameMatch = file.match(/^\d+-(.+)\.(pdf|doc|docx)$/i);
      if (nameMatch) {
        const fullName = nameMatch[1];
        const normalizedName = normalizeFileName(fullName);
        console.log(`Original: ${fullName} -> Normalisé: ${normalizedName}`);
      }
    }

    // Grouper les fichiers
    for (const file of files) {
      const timestamp = getTimestamp(file);
      const nameMatch = file.match(/^\d+-(.+)\.(pdf|doc|docx)$/i);
      
      if (!nameMatch) {
        console.log(`Fichier ignoré (ne correspond pas au pattern): ${file}`);
        continue;
      }
      
      const fullName = nameMatch[1];
      const normalizedName = normalizeFileName(fullName);
      const fullPath = path.join(uploadsDir, file);
      const stats = await fs.stat(fullPath);
      
      if (!fileGroups.has(normalizedName)) {
        fileGroups.set(normalizedName, []);
      }
      
      fileGroups.get(normalizedName).push({
        path: fullPath,
        timestamp: timestamp,
        mtime: stats.mtime,
        originalName: file,
        normalizedName: normalizedName, // Ajouté pour le debug
        extension: path.extname(file).toLowerCase()
      });
    }
    
    // Debug: Afficher les groupes
    console.log('\nGroupes de fichiers trouvés:');
    for (const [name, files] of fileGroups) {
      console.log(`\nGroupe '${name}':`);
      files.forEach(f => console.log(`- ${f.originalName} (timestamp: ${f.timestamp})`));
    }

    const deletionPromises = [];
    
    for (const [normalizedName, versions] of fileGroups) {
      versions.sort((a, b) => b.timestamp - a.timestamp);
      
      const [keepFile, ...duplicates] = versions;
      console.log(`\nPour ${normalizedName}:`);
      console.log(`- Garde: ${keepFile.originalName} (timestamp: ${keepFile.timestamp})`);
      
      for (const duplicate of duplicates) {
        console.log(`- Supprime: ${duplicate.originalName} (timestamp: ${duplicate.timestamp})`);
        const deletionPromise = fs.unlink(duplicate.path)
          .then(() => console.log(`✔️ Fichier supprimé avec succès: ${duplicate.originalName}`))
          .catch(err => console.error(`❌ Erreur lors de la suppression de ${duplicate.originalName}:`, err));
        deletionPromises.push(deletionPromise);
      }
    }
    
    await Promise.all(deletionPromises);
    
    const remainingFiles = await fs.readdir(uploadsDir);
    
    console.log(`\nRésumé du nettoyage:
      - Total fichiers initiaux: ${files.length}
      - Personnes uniques: ${fileGroups.size}
      - Doublons supprimés: ${files.length - fileGroups.size}
      - Fichiers restants: ${remainingFiles.length}
    `);
    
  } catch (error) {
    console.error('Erreur lors du nettoyage des doublons:', error);
  }
}

// Nouvelle fonction pour initialiser tous les jobs cron
function initAllCronJobs() {
  // Nettoie les doublons à minuit
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Début des tâches cron quotidiennes');
      
      // Supprimer les fichiers en double
      await removeDuplicateFiles();
      
      // Réindexer les CVs
      await reindexCVsOnElasticsearch();
      
      console.log('Tâches cron quotidiennes terminées');
    } catch (error) {
      console.error('Erreur lors des tâches cron quotidiennes:', error);
    }
  });
  
  console.log('Cron jobs initialisés');
}

// Fonction de test pour vérifier manuellement
async function testAllJobs() {
  console.log('Démarrage du test de tous les jobs...');
  await removeDuplicateFiles();
  await reindexCVsOnElasticsearch();
  console.log('Test des jobs terminé');
}

module.exports = {
  removeDuplicateFiles,
  reindexCVsOnElasticsearch,
  initAllCronJobs,
  testAllJobs
};