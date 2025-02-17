require('dotenv').config({ path: '.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { setupElasticsearch, testConnection, checkIndexContent } = require('../config/elasticsearch');
const { findFreePort } = require('./utils/port.utils');
const { ensureUploadDirectory } = require('./utils/file.utils');
const SyncService = require('./services/sync.service');
const { removeDuplicateFiles, initAllCronJobs } = require('./utils/cron.utils');
const fs = require('fs').promises;
const path = require('path');

const app = express();


// CORS configuration
app.use(cors({
  origin: [
  'http://localhost:5173',
  process.env.FRONTEND_URL|| 'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const channelRoutes = require('./routes/channel.routes');
const postRoutes = require('./routes/post.routes');
const userRoutes = require('./routes/user.routes');
const cvRoutes = require('./routes/cv.routes');

app.use('/api/channels', channelRoutes);
app.use('/api/channels', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cv', cvRoutes);

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    files: req.files
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({ 
      error: 'File upload error',
      details: err.message
    });
  }

  // ... autres gestionnaires d'erreurs ...

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialisation modifiée
async function initializeServer() {
  try {
    // 1. Connexion MongoDB
    await mongoose.connect('mongodb+srv://doadmin:90P3dW54VMn27HX8@db-mongodb-lon1-44757-aa601f7a.mongo.ondigitalocean.com/CVPilotDatabase?authSource=admin', {
          retryWrites: true
      });
    console.log('Connected to MongoDB');

    // 2. Elasticsearch et dossiers
    await setupElasticsearch();
    await ensureUploadDirectory();
    
    // 3. Initialisation du service de sync
    await SyncService.initializeSyncService();
    removeDuplicateFiles();

    // 4. Vérification des contenus
    const content = await checkIndexContent();
    console.log(`Index contient ${content.length} documents`);

    // 5. Test de connexion
    await testConnection();

    // 6. Configuration du port
    const PORT = process.env.PORT || await findFreePort(3000);
    
    // 7. Configuration des tâches planifiées
    initAllCronJobs();

    // 8. Démarrage du serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log('=================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend URL: http://localhost:5173`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log('=================================');
    });

  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

// Cleanup handlers
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    await SyncService.backupElasticsearchIndex();
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await mongoose.connection.close();
    await SyncService.backupElasticsearchIndex();
    const files = await fs.readdir(SyncService.config.paths.uploads);
    for (const file of files) {
      await fs.unlink(path.join(SyncService.config.paths.uploads, file));
    }
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
});

// Start server
initializeServer();

module.exports = app;