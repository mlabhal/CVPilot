// src/services/uploadService.ts
import { fetchAuthApi } from './api';

/**
 * Convertit un Blob vidéo en File pour l'upload
 */
const blobToFile = (blob: Blob, filename: string): File => {
  return new File([blob], filename, { type: blob.type });
};

/**
 * Obtient l'URL de base de l'API de manière compatible avec différents environnements
 */
const getApiBaseUrl = (): string => {
  // Pour Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_URL || '';
  }
  
  // Fallback - essaie d'utiliser window.location si disponible
  try {
    // Utiliser l'URL actuelle avec le port 3000 (port de l'API)
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.protocol}//${currentUrl.hostname}:3000`;
  } catch (e) {
    console.warn("Impossible de déterminer l'URL de l'API, utilisation du localhost par défaut");
    return 'http://localhost:3000';
  }
};

/**
 * Envoie la vidéo enregistrée au serveur - version compatible avec Vite
 * @param quizId - ID du quiz
 * @param candidateId - ID du candidat
 * @param submissionId - ID de la soumission
 * @param videoBlob - Blob de la vidéo
 * @param sendEmailToRecruiter - Si true, un email sera envoyé au recruteur avec le lien de la vidéo
 */
export const uploadQuizRecording = async (
  quizId: string,
  candidateId: string,
  submissionId: string,
  videoBlob: Blob,
  sendEmailToRecruiter: boolean = true // Paramètre ajouté avec true par défaut
): Promise<{ success: boolean; message?: string; url?: string }> => {
  try {
    console.log('Début de l\'upload vidéo direct...');
    
    // Créer un nom de fichier unique avec horodatage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quiz_${quizId}_candidate_${candidateId}_${timestamp}.webm`;
    
    // Convertir le blob en fichier
    const videoFile = blobToFile(videoBlob, filename);
    
    console.log(`Vidéo préparée: ${filename}, taille: ${videoFile.size} octets, type: ${videoFile.type}`);
    
    // Créer un FormData pour l'upload
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('quizId', quizId);
    formData.append('candidateId', candidateId);
    formData.append('submissionId', submissionId);
    formData.append('expiresIn', '48'); // Durée d'expiration en heures
    formData.append('sendEmailToRecruiter', sendEmailToRecruiter ? 'true' : 'false'); // Nouveau paramètre
    
    // Log pour vérifier le contenu du FormData
    for (const pair of formData.entries()) {
      console.log(`FormData contient: ${pair[0]}, ${pair[1] instanceof File ? `File (${(pair[1] as File).size} octets)` : pair[1]}`);
    }
    
    console.log('FormData créé, envoi de la requête direct...');
    
    // Obtenir l'URL de l'API et le token
    const apiUrl = getApiBaseUrl();
    const token = localStorage.getItem('token');
    
    // ENVOI DIRECT - PAS D'UTILISATION DE fetchAuthApi
    const url = `${apiUrl}/api/quiz/recordings/cloud-upload`;
    console.log(`Envoi vers: ${url}`);
    
    // Créer un objet d'en-têtes (headers) sans Content-Type
    const headers = new Headers();
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }
    
    console.log('En-têtes utilisés:', Object.fromEntries([...headers]));
    
    // Envoyer la requête directement
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: formData,
      // Ne JAMAIS définir Content-Type ici - le navigateur le fait automatiquement
    });
    
    console.log(`Réponse reçue - status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur serveur: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `Erreur serveur: ${response.status} - ${errorText}`
      };
    }
    
    // Traiter la réponse
    const data = await response.json();
    console.log('Réponse du serveur:', data);
    
    return {
      success: true,
      ...data
    };
  } catch (error) {
    console.error('Erreur lors de l\'upload de la vidéo:', error);
    return { 
      success: false, 
      message: `Erreur lors de l'envoi de la vidéo: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
};

/**
 * Enregistre une URL de métadonnées pour une vidéo stockée ailleurs
 */
export const registerVideoMetadata = async (
  quizId: string,
  candidateId: string,
  submissionId: string,
  videoUrl: string,
  duration: number
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetchAuthApi(`/quiz/recordings/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quizId,
        candidateId,
        submissionId,
        videoUrl,
        duration,
      }),
    });
    
    return response;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des métadonnées vidéo:', error);
    return { success: false, message: 'Erreur lors de l\'enregistrement des métadonnées' };
  }
};

/**
 * Fonction utilitaire pour vérifier si un URL cloud existe toujours
 */
export const checkVideoUrlStatus = async (videoUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(videoUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};