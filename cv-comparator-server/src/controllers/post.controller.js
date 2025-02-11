const Post  = require('../models/post.model');
const Channel = require('../models/channel.model');

// Récupérer tous les posts d'un channel
const getChannelPosts = async (req, res) => {
    try {
      const { slug } = req.params;
  
      const channel = await Channel.findOne({ slug });
      if (!channel) {
        return res.status(404).json({ error: "Channel non trouvé" });
      }
  
      const posts = await Post.find({ channel: channel._id }).populate('author', 'name email');
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des posts" });
    }
  };

// Créer un post 
const createPost = async (req, res) => {
    try {
      const { slug } = req.params;
      const { title, content } = req.body;
      const userId = req.user._id || req.user.userId;
  
      const channel = await Channel.findOne({ slug });
      if (!channel) {
        return res.status(404).json({ error: "Channel non trouvé" });
      }
  
      const newPost = new Post({
        title,
        content,
        author: userId,
        channel: channel._id
      });
  
      await newPost.save();
  
      res.status(201).json({ message: "Post créé avec succès", post: newPost });
    } catch (error) {
      console.log('Erreur détaillée:', error);
      console.log('Message:', error.message);
      res.status(500).json({ error: "Erreur lors de la création du post" });
    }
  };
// Récupérer un post par ID
const getPost = async (req, res) => {
    try {
      const { id } = req.params;
      const post = await Post.findById(id).populate('author', 'name email');
  
      if (!post) {
        return res.status(404).json({ error: "Post non trouvé" });
      }
  
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du post" });
    }
  };
  
// Liker un post
  const likePost = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
  
      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ error: "Post non trouvé" });
      }
  
// Vérifier si l'utilisateur a déjà liké
      if (post.likes.includes(userId)) {
        return res.status(400).json({ error: "Vous avez déjà liké ce post" });
      }
  
      post.likes.push(userId);
      await post.save();
  
      res.json({ message: "Post liké avec succès", post });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors du like du post" });
    }
  };
  
// Ajouter un commentaire à un post
const addComment = async (req, res) => {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const userId = req.user._id;
  
      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ error: "Post non trouvé" });
      }
  
      // Ajouter le commentaire
      const comment = {
        text,
        author: userId,
        createdAt: new Date()
      };
  
      post.comments.push(comment);
      await post.save();
  
      res.json({ message: "Commentaire ajouté avec succès", post });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de l'ajout du commentaire" });
    }
  };
  module.exports = { 
    getChannelPosts, 
    createPost,
    getPost, 
    likePost, 
    addComment 
  };