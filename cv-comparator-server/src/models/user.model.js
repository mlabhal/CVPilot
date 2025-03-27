const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['candidat', 'recruteur']  // Restreint les valeurs possibles
  },
  companyName: { 
    type: String, 
    required: function() { 
      return this.type === 'recruteur'; 
    }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

module.exports = mongoose.model('User', userSchema);