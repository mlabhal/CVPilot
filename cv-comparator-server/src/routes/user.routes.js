const router = require('express').Router();
const { register } = require('../controllers/user.controller');
const { getAllUsers } = require('../controllers/user.controller');
const { login } = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const User = require('../models/user.model');

router.post('/register', register);
router.post('/login', login);
router.get('/', getAllUsers);
router.get('/me', auth, async (req, res) => {
    try {
      // req.user est défini par le middleware auth
      const user = await User.findById(req.user._id).select('-password');
      res.json(user);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;