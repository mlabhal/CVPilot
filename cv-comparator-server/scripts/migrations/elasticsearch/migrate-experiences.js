const { client } = require('../../../config/elasticsearch');
const fs = require('fs').promises;
const path = require('path');

async function migrateIndex() {
  try {
    console.log('Début de la migration...');
    
    // 1. Backup
    console.log('Sauvegarde des données existantes...');
    const backup = await client.search({
      index: 'cvs',
      body: {
        query: { match_all: {} },
        size: 10000
      }
    });

    // Sauvegarde dans un fichier
    const backupPath = path.join(__dirname, '../backup/cv-backup.json');
    await fs.writeFile(
      backupPath,
      JSON.stringify(backup.hits.hits, null, 2)
    );
    console.log(`Backup sauvegardé dans: ${backupPath}`);
    
    // 2. Suppression de l'ancien index
    console.log('Suppression de l\'ancien index...');
    await client.indices.delete({ index: 'cvs' });
    
    // 3. Création du nouvel index
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
            education: { type: 'text' },
            languages: { type: 'keyword' },
            experiences: {
              type: 'nested',
              properties: {
                title: { type: 'text' },
                company: { type: 'text' },
                description: { type: 'text' },
                duration: { type: 'text' }
              }
            },
            indexed_date: { type: 'date' }
          }
        }
      }
    });
    
    // 4. Réindexation
    console.log('Réindexation des données...');
    const bulkBody = backup.hits.hits.flatMap(doc => [
      { index: { _index: 'cvs', _id: doc._id } },
      { ...doc._source, experiences: [] }
    ]);

    if (bulkBody.length > 0) {
      await client.bulk({
        refresh: true,
        body: bulkBody
      });
    }
    
    console.log('Migration terminée avec succès!');
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Exécution de la migration
migrateIndex();