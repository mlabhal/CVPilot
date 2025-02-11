// config/openai.config.js
const { OpenAI } = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = {
  openai,
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 10000,  // Limite de tokens par minute pour GPT-4
    batchSize: 5,
    delayBetweenBatches: 1000, // ms
    retryOptions: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000
    }
  }
};