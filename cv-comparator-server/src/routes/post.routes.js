const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { getChannelPosts, createPost, getPost, likePost, addComment } = require('../controllers/post.controller');


// Routes Posts
router.get('/:slug/posts', getChannelPosts);
router.post('/:slug/posts', authMiddleware, createPost);
router.get('/posts/:id', getPost);
router.post('/posts/:id/like', authMiddleware, likePost);
router.post('/posts/:id/comments', authMiddleware, addComment)

module.exports = router;
