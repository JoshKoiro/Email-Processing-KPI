const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { refreshGraphClient } = require('../services/graph');

// Load environment variables
const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath, override: true });
  
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
        // Refresh Graph client with new access token
        refreshGraphClient();
      }
    }
  });
  
  console.log('Environment watcher initialized');
};

// Create or update .env file
const updateEnvFile = async (updates) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Check if file exists
    let envContent = '';
    try {
      envContent = await fs.promises.readFile(envPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, will create it
    }
    
    // Update or add each variable
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      
      if (regex.test(envContent)) {
        // Update existing variable
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new variable
        envContent += `\n${key}=${value}`;
      }
    }
    
    // Write to file
    await fs.promises.writeFile(envPath, envContent.trim(), 'utf8');
    
    // Reload environment variables
    loadEnv();
    
    console.log('Environment file updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating environment file:', error);
    return false;
  }
};

module.exports = {
  loadEnv,
  initEnvWatcher,
  updateEnvFile
};