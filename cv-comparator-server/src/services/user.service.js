const bcrypt = require('bcrypt');
const User = require('../models/user.model');

const createUser = async (userData) => {
  if (!userData || !userData.password) {
    throw new Error('Invalid user data: missing password');
  }
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({
      name: userData.name,
      email: userData.email,
      password: hashedPassword
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
 
module.exports = { createUser, getUsers, loginUser };
