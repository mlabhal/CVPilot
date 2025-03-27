// controllers/recordingController.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const mongoose = require('mongoose');
const QuizSubmission = require('../models/QuizSubmission');
const Quiz = require('../models/Quiz');
const User = require('../models/user.model');
const notificationService = require('../services/notification.service');

// Client S3 pour Cloudflare R2
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// Configuration pour la durée d'expiration (48 heures par défaut)
const DEFAULT_EXPIRY_HOURS = 48;

/**
 * Middleware pour gérer l'upload des vidéos
 * Utilisation: router.post('/chemin', uploadToCloud)
 */
exports.uploadToCloud = async (req, res) => {
  // La vidéo est déjà traitée par le middleware uploadVideo.single('video')
  try {
    console.log("=== UPLOAD DEBUG ===");
    console.log("Headers:", req.headers);
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier vidéo reçu'
      });
    }

    console.log("Fichier reçu avec succès:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Extraire les paramètres du corps de la requête
    const { quizId, candidateId, submissionId, sendEmailToRecruiter } = req.body;
    const expireHours = parseInt(req.body.expiresIn || DEFAULT_EXPIRY_HOURS, 10);

    // Mode test - Détecte si l'ID semble être un ID de test
    const isTestId = submissionId === 'test-submission-id' || 
                    submissionId.startsWith('test-') || 
                    !mongoose.Types.ObjectId.isValid(submissionId);

    let submission = null; // Déclaration de la variable submission

    // Si ce n'est pas un test, vérifier l'existence de la soumission
    if (!isTestId) {
      submission = await QuizSubmission.findById(submissionId);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Soumission non trouvée'
        });
      }
    } else {
      console.log("Mode test détecté - Skipping validation de soumission");
    }
    
    // Pour l'instant, retourner un succès pour le test
    if (isTestId) {
      return res.json({
        success: true,
        message: "Test d'upload réussi - Mode test",
        fileDetails: {
          filename: req.file.filename,
          size: req.file.size,
          path: req.file.path
        }
      });
    }

    // Lire le fichier temporaire
    const fileContent = fs.readFileSync(req.file.path);
    
    // Nom du fichier dans le cloud
    const fileName = `quiz-recordings/${quizId}/${candidateId}_${submissionId}_${Date.now()}.webm`;
    
    // Paramètres d'upload vers R2
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: fileContent,
      ContentType: req.file.mimetype
    };

    console.log('Démarrage de l\'upload vers R2...');
    
    // Upload vers R2
    await R2.send(new PutObjectCommand(uploadParams));
    
    console.log('Upload réussi, génération de l\'URL signée...');
    
    // Générer URL signée qui expire dans 48h
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName
    });
    
    const signedUrl = await getSignedUrl(R2, command, { 
      expiresIn: expireHours * 60 * 60 // Conversion heures en secondes
    });
    
    console.log('URL signée générée avec succès');
    
    // Nettoyer le fichier temporaire
    fs.unlinkSync(req.file.path);
    
    // Mettre à jour la soumission avec les informations vidéo
    submission.videoUrl = signedUrl;
    submission.videoKey = fileName;
    submission.videoExpires = new Date(Date.now() + (expireHours * 60 * 60 * 1000));
    await submission.save();
    
    console.log('Soumission mise à jour avec succès');
    
    // Envoyer un email au recruteur si demandé
    if (sendEmailToRecruiter === 'true') {
      try {
        console.log('Envoi d\'email au recruteur demandé');
        
        // Récupérer les informations du quiz
        const quiz = await Quiz.findById(quizId);
        
        if (quiz && quiz.recruiter && quiz.recruiter.email) {
          // Récupérer les informations du candidat (avec gestion de "default-candidate")
          let candidateName = 'Candidat';
          
          // Vérifier si l'ID du candidat est un ObjectId valide avant de faire la requête
          if (mongoose.Types.ObjectId.isValid(candidateId)) {
            try {
              const candidate = await User.findById(candidateId);
              if (candidate) {
                candidateName = candidate.name || 'Candidat';
              }
            } catch (err) {
              console.warn(`Impossible de trouver le candidat avec l'ID: ${candidateId}`);
            }
          } else {
            console.log(`ID candidat non valide pour la recherche en base: ${candidateId}, utilisation du nom par défaut`);
          }
          
          // Utiliser le service de notification existant pour envoyer l'email
          notificationService.sendCandidateVideoEmail(
            quiz.recruiter.email,
            quiz.title || 'Quiz',
            candidateName,
            signedUrl
          ).then(result => {
            if (result.success) {
              console.log(`Email envoyé avec succès au recruteur: ${quiz.recruiter.email}`);
            } else {
              console.warn(`Échec de l'envoi d'email au recruteur: ${result.message}`);
            }
          }).catch(error => {
            console.error('Erreur lors de l\'envoi d\'email:', error);
          });
          
          console.log(`Demande d'envoi d'email initiée pour le recruteur: ${quiz.recruiter.email}`);
        } else {
          console.warn(`Impossible d'envoyer l'email: informations du recruteur non trouvées pour le quiz ${quizId}`);
        }
      } catch (emailError) {
        // Log l'erreur mais ne pas faire échouer l'upload en cas d'erreur d'email
        console.error('Erreur lors de la préparation de l\'email:', emailError);
      }
    }
    
    return res.json({
      success: true,
      url: signedUrl,
      expires: submission.videoExpires.toISOString()
    });
    
  } catch (error) {
    console.error('Erreur upload cloud:', error);
    
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Erreur lors du nettoyage du fichier temporaire:', e);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la vidéo vers le cloud: ' + error.message
    });
  }
};

