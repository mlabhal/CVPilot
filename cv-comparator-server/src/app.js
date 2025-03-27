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
const bodyParser = require('body-parser');
const app = express();

// Importation du middleware d'upload et du contrôleur vidéo
const { uploadVideo } = require('./middleware/upload.middleware');
const recordingController = require('./controllers/recordingController');

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Debug middleware - placé tôt pour voir toutes les requêtes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// IMPORTANT: Route directe pour l'upload vidéo - AVANT body-parser
app.post('/api/quiz/recordings/cloud-upload', 
  uploadVideo.single('video'), 
  recordingController.uploadToCloud
);

// Middleware avec limites augmentées - Utilisez soit express.json soit bodyParser, mais pas les deux
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
const channelRoutes = require('./routes/channel.routes');
const postRoutes = require('./routes/post.routes');
const userRoutes = require('./routes/user.routes');
const cvRoutes = require('./routes/cv.routes');
const quizRoutes = require('./routes/personalizedQuizRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');

app.use('/api/channels', channelRoutes);
app.use('/api/channels', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/question-bank', questionBankRoutes);

// Servir les fichiers statiques de React en production
if (process.env.NODE_ENV === 'production') {
  // Supposons que votre build React se trouve dans '../client/build'
  // Ajustez le chemin selon votre structure de projet
  const clientBuildPath = path.join(__dirname, '../../cv-comparator-client/dist');
  app.use(express.static(clientBuildPath));
  
  // Toutes les requêtes non API sont redirigées vers l'app React
  app.get('*', (req, res, next) => {
    // Ne redirige pas les requêtes API
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}
// Route ping pour tester la connexion depuis la page de test
app.get('/api/test-ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API accessible', 
    time: new Date().toISOString() 
  });
});

// Logging middleware plus détaillé APRÈS les routes principales
app.use((req, res, next) => {
  if (req.path.includes('/recordings/')) {
    console.log(`DETAILED LOG - ${req.method} ${req.path}`, {
      query: req.query,
      files: req.files || (req.file ? [req.file] : null)
    });
  }
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
    await mongoose.connect(process.env.MONGODB_URI_LOCAL||process.env.MONGODB_URI_DIGITALOCEAN, {
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