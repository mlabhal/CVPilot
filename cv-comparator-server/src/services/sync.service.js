const { Client } = require('@elastic/elasticsearch');
const fs = require('fs').promises;
const path = require('path');

class SyncService {
  static config = {
    elasticsearch: {
      node: process.env.ELASTICSEARCH_URL || 'https://165.22.113.118:9200',
      index: 'cvs',
      batchSize: 1000
    },
    paths: {
      uploads: path.join(__dirname, '../../uploads'),
      backups: path.join(__dirname, '../../backups')
    }
  };

  static esClient = new Client({
    node: SyncService.config.elasticsearch.node
  });

  static async cleanupElasticsearchIndex() {
    try {
      console.log('Début du nettoyage de l\'index Elasticsearch...');
      
      // Récupérer tous les documents de l'index
      const { hits } = await this.esClient.search({
        index: this.config.elasticsearch.index,
        size: this.config.elasticsearch.batchSize,
        query: { match_all: {} }
      });

      const documents = hits.hits;
      const documentGroups = new Map();
      const deletedDocs = new Set();
      const keptDocs = new Set();

      console.log('Début analyse des documents dans l\'index...');

      // Groupement des documents par personne
      for (const doc of documents) {
        const fileInfo = this.extractNameFromFile(doc._id);
        if (!fileInfo) {
          console.log(`Document ignoré (format non reconnu): ${doc._id}`);
          continue;
        }

        const normalizedName = this.normalizePersonName(fileInfo.name);
        if (!normalizedName) {
          console.log(`Document ignoré (nom non valide): ${doc._id}`);
          continue;
        }
        
        if (!documentGroups.has(normalizedName)) {
          documentGroups.set(normalizedName, []);
        }
        
        documentGroups.get(normalizedName).push({
          id: doc._id,
          timestamp: fileInfo.timestamp,
          source: doc._source
        });

        console.log(`Document analysé: ${doc._id} -> ${normalizedName}`);
      }

      // Préparation des opérations de suppression
      const deleteOperations = [];

      // Traitement des doublons pour chaque personne
      for (const [normalizedName, versions] of documentGroups.entries()) {
        console.log(`\nTraitement des documents pour: ${normalizedName}`);
        console.log(`Nombre de versions trouvées: ${versions.length}`);

        // Trie par timestamp décroissant (plus récent en premier)
        versions.sort((a, b) => b.timestamp - a.timestamp);
        
        if (versions.length === 0) continue;

        // Garde la version la plus récente
        const keepDoc = versions[0];
        keptDocs.add(keepDoc.id);
        console.log(`Conservation du document le plus récent: ${keepDoc.id}`);

        // Marque les anciennes versions pour suppression
        for (let i = 1; i < versions.length; i++) {
          const duplicate = versions[i];
          deletedDocs.add(duplicate.id);
          deleteOperations.push({
            delete: { _index: this.config.elasticsearch.index, _id: duplicate.id }
          });
          console.log(`Document marqué pour suppression: ${duplicate.id}`);
        }
      }

      // Suppression des doublons de l'index
      if (deleteOperations.length > 0) {
        console.log(`\nSuppression de ${deleteOperations.length} documents dans l'index...`);
        
        const bulkResponse = await this.esClient.bulk({
          refresh: true,
          operations: deleteOperations
        });

        if (bulkResponse.errors) {
          console.error('Erreurs lors de la suppression:', bulkResponse.errors);
        } else {
          console.log('Documents supprimés avec succès');
        }

        await this.esClient.indices.refresh({ index: this.config.elasticsearch.index });
      }

      console.log(`\nNettoyage de l'index terminé: ${keptDocs.size} documents conservés, ${deletedDocs.size} doublons supprimés`);
      console.log('Documents conservés:', Array.from(keptDocs));
      console.log('Documents supprimés:', Array.from(deletedDocs));

      return {
        deletedDocs: Array.from(deletedDocs),
        keptDocs: Array.from(keptDocs)
      };
    } catch (error) {
      console.error('Erreur lors du nettoyage de l\'index:', error);
      throw error;
    }
  }

  static async initializeSyncService() {
    try {
      await fs.mkdir(this.config.paths.backups, { recursive: true });
      console.log('Service de synchronisation initialisé');
    } catch (error) {
      console.error('Erreur d\'initialisation du service de sync:', error);
      throw error;
    }
  }

