// config/elasticsearch.config.js
require('dotenv').config(); // Assurez-vous que les variables d'environnement sont chargées

const createConfig = () => {
  // Configuration de base
  const config = {
    node: process.env.ELASTICSEARCH_NODE_DIGITALOCEAN || process.env.ELASTICSEARCH_NODE_LOCAL,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Authentification pour tous les environnements, car le serveur l'exige
  // Si ELASTIC_PASSWORD n'est pas défini, utilisez un mot de passe par défaut pour le dev
  // ⚠️ IMPORTANT: Pour la production, ELASTIC_PASSWORD doit être défini correctement
  if (process.env.ELASTIC_PASSWORD) {
    config.auth = {
      username: 'elastic',
      password: process.env.ELASTIC_PASSWORD
    };
  } else if (process.env.NODE_ENV !== 'production') {
    // Mot de passe par défaut pour le développement
    // ATTENTION: ceci ne devrait être utilisé qu'en développement local
    config.auth = {
      username: 'elastic',
      password: 'changeme' // Remplacez par le mot de passe réel
    };
  } else {
    throw new Error('ELASTIC_PASSWORD doit être défini en production');
  }

  return config;
};

module.exports = {
  createConfig,
  defaultConfig: createConfig(),
  index: 'cvs',
  batchSize: 1000
};