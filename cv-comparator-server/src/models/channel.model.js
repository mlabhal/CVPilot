const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const channelSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: String,
  icon: String,
  subscribers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);