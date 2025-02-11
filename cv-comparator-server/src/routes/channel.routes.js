const router = require('express').Router();
const { createChannel, getChannelById, getChannels, getChannelBySlug, subscribeToChannel } = require('../controllers/channel.controller');

// Routes Channels
router.post('/', createChannel);
router.get('/', getChannels);
router.get('/id/:id', getChannelById);
router.get('/slug/:slug', getChannelBySlug);
router.post('/:slug/subscribe', subscribeToChannel);


module.exports = router;