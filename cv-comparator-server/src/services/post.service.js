const Post = require('../models/post.model');
const Channel = require('../models/channel.model');

const createPost = async (slug, userId, postData) => {
    const channel = await Channel.findOne({ slug });
    if (!channel) throw new Error('Channel not found');

    const newPost = new Post({
        title: postData.title,
        content: postData.content,
        author: userId,
        channel: channel._id,
        tags: postData.tags || [],
        attachments: postData.attachments || []
    });

    await newPost.save();

    // Mettre à jour les posts du channel
    channel.posts.push(newPost._id);
    await channel.save();

    return newPost;
};


const getChannelPosts = async (slug) => {
    const channel = await Channel.findOne({ slug });
    if (!channel) throw new Error('Channel not found');
    return await Post.find({ channel: channel._id }).populate('author', 'name email');
   };
   
const getPost = async (id) => {
    return await Post.findById(id).populate('author', 'name email');
   };
   
const likePost = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
    if (post.likes.includes(userId)) throw new Error('Already liked');
    post.likes.push(userId);
    return await post.save();
   };
   
const addComment = async (postId, userId, text) => {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
    post.comments.push({ text, author: userId, createdAt: new Date() });
    return await post.save();
   };

module.exports = {
    getChannelPosts,
    createPost,
    getPost,
    likePost,
    addComment
   };