// services/channel.service.js
const Channel = require('../models/channel.model');

const createChannel = async (channelData) => {
 const channel = new Channel(channelData);
 return await channel.save();
};

const getAllChannels = async (page = 1, limit = 10) => {
 const skip = (page - 1) * limit;
 const channels = await Channel.find().skip(skip).limit(limit);
 const total = await Channel.countDocuments();
 return { channels, total, page, totalPages: Math.ceil(total / limit) };
};

const getChannelById = async (id) => {
 return await Channel.findById(id);
};

const getChannelBySlug = async (slug) => {
 return await Channel.findOne({ slug });
};

const subscribe = async (slug, userId) => {
 const channel = await Channel.findOne({ slug });
 if (!channel) throw new Error('Channel not found');
 if (channel.subscribers.includes(userId)) throw new Error('Already subscribed');
 channel.subscribers.push(userId);
 return await channel.save();
};



module.exports = {
 createChannel,
 getAllChannels, 
 getChannelById,
 getChannelBySlug,
 subscribe
};