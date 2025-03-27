const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configuration de nodemailer (à adapter selon votre service d'email)
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou un autre service comme 'SendGrid', 'Mailgun', etc.
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const createUser = async (userData) => {
  if (!userData || !userData.password) {
    throw new Error('Invalid user data: missing password');
  }
  try {
    // Gestion du champ companyName en fonction du type d'utilisateur
    if (userData.type === 'recruteur' && !userData.companyName) {
      throw new Error('Company name is required for recruiters');
    }
    
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      type: userData.type || 'candidat',
      companyName: userData.type === 'recruteur' ? userData.companyName : ''
    });
    return await user.save();
  } catch (error) {
    console.error('User creation error:', error);
    throw error;
  }
};

const getUsers = async () => {
  return await User.find({}, '-password');
};
 
const loginUser = async (email, password) => {
  console.log('Login attempt:', { email });
  const user = await User.findOne({ email });
  console.log('User found:', !!user);
  if (!user) throw new Error('User not found');
  
  const isValid = await bcrypt.compare(password, user.password);
  console.log('Password valid:', isValid);
  if (!isValid) throw new Error('Invalid password');
  
  return user;
};

// Fonction pour demander la réinitialisation du mot de passe
const forgotPassword = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // Expire dans 1 heure

    // Mettre à jour l'utilisateur avec le token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // URL de réinitialisation (à adapter selon votre frontend)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Envoyer l'email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <p>Vous avez demandé une réinitialisation de mot de passe.</p>
        <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
        <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
        <p>Ce lien est valable pendant 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return { message: 'Email de réinitialisation envoyé' };
  } catch (error) {
    console.error('Forgot password error:', error);
    throw error;
  }
};

// Fonction pour réinitialiser le mot de passe avec le token
const resetPassword = async (token, newPassword) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Token invalide ou expiré');
    }

    // Mettre à jour le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Mot de passe réinitialisé avec succès' };
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
};
 
module.exports = { createUser, getUsers, loginUser, forgotPassword, resetPassword };