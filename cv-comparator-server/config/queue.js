// config/queue.js
const Queue = require('bull');

const cvAnalysisQueue = new Queue('cv-analysis', {
  redis: { port: 6379, host: '127.0.0.1' }
});

module.exports = cvAnalysisQueue;