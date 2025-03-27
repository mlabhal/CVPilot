const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendNotificationIfContactFound(cvData) {
    try {
      const hasEmail = cvData.email && this.isValidEmail(cvData.email);
      const hasPhone = cvData.phone_number && this.isValidPhoneNumber(cvData.phone_number);
      
      console.log('[NOTIFICATION] Vérification des informations de contact:', {
        email: cvData.email,
        phone: cvData.phone_number,
        hasValidEmail: hasEmail,
        hasValidPhone: hasPhone
      });
  
      // Si aucune information de contact valide n'est trouvée, on arrête
      if (!hasEmail && !hasPhone) {
        console.log('[NOTIFICATION] Aucune information de contact valide trouvée');
        return false;
      }
  
      // Si un email est disponible, envoyer une notification
      if (hasEmail) {
        await this.sendNotificationEmail(cvData.email, cvData);
        console.log(`[NOTIFICATION] Email envoyé à ${cvData.email}`);
        return true;
      }
  
      // Si seulement un téléphone est disponible, on le signale
      if (hasPhone) {
        console.log(`[NOTIFICATION] Numéro de téléphone trouvé (${cvData.phone_number}), mais aucun email pour envoyer une notification`);
      }
  
      return false;
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors de la notification:', error);
      return false;
    }
  }

  isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhoneNumber(phone) {
    if (!phone) return false;
    
    // Nettoyage du numéro pour ne garder que les chiffres
    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    
    // Vérification des formats marocains les plus courants
    // Format international: +212xxxxxxxxx (12 chiffres avec le +)
    // Format national: 0xxxxxxxxx (10 chiffres)
    return (
      (cleanedPhone.startsWith('+212') && cleanedPhone.length >= 12) ||
      (cleanedPhone.startsWith('0') && cleanedPhone.length >= 10)
    );
  }

  async sendNotificationEmail(email, cvData) {
    try {
      const candidateName = this.extractCandidateName(cvData);
      
      const mailOptions = {
        from: `"CV Pilot" <${process.env.EMAIL_USERNAME}>`,
        to: email,
        subject: 'Votre CV a été ajouté à notre plateforme CV Pilot',
        text: this.getPlainTextEmailContent(candidateName),
        html: this.getHtmlEmailContent(candidateName)
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[NOTIFICATION] Email envoyé à ${email}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`[NOTIFICATION] Erreur lors de l'envoi de l'email à ${email}:`, error);
      throw error;
    }
  }

  /**
   * Nouvelle méthode pour envoyer un email au recruteur avec le lien de la vidéo du candidat
   * @param {string} recruiterEmail - Email du recruteur
   * @param {string} quizTitle - Titre du quiz
   * @param {string} candidateName - Nom du candidat
   * @param {string} videoUrl - URL de la vidéo
   * @returns {Promise<Object>} - Résultat de l'envoi d'email
   */
  async sendCandidateVideoEmail(recruiterEmail, quizTitle, candidateName, videoUrl) {
    try {
      // Vérifier si l'email est valide
      if (!this.isValidEmail(recruiterEmail)) {
        console.error(`[NOTIFICATION] Email du recruteur non valide: ${recruiterEmail}`);
        return { success: false, message: 'Email du recruteur non valide' };
      }

      const mailOptions = {
        from: `"QuizGen" <${process.env.EMAIL_USERNAME}>`,
        to: recruiterEmail,
        subject: `Nouvelle vidéo de candidat - ${quizTitle}`,
        text: this.getPlainTextVideoContent(quizTitle, candidateName, videoUrl),
        html: this.getHtmlVideoContent(quizTitle, candidateName, videoUrl)
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[NOTIFICATION] Email de vidéo envoyé au recruteur ${recruiterEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[NOTIFICATION] Erreur lors de l'envoi de l'email de vidéo à ${recruiterEmail}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Génère le contenu texte pour l'email de notification de vidéo
   */
  getPlainTextVideoContent(quizTitle, candidateName, videoUrl) {
    return `
Bonjour,

Le candidat ${candidateName} a terminé le quiz "${quizTitle}".

Vous pouvez visionner sa vidéo en suivant ce lien:
${videoUrl}

Cordialement,
L'équipe QuizGen
    `;
  }

  /**
   * Génère le contenu HTML pour l'email de notification de vidéo
   */
  getHtmlVideoContent(quizTitle, candidateName, videoUrl) {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
  <h2 style="color: #4F46E5;">Nouvelle vidéo d'un candidat</h2>
  
  <p>Bonjour,</p>
  
  <p>Le candidat <strong>${candidateName}</strong> a terminé le quiz <strong>"${quizTitle}"</strong>.</p>
  
  <p>Vous pouvez visionner sa vidéo en cliquant sur le bouton ci-dessous :</p>
  
  <p style="text-align: center; margin: 25px 0;">
    <a href="${videoUrl}" 
       style="display: inline-block; background-color: #4F46E5; color: white; 
              padding: 12px 24px; text-decoration: none; border-radius: 4px;
              font-weight: bold;">
      Voir la vidéo du candidat
    </a>
  </p>
  
  <p>Ou en copiant ce lien dans votre navigateur : <br>
     <a href="${videoUrl}">${videoUrl}</a>
  </p>
  
  <p>Cordialement,<br>L'équipe QuizGen</p>
  
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
  <p style="font-size: 12px; color: #888;">Ce message est généré automatiquement, merci de ne pas y répondre directement.</p>
</div>
    `;
  }

  getPlainTextEmailContent(candidateName) {
    return `
Bonjour ${candidateName},

Nous vous informons que votre CV a été ajouté à notre plateforme CV Pilot pour analyse et comparaison.

Conformément à notre politique de protection des données et aux exigences légales, nous souhaitons vous informer que:

1. Votre CV sera stocké dans notre système pour permettre aux recruteurs de trouver des profils correspondant à leurs besoins.
2. Les informations personnelles contenues dans votre CV seront traitées avec la plus grande confidentialité.
3. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.

Si vous souhaitez que votre CV soit retiré de notre plateforme ou si vous avez des questions concernant l'utilisation de vos données, veuillez nous contacter à l'adresse suivante: ${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}

Cordialement,
L'équipe CV Pilot
    `;
  }

  getHtmlEmailContent(candidateName) {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
  <h2 style="color: #6366F1;">Votre CV a été ajouté à notre plateforme</h2>
  
  <p>Bonjour ${candidateName},</p>
  
  <p>Nous vous informons que votre CV a été ajouté à notre plateforme <strong>CV Pilot</strong> pour analyse et comparaison.</p>
  
  <p>Conformément à notre politique de protection des données et aux exigences légales, nous souhaitons vous informer que:</p>
  
  <ul>
    <li>Votre CV sera stocké dans notre système pour permettre aux recruteurs de trouver des profils correspondant à leurs besoins.</li>
    <li>Les informations personnelles contenues dans votre CV seront traitées avec la plus grande confidentialité.</li>
    <li>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.</li>
  </ul>
  
  <p>Si vous souhaitez que votre CV soit retiré de notre plateforme ou si vous avez des questions concernant l'utilisation de vos données, veuillez nous contacter à l'adresse suivante: <a href="mailto:${process.env.CONTACT_EMAIL || process.env.EMAIL_USERNAME}">${process.env.CONTACT_EMAIL || process.env.EMAIL_USERNAME}</a></p>
  
  <p>Cordialement,<br>L'équipe CV Pilot</p>
  
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
  <p style="font-size: 12px; color: #888;">Ce message est généré automatiquement, merci de ne pas y répondre directement.</p>
</div>
    `;
  }

  extractCandidateName(cvData) {
    // Tentative d'extraction du nom à partir des expériences
    if (cvData.experiences && cvData.experiences.length > 0) {
      // Chercher un titre qui pourrait contenir le nom
      for (const exp of cvData.experiences) {
        if (exp.title && exp.title.includes(' ')) {
          // Si le titre contient des espaces, c'est peut-être un nom
          return exp.title.split(' ')[0]; // Prendre le premier mot
        }
      }
    }
    
    // Si aucun nom n'est trouvé, utiliser un nom générique
    return "Candidat";
  }
}

module.exports = new NotificationService();