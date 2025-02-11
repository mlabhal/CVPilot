const cron = require('node-cron');
const SyncService = require('../services/sync.service');

async function removeDuplicateFiles() {
  try {
    console.log('Démarrage du nettoyage des doublons...');
    // Appel direct de la méthode statique sans créer d'instance
    const result = await SyncService.synchronizeFilesAndES();
    console.log('Nettoyage terminé:', result);
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    throw error;
  }
}

function initAllCronJobs() {
  cron.schedule('0 0 * * *', async () => {
    console.log('Exécution du nettoyage planifié des doublons...');
    try {
      console.log('Début des tâches cron quotidiennes');
      await removeDuplicateFiles();
      console.log('Tâches cron quotidiennes terminées');
    } catch (error) {
      console.error('Erreur dans le cron job de nettoyage:', error);
    }
  });
  
  console.log('Cron jobs initialisés');
}

module.exports = {
  removeDuplicateFiles,
  initAllCronJobs
};