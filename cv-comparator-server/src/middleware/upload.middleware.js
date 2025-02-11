const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
      const filetypes = /pdf|doc|docx/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Seuls les fichiers PDF, DOC et DOCX sont autorisés!'));
    }
  });
  
module.exports = upload;
