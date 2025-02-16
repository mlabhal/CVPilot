const { client } = require('../../../config/elasticsearch');
const fs = require('fs').promises;
const path = require('path');

async function restoreBackup() {
  try {
    const backupPath = path.join(__dirname, '../backup/cv-backup.json');
    console.log('Lecture du backup...');
    
    const backupData = JSON.parse(
      await fs.readFile(backupPath, 'utf8')
    );
    
    console.log(`Restauration de ${backupData.length} documents...`);
    
    // Recréation de l'index si nécessaire
    const indexExists = await client.indices.exists({ index: 'cvs' });
    if (!indexExists) {
        await client.indices.create({
            index: 'cvs',
            body: {
              settings: {
                number_of_shards: 1,
                number_of_replicas: 0
              },
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
    }
    
    // Restauration des données
    const bulkBody = backupData.flatMap(doc => [
      { index: { _index: 'cvs', _id: doc._id } },
      doc._source
    ]);
    
    if (bulkBody.length > 0) {
      await client.bulk({
        refresh: true,
        body: bulkBody
      });
    }
    
    console.log('Restauration terminée avec succès!');
    
  } catch (error) {
    console.error('Erreur lors de la restauration:', error);
    process.exit(1);
  }
}

restoreBackup();