// elasticsearch.js - version corrigée
const { Client } = require('@elastic/elasticsearch');
const esConfig = require('./elasticsearch.config');

const client = new Client(esConfig.defaultConfig);

async function testConnection() {
  try {
    // Affiche la configuration utilisée
    let connectionInfo = 'Non disponible';
    try {
      const connection = client.transport.getConnection();
      if (connection) {
        connectionInfo = connection.url;
      }
    } catch (connErr) {
      console.warn('Impossible de récupérer les informations de connexion:', connErr.message);
    }
    
    console.log('Tentative de connexion à:', connectionInfo);
    console.log('Mode:', process.env.NODE_ENV || 'Non défini (utilisation des paramètres par défaut)');
    
    const ping = await client.ping();
    console.log('Connexion à Elasticsearch réussie', ping);
    
    // Vérifier l'état de l'index
    try {
      const indexStatus = await client.indices.stats({ index: esConfig.index });
      console.log('Statistiques de l\'index:', {
        docsCount: indexStatus._all.total.docs.count,
        size: indexStatus._all.total.store.size_in_bytes
      });
    } catch (indexErr) {
      console.warn('L\'index n\'existe pas encore ou n\'est pas accessible');
    }
    
    return true;
  } catch (error) {
    console.error('Échec de la connexion à Elasticsearch:', error);
    
    // Affiche des informations détaillées sur l'erreur d'authentification
    if (error.meta && error.meta.statusCode === 401) {
      console.error('Erreur 401: Problème d\'authentification');
      console.error('Vérifiez les variables d\'environnement:');
      console.error('- NODE_ENV est:', process.env.NODE_ENV);
      console.error('- ELASTIC_PASSWORD est-il défini?', !!process.env.ELASTIC_PASSWORD);
      console.error('- Paramètres d\'authentification:', client.transport.connectionPool?.connections?.[0]?.auth ? 'Présents' : 'Absents');
    }
    
    // Renvoie false au lieu de lever une exception
    return false;
  }
}

// Fonction utilitaire pour vérifier le contenu de l'index
async function checkIndexContent() {
  try {
    const results = await client.search({
      index: esConfig.index,
      size: 100  // Ajustez selon vos besoins
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
    // Retourne un tableau vide au lieu de lever une exception
    return [];
  }
}

async function setupElasticsearch() {
  try {
    // Teste d'abord la connexion
    const connected = await testConnection();
    if (!connected) {
      console.warn('Configuration d\'Elasticsearch ignorée en raison de problèmes de connexion');
      return { success: false, message: 'Problème de connexion' };
    }
    
    const indexExists = await client.indices.exists({ index: esConfig.index });
    
    if (!indexExists) {  // Seulement si l'index n'existe pas
      const response = await client.indices.create({
        index: esConfig.index,
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
      return { success: true, message: 'Nouvel index créé' };
    }

    // Si l'index existe, on met à jour le mapping pour ajouter les experiences
    const updateMapping = await client.indices.putMapping({
      index: esConfig.index,
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

    const count = await client.count({ index: esConfig.index });
    console.log('Documents existants dans l\'index:', count.count);
    return { 
      success: true, 
      message: 'Index mis à jour et conservé', 
      documentsCount: count.count 
    };

  } catch (error) {
    console.error('Erreur lors de la configuration d\'Elasticsearch:', error);
    return { 
      success: false, 
      message: 'Erreur de configuration',
      error: error.message
    };
  }
}

module.exports = { 
  client, 
  setupElasticsearch,
  testConnection,
  checkIndexContent
};