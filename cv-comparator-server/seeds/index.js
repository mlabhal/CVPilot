const mongoose = require('mongoose');
const seedChannels = require('./channelSeeder');

const runSeeders = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect('mongodb://appUser:CVPilot_123@10.106.0.2:27017/CVPilotDatabase?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
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