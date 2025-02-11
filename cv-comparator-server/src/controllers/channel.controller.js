const channelService = require('../services/channel.service');

const createChannel = async (req, res) => {
 try {
   const channel = await channelService.createChannel(req.body);
   res.status(201).json(channel);
 } catch (error) {
   res.status(400).json({ error: error.message });
 }
};

const getChannels = async (req, res) => {
 try {
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 10;
   const result = await channelService.getAllChannels(page, limit);
   res.json(result);
 } catch (error) {
   res.status(500).json({ error: "Erreur lors de la récupération des channels" });
 }
};

const getChannelById = async (req, res) => {
 try {
   const channel = await channelService.getChannelById(req.params.id);
   res.json(channel);
 } catch (error) {
   res.status(404).json({ error: "Channel non trouvé" });
 }
};

const getChannelBySlug = async (req, res) => {
 try {
   const channel = await channelService.getChannelBySlug(req.params.slug);
   if (!channel) {
     return res.status(404).json({ error: "Channel non trouvé" });
   }
   res.json(channel);
 } catch (error) {
   res.status(500).json({ error: "Erreur lors de la récupération du channel" });
 }
};

const subscribeToChannel = async (req, res) => {
 try {
   const channel = await channelService.subscribe(req.params.slug, req.user._id);
   res.json({ message: "Inscription réussie", channel });
 } catch (error) {
   if (error.message === 'Already subscribed') {
     return res.status(400).json({ error: "Utilisateur déjà abonné" });
   }
   if (error.message === 'Channel not found') {
     return res.status(404).json({ error: "Channel non trouvé" });
   }
   res.status(500).json({ error: "Erreur lors de l'inscription au channel" });
 }
};

module.exports = {
 createChannel,
 getChannels,
 getChannelById,
 getChannelBySlug,
 subscribeToChannel
};