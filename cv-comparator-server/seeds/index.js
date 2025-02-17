const mongoose = require('mongoose');
const seedChannels = require('./channelSeeder');

const runSeeders = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect('mongodb+srv://doadmin:90P3dW54VMn27HX8@private-db-mongodb-lon1-44757-9256b348.mongo.ondigitalocean.com/CVPilotDatabase?authSource=admin', {
      retryWrites: true
  });
    
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