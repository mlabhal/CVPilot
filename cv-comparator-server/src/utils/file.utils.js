const fs = require('fs').promises;

const ensureUploadDirectory = async () => {
  try {
    await fs.access('uploads');
  } catch (error) {
    await fs.mkdir('uploads');
  }
};

module.exports = {
  ensureUploadDirectory
};