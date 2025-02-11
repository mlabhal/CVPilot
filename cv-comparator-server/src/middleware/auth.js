const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Vérifier si le header Authorization existe
    if (!req.headers.authorization) {
      throw new Error('Token manquant');
    }

    const token = req.headers.authorization.split(' ')[1];
    
    // Vérifier si le token est présent après le split
    if (!token) {
      throw new Error('Format de token invalide');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérification plus précise de la structure du token
    if (!decodedToken || (!decodedToken._id && !decodedToken.userId)) {
      throw new Error('Structure du token invalide');
    }

    req.user = decodedToken;
    next();

  } catch (error) {
    console.log('Erreur d\'authentification:', error.message);
    
    // Messages d'erreur plus spécifiques selon le type d'erreur
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    
    res.status(401).json({ error: error.message || 'Erreur d\'authentification' });
  }
};

module.exports = auth;