/**
 * Récupère l'URL de la vidéo associée à une soumission
 */
exports.getVideoUrl = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Récupérer la soumission
    const submission = await QuizSubmission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Soumission non trouvée'
      });
    }
    
    // Vérifier si la vidéo existe
    if (!submission.videoUrl || !submission.videoExpires) {
      return res.status(404).json({
        success: false,
        message: 'Aucune vidéo associée à cette soumission'
      });
    }
    
    // Vérifier si l'URL a expiré
    const now = new Date();
    
    if (now > submission.videoExpires) {
      return res.json({
        success: true,
        expired: true,
        message: 'Le lien vidéo a expiré. Veuillez le rafraîchir.'
      });
    }
    
    return res.json({
      success: true,
      url: submission.videoUrl,
      expires: submission.videoExpires
    });
    
  } catch (error) {
    console.error('Erreur récupération video:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la vidéo'
    });
  }
};

/**
 * Régénère une URL expirée pour la vidéo d'une soumission
 */
exports.refreshVideoUrl = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const expireHours = parseInt(req.query.expiresIn || DEFAULT_EXPIRY_HOURS, 10);
    
    // Récupérer la soumission
    const submission = await QuizSubmission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Soumission non trouvée'
      });
    }
    
    // Vérifier si la clé vidéo existe
    if (!submission.videoKey) {
      return res.status(404).json({
        success: false,
        message: 'Aucune vidéo associée à cette soumission'
      });
    }
    
    // Générer une nouvelle URL signée
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: submission.videoKey
    });
    
    const signedUrl = await getSignedUrl(R2, command, { 
      expiresIn: expireHours * 60 * 60 
    });
    
    // Mettre à jour la soumission
    submission.videoUrl = signedUrl;
    submission.videoExpires = new Date(Date.now() + (expireHours * 60 * 60 * 1000));
    await submission.save();
    
    return res.json({
      success: true,
      url: signedUrl,
      expires: submission.videoExpires.toISOString()
    });
    
  } catch (error) {
    console.error('Erreur rafraîchissement URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement de l\'URL vidéo'
    });
  }
};