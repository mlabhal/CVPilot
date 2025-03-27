const { createUser, getUsers, loginUser, forgotPassword, resetPassword } = require('../services/user.service');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    console.log('Received data:', req.body);
    if (!req.body || !req.body.password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const user = await createUser(req.body);
    
    // Générer le token, exactement comme dans la fonction login
    const token = jwt.sign(
      { _id: user._id, userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: 'User created', 
      userId: user._id,
      token,
      name: user.name  // Inclure le nom pour le stocker directement dans localStorage
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};   

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    
    // Générer le token
    const token = jwt.sign(
      { _id: user._id,
        userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      message: 'Login successful', 
      token,
      userId: user._id 
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// Nouvelle route pour demander la réinitialisation du mot de passe
const forgotPasswordHandler = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await forgotPassword(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Nouvelle route pour réinitialiser le mot de passe
const resetPasswordHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    const result = await resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { 
  register, 
  getAllUsers, 
  login, 
  forgotPasswordHandler, 
  resetPasswordHandler 
};