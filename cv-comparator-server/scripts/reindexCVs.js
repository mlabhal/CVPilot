// scripts/reindexCVs.js
const CVService = require('../src/services/cv.service');
const fs = require('fs').promises;
const path = require('path');
const { client } = require('../config/elasticsearch');

async function cleanObsoleteDocuments(currentFiles) {
  try {
    // Rechercher tous les documents dans l'index
    const { body } = await client.search({
      index: 'cvs',
      body: {
        size: 10000, // Augmentez si vous avez plus de 100 documents
        query: { match_all: {} }
      }
    });
    const documentsToDelete = [];

    // Comparer chaque document avec les fichiers actuels
    body.hits.hits.forEach(hit => {
      const fileName = hit._source.fileName || hit._source.name;
      
      // Vérifier si le nom du fichier existe dans les fichiers actuels
      const matchingFile = currentFiles.some(currentName => 
        fileName.toLowerCase().includes(currentName.toLowerCase())
      );

      if (!matchingFile) {
        documentsToDelete.push(hit._id);
      }
    });

    // Supprimer les documents obsolètes
    if (documentsToDelete.length > 0) {
      const deleteResponse = await client.deleteByQuery({
        index: 'cvs',
        body: {
          query: {
            ids: {
              values: documentsToDelete
            }
          }
        }
      });

      console.log(`Suppression de ${documentsToDelete.length} documents obsolètes`);
      console.log('Détails de la suppression:', deleteResponse.body);
      
      return documentsToDelete.length;
    } else {
      console.log('Aucun document obsolète à supprimer');
      return 0;
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage de l\'index:', error);
    throw error;
  }
}

async function reindexAllCVs() {
  try {
    // 1. Préparer les fichiers
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadsDir);
    const validFiles = files.filter(file => 
      ['.pdf', '.doc', '.docx'].includes(path.extname(file).toLowerCase())
    );

    // 2. Nettoyer les documents obsolètes
    const obsoleteDocsCount = await cleanObsoleteDocuments(validFiles);

    // 3. Vérifier/créer l'index
    const indexExists = await client.indices.exists({ index: 'cvs' });
    if (indexExists) {
      console.log('Suppression de l\'ancien index...');
      await client.indices.delete({ index: 'cvs' });
    }

    console.log('Création du nouvel index...');
    await client.indices.create({
      index: 'cvs',
      body: {
        mappings: {
          properties: {
            fileName: { type: 'keyword' },
            skills: { type: 'keyword' },
            tools: { type: 'keyword' },
            experience_years: { type: 'integer' },
            education: { type: 'keyword' },
            languages: { type: 'keyword' },
            indexed_date: { type: 'date' }
          }
        }
      }
    });

    console.log(`Début réindexation: ${validFiles.length} fichiers trouvés`);

    const results = {
      success: 0,
      failed: 0,
      files: [],
      obsolete_docs_removed: obsoleteDocsCount
    };

    // 4. Traiter les fichiers (reste du code inchangé)
    for (const file of validFiles) {
      const filePath = path.join(uploadsDir, file);
      try {
        console.log(`Traitement de ${file}...`);
        const text = await CVService.extractText(filePath);
        const analysis = await CVService.analyzeCV(text);
        const indexed = await CVService.indexCV(analysis, file);

        if (indexed) {
          results.success++;
          results.files.push({ file, status: 'success' });
          console.log(`✓ Réindexé: ${file}`);
        } else {
          results.failed++;
          results.files.push({ file, status: 'failed' });
          console.log(`✗ Échec: ${file}`);
        }
      } catch (error) {
        results.failed++;
        results.files.push({ file, status: 'error', error: error.message });
        console.error(`Erreur traitement ${file}:`, error);
      }
    }

    // 5. Vérification finale
    const count = await client.count({ index: 'cvs' });
    console.log('\nRésumé de la réindexation:');
    console.log('-------------------------');
    console.log(`Total fichiers valides: ${validFiles.length}`);
    console.log(`Documents obsolètes supprimés: ${obsoleteDocsCount}`);
    console.log(`Succès: ${results.success}`);
    console.log(`Échecs: ${results.failed}`);
    console.log(`Documents dans l'index: ${count.count}`);

    // 6. Sauvegarder le rapport
    const reportPath = path.join(__dirname, 'reindex-report.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nRapport détaillé sauvegardé dans: ${reportPath}`);

  } catch (error) {
    console.error('Erreur critique lors de la réindexation:', error);
    process.exit(1);
  }
}

// Exécution (reste inchangée)
console.log('Démarrage de la réindexation...');
reindexAllCVs()
  .then(() => {
    console.log('Réindexation terminée avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });