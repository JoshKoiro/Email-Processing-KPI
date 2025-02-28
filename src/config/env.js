const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { refreshGraphClient } = require('../services/graph');

// Load environment variables
const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env file:', result.error);
    return false;
  }
  
  console.log('Environment variables loaded successfully');
  return true;
};

// Initialize environment watcher
const initEnvWatcher = () => {
  // Load environment variables initially
  loadEnv();
  
  // Watch for changes to .env file
  const envPath = path.resolve(process.cwd(), '.env');
  
  fs.watch(envPath, (eventType) => {
    if (eventType === 'change') {
      console.log('.env file changed, reloading environment variables');
      
      // Reload environment variables
      if (loadEnv()) {
        // Refresh Graph client with new credentials
        refreshGraphClient();
      }
    }
  });
  
  console.log('Environment watcher initialized');
};

module.exports = {
  loadEnv,
  initEnvWatcher,
};