  static async synchronizeFilesAndES() {
    try {
      console.log('Début de la synchronisation fichiers/Elasticsearch');
      
      // 1. Backup de l'index avant modifications
      await this.backupElasticsearchIndex();
      
      // 2. Nettoyage des fichiers physiques
      const { deletedFiles, keptFiles } = await this.cleanupFiles();
      
      // 3. Nettoyage de l'index Elasticsearch
      const deletedFromES = await this.cleanupElasticsearchIndex();
      
      return { 
        success: true, 
        deletedFiles, 
        keptFiles,
        deletedFromES 
      };
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      throw error;
    }
  }

  static async backupElasticsearchIndex() {
    try {
      const timestamp = Date.now();
      const backupFile = path.join(this.config.paths.backups, `es_backup_${timestamp}.json`);
      
      const indexExists = await this.esClient.indices.exists({
        index: this.config.elasticsearch.index
      });
  
      if (!indexExists) {
        console.warn(`L'index ${this.config.elasticsearch.index} n'existe pas`);
        return;
      }
  
      try {
        console.log('Tentative de backup avec API ES 8.x...');
        const searchResponse = await this.esClient.search({
          index: this.config.elasticsearch.index,
          size: this.config.elasticsearch.batchSize,
          query: { match_all: {} }
        });
        
        if (searchResponse.hits && searchResponse.hits.hits) {
          const hits = searchResponse.hits.hits;
          await fs.writeFile(backupFile, JSON.stringify(hits, null, 2));
          console.log(`Backup ES créé (8.x): ${backupFile} avec ${hits.length} documents`);
          return;
        }
      } catch (e) {
        console.log('Tentative avec API ES 7.x...');
        const { body } = await this.esClient.search({
          index: this.config.elasticsearch.index,
          size: this.config.elasticsearch.batchSize,
          body: { query: { match_all: {} } }
        });
        
        if (body?.hits?.hits) {
          const hits = body.hits.hits;
          await fs.writeFile(backupFile, JSON.stringify(hits, null, 2));
          console.log(`Backup ES créé (7.x): ${backupFile} avec ${hits.length} documents`);
          return;
        }
      }
  
      throw new Error('Impossible de récupérer les documents ES');
    } catch (error) {
      console.error('Erreur lors du backup ES:', error);
      throw error;
    }
  }

