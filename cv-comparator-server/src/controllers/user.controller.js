const { createUser } = require('../services/user.service');
const { getUsers } = require('../services/user.service');
const { loginUser } = require('../services/user.service');
const jwt = require('jsonwebtoken');


const register = async (req, res) => {
    try {
      console.log('Received data:', req.body);
      if (!req.body || !req.body.password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      const user = await createUser(req.body);
      res.status(201).json({ message: 'User created', userId: user._id });
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
module.exports = { register, getAllUsers, login };