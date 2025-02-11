const mongoose = require('mongoose');
const seedChannels = require('./channelSeeder');

const runSeeders = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect('mongodb://localhost:27017/my_database');
    
    // Exécute le seeder des channels
    await seedChannels();
    
    console.log('Tous les seeders ont été exécutés avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'exécution des seeders:', error);
    process.exit(1);
  }
};

runSeeders();