  static extractNameFromFile(filename) {
    // Patterns améliorés pour les noms de fichiers CV
    const patterns = [
      // Format: timestamp-CV NOM Prénom (numéro).extension
      /^(\d+)-CV\s+([^(]+?)(?:\s*\(\d+\))?\.(pdf|docx?)$/i,
      
      // Format: timestamp-CV-Nom-Prénom-date.extension
      /^(\d+)-CV[-\s](.+?)(?:[-_]\d{6,8})?\.(pdf|docx?)$/i,
      
      // Format: timestamp-CV-Nom-Prénom.extension
      /^(\d+)-CV[-\s](.+?)\.(pdf|docx?)$/i,
      
      // Format: timestamp-Nom-Prénom.extension
      /^(\d+)-(.+?)\.(pdf|docx?)$/i
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        return {
          timestamp: parseInt(match[1]),
          name: this.cleanPersonName(match[2])
        };
      }
    }
    return null;
  }
  static cleanPersonName(name) {
    return name
      // Remplace les tirets et underscores par des espaces
      .replace(/[-_]/g, ' ')
      // Supprime les espaces multiples
      .replace(/\s+/g, ' ')
      // Supprime les espaces en début et fin
      .trim();
  }
  static normalizePersonName(name) {
    if (!name) return null;
    
    return name.toLowerCase()
      // Supprime les accents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Supprime tout ce qui est entre parenthèses
      .replace(/\([^)]*\)/g, '')
      // Supprime les mentions "cv" ou "resume"
      .replace(/\b(cv|resume)\b/gi, '')
      // Supprime les dates (format: DDMMYYYY ou YYYY ou DDMM)
      .replace(/\b\d{2}(0[1-9]|1[0-2])(19|20)\d{2}\b|\b(19|20)\d{2}\b|\b\d{2}(0[1-9]|1[0-2])\b/g, '')
      // Supprime les caractères spéciaux et chiffres
      .replace(/[^a-z\s]/g, '')
      // Supprime les espaces multiples
      .replace(/\s+/g, ' ')
      // Trie les mots pour assurer une correspondance quel que soit l'ordre
      .split(' ')
      .filter(word => word.length > 0)
      .sort()
      .join(' ')
      .trim();
  }
  static async cleanupFiles() {
    try {
      const files = await fs.readdir(this.config.paths.uploads);
      const fileGroups = new Map();
      const deletedFiles = new Set();
      const keptFiles = new Set();

      console.log('Début analyse des fichiers...');

      // Groupement des fichiers par personne
      for (const file of files) {
        const fileInfo = this.extractNameFromFile(file);
        if (!fileInfo) {
          console.log(`Fichier ignoré (format non reconnu): ${file}`);
          continue;
        }

        const normalizedName = this.normalizePersonName(fileInfo.name);
        if (!normalizedName) {
          console.log(`Fichier ignoré (nom non valide): ${file}`);
          continue;
        }

        const fullPath = path.join(this.config.paths.uploads, file);
        
        if (!fileGroups.has(normalizedName)) {
          fileGroups.set(normalizedName, []);
        }
        
        fileGroups.get(normalizedName).push({
          path: fullPath,
          timestamp: fileInfo.timestamp,
          originalName: file
        });

        console.log(`Fichier analysé: ${file} -> ${normalizedName}`);
      }

      // Traitement des doublons pour chaque personne
      for (const [normalizedName, versions] of fileGroups.entries()) {
        console.log(`\nTraitement des fichiers pour: ${normalizedName}`);
        console.log(`Nombre de versions trouvées: ${versions.length}`);

        // Trie par timestamp décroissant (plus récent en premier)
        versions.sort((a, b) => b.timestamp - a.timestamp);
        
        if (versions.length === 0) continue;

        // Garde la version la plus récente
        const keepFile = versions[0];
        keptFiles.add(keepFile.originalName);
        console.log(`Conservation du fichier le plus récent: ${keepFile.originalName}`);

        // Déplace les anciennes versions vers les backups
        for (let i = 1; i < versions.length; i++) {
          const duplicate = versions[i];
          try {
            const backupPath = path.join(
              this.config.paths.backups,
              `backup_${Date.now()}_${duplicate.originalName}`
            );
            
            await fs.copyFile(duplicate.path, backupPath);
            await fs.unlink(duplicate.path);
            deletedFiles.add(duplicate.originalName);
            
            console.log(`Doublon déplacé vers backup: ${duplicate.originalName} -> ${path.basename(backupPath)}`);
          } catch (error) {
            console.error(`Erreur lors du traitement du doublon ${duplicate.originalName}:`, error);
            throw error;
          }
        }
      }

      console.log(`\nTraitement terminé: ${keptFiles.size} fichiers conservés, ${deletedFiles.size} doublons déplacés`);
      console.log('Fichiers conservés:', Array.from(keptFiles));
      console.log('Fichiers déplacés:', Array.from(deletedFiles));

      return { 
        deletedFiles: Array.from(deletedFiles), 
        keptFiles: Array.from(keptFiles) 
      };
    } catch (error) {
      console.error('Erreur lors du nettoyage des fichiers:', error);
      throw error;
    }
  }

  static async updateElasticsearchIndex(deletedFiles, keptFiles) {
    try {
      if (deletedFiles.length > 0) {
        console.log(`Suppression de ${deletedFiles.length} documents dans Elasticsearch`);
        
        const deleteOperations = deletedFiles.flatMap(filename => ([
          { delete: { _index: this.config.elasticsearch.index, _id: filename } }
        ]));
  
        try {
          // Version 7.x
          const { body } = await this.esClient.bulk({
            refresh: true,
            body: deleteOperations
          });
          
          if (body?.errors) {
            console.error('Erreurs suppression ES:', body.errors);
          } else {
            console.log(`Documents supprimés avec succès de l'index ES`);
          }
        } catch (esError) {
          // Version 8.x
          const bulkResponse = await this.esClient.bulk({
            refresh: true,
            operations: deleteOperations
          });
          
          if (bulkResponse?.errors) {
            console.error('Erreurs suppression ES:', bulkResponse.errors);
          } else {
            console.log(`Documents supprimés avec succès de l'index ES`);
          }
        }
  
        // Vérification après suppression
        const { count } = await this.esClient.count({
          index: this.config.elasticsearch.index
        });
        
        console.log(`Nombre de documents restants dans l'index: ${count}`);
      } else {
        console.log('Aucun document à supprimer dans Elasticsearch');
      }
  
      await this.esClient.indices.refresh({ index: this.config.elasticsearch.index });
      return true;
    } catch (error) {
      console.error('Erreur mise à jour Elasticsearch:', error);
      throw error;
    }
  }
}

module.exports = SyncService;