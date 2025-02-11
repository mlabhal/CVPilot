const mongoose = require('mongoose');
const Channel = require('../src/models/channel.model');

const channels = [
  { 
    name: 'Backend',
    slug: 'backend',
    icon: '⚙️',
    description: 'Discussions sur le développement backend',
    subscribers: []
  },
  {
    name: 'Frontend',
    slug: 'frontend',
    icon: '🎨',
    description: 'Discussions sur le développement frontend',
    subscribers: []
  },
  {
    name: 'Mobile Android',
    slug: 'android',
    icon: '🤖',
    description: 'Discussions sur le développement Android',
    subscribers: []
  },
  {
    name: 'Mobile iOS',
    slug: 'ios',
    icon: '🍎',
    description: 'Discussions sur le développement iOS',
    subscribers: []
  },
  {
    name: 'DATA & BI',
    slug: 'data-bi',
    icon: '📊',
    description: 'Discussions sur la data et la BI',
    subscribers: []
  },
  {
    name: 'IA',
    slug: 'ai',
    icon: '🤖',
    description: 'Discussions sur l\'intelligence artificielle',
    subscribers: []
  },
  {
    name: 'Gestion de projets',
    slug: 'project-management',
    icon: '📋',
    description: 'Discussions sur la gestion de projets',
    subscribers: []
  },
  {
    name: 'Agile',
    slug: 'agile',
    icon: '🔄',
    description: 'Discussions sur les méthodes agiles',
    subscribers: []
  }
];

const seedChannels = async () => {
  try {
    // Supprime tous les channels existants
    await Channel.deleteMany({});
    
    // Insère les nouveaux channels
    await Channel.insertMany(channels);
    
    console.log('Channels créés avec succès !');
  } catch (error) {
    console.error('Erreur lors de la création des channels:', error);
  }
};

module.exports = seedChannels;