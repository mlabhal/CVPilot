const { Client } = require('@elastic/elasticsearch');

// Configuration conditionnelle du client Elasticsearch
function createElasticsearchClient() {
  const isProduction = process.env.NODE_ENV === 'production';
  const node = process.env.ELASTICSEARCH_NODE_LOCAL || process.env.ELASTICSEARCH_NODE_DIGITALOCEAN;
  
  // Configuration de base
  const config = {
    node: node,
    tls: {
      rejectUnauthorized: false // À utiliser uniquement en développement
    }
  };
  
  // Ajoute l'authentification uniquement en production
  if (isProduction && process.env.ELASTIC_PASSWORD) {
    config.auth = {
      username: 'elastic',
      password: process.env.ELASTIC_PASSWORD
    };
    console.log('Client Elasticsearch: Mode production avec authentification');
  } else {
    console.log('Client Elasticsearch: Mode développement sans authentification');
  }
  
  return new Client(config);
}

const client = createElasticsearchClient();

async function setupElasticsearch() {
  try {
    const indexExists = await client.indices.exists({ index: 'cvs' });
    
    if (!indexExists) {  // Seulement si l'index n'existe pas
      const response = await client.indices.create({
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
              experiences: {  // Nouveau champ experiences
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
      console.log('Nouvel index créé avec succès:', response);
      return response;
    }

    // Si l'index existe, on met à jour le mapping pour ajouter les experiences
    const updateMapping = await client.indices.putMapping({
      index: 'cvs',
      body: {
        properties: {
          experiences: {
            type: 'nested',
            properties: {
              title: { type: 'text' },
              company: { type: 'text' },
              description: { type: 'text' },
              duration: { type: 'text' }
            }
          }
        }
      }
    });
    console.log('Mapping mis à jour avec succès:', updateMapping);

    const count = await client.count({ index: 'cvs' });
    console.log('Documents existants dans l\'index:', count.count);
    return { message: 'Index mis à jour et conservé', documentsCount: count.count };

  } catch (error) {
    console.error('Erreur lors de la configuration d\'Elasticsearch:', error);
    throw error;
  }
}

async function testConnection() {
  try {
    // Affiche la configuration utilisée
    console.log('Tentative de connexion à:', client.transport.getConnection().url);
    if (process.env.NODE_ENV === 'production') {
      console.log('Mode: Production');
    } else {
      console.log('Mode: Développement');
    }
    
    const ping = await client.ping();
    console.log('Connexion à Elasticsearch réussie', ping);
    
    // Vérifier l'état de l'index
    const indexStatus = await client.indices.stats({ index: 'cvs' });
    console.log('Statistiques de l\'index:', {
      docsCount: indexStatus._all.total.docs.count,
      size: indexStatus._all.total.store.size_in_bytes
    });
    
    return true;
  } catch (error) {
    console.error('Échec de la connexion à Elasticsearch:', error);
    
    // Affiche des informations détaillées sur l'erreur d'authentification
    if (error.meta && error.meta.statusCode === 401) {
      console.error('Erreur 401: Problème d\'authentification');
      console.error('Vérifiez les variables d\'environnement:');
      console.error('- NODE_ENV est:', process.env.NODE_ENV);
      console.error('- ELASTIC_PASSWORD est-il défini?', !!process.env.ELASTIC_PASSWORD);
    }
    
    throw error;
  }
}

// Fonction utilitaire pour vérifier le contenu de l'index
async function checkIndexContent() {
  try {
    const results = await client.search({
      index: 'cvs',
      body: {
        query: { match_all: {} },
        size: 100  // Ajustez selon vos besoins
      }
    });
    
    console.log('Contenu de l\'index:', {
      total: results.hits.total.value,
      documents: results.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        source: hit._source
      }))
    });
    
    return results.hits.hits;
  } catch (error) {
    console.error('Erreur lors de la vérification du contenu:', error);
    throw error;
  }
}

module.exports = { 
  client, 
  setupElasticsearch,
  testConnection,
  checkIndexContent  // Export de la nouvelle fonction
};