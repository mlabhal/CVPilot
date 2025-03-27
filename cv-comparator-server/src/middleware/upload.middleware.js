const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration existante pour les CV
const cvStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const uploadCV = multer({ 
  storage: cvStorage,
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers PDF, DOC et DOCX sont autorisés!'));
  }
});

// Nouvelle configuration pour les vidéos
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(os.tmpdir(), 'quiz-recordings');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const uploadVideo = multer({ 
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limite
  },
  fileFilter: function (req, file, cb) {
    // Vérifier le type de fichier pour les vidéos
    if (file.mimetype.startsWith('video/')) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers vidéo sont autorisés pour cet upload!'));
  }
});

// Pour compatibilité avec le code existant
// Garder l'export par défaut comme avant
const upload = uploadCV;

// Exporter également les deux configurations nommées
module.exports = upload;
module.exports.uploadCV = uploadCV;
module.exports.uploadVideo = uploadVideo;