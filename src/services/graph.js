const { Client } = require('@microsoft/microsoft-graph-client');
const fs = require('fs').promises;
const path = require('path');
const { saveEmailStats } = require('./storage');

let graphClient = null;
let tokenExpirationTime = null;

// Update .env file with new token values
const updateTokenInEnvFile = async (accessToken, refreshToken, expiresIn) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // Calculate expiration time
    const expirationTime = new Date();
    expirationTime.setSeconds(expirationTime.getSeconds() + expiresIn - 300); // 5 minutes buffer
    
    // Update environment variables
    let newContent = envContent;
    
    // Update ACCESS_TOKEN
    if (newContent.includes('ACCESS_TOKEN=')) {
      newContent = newContent.replace(/ACCESS_TOKEN=.*/, `ACCESS_TOKEN=${accessToken}`);
    } else {
      newContent += `\nACCESS_TOKEN=${accessToken}`;
    }
    
    // Update REFRESH_TOKEN if provided
    if (refreshToken) {
      if (newContent.includes('REFRESH_TOKEN=')) {
        newContent = newContent.replace(/REFRESH_TOKEN=.*/, `REFRESH_TOKEN=${refreshToken}`);
      } else {
        newContent += `\nREFRESH_TOKEN=${refreshToken}`;
      }
    }
    
    // Update TOKEN_EXPIRY
    if (newContent.includes('TOKEN_EXPIRY=')) {
      newContent = newContent.replace(/TOKEN_EXPIRY=.*/, `TOKEN_EXPIRY=${expirationTime.toISOString()}`);
    } else {
      newContent += `\nTOKEN_EXPIRY=${expirationTime.toISOString()}`;
    }
    
    // Write updated content back to .env file
    await fs.writeFile(envPath, newContent, 'utf8');
    console.log('Token updated in .env file');
    
    // Update the global expiration time
    tokenExpirationTime = expirationTime;
    
    return true;
  } catch (error) {
    console.error('Error updating token in .env file:', error);
    return false;
  }
};

// Refresh the access token using the refresh token
const refreshAccessToken = async () => {
  try {
    const refreshToken = process.env.REFRESH_TOKEN;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // This function assumes you have a token refresh endpoint
    // Customize this based on your token refresh mechanism
    const response = await fetch('https://your-token-refresh-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Update tokens in .env file
    await updateTokenInEnvFile(
      data.access_token,
      data.refresh_token || refreshToken,
      data.expires_in || 3600
    );
    
    console.log('Access token refreshed successfully');
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
};

// Check if token is expired and refresh if needed
const ensureValidToken = async () => {
  try {
    // If we don't have expiration time in memory, check from environment
    if (!tokenExpirationTime && process.env.TOKEN_EXPIRY) {
      tokenExpirationTime = new Date(process.env.TOKEN_EXPIRY);
    }
    
    const now = new Date();
    
    // Check if token is expired or about to expire
    if (!tokenExpirationTime || now >= tokenExpirationTime) {
      console.log('Access token expired or about to expire, refreshing...');
      const newToken = await refreshAccessToken();
      
      if (!newToken) {
        throw new Error('Failed to refresh access token');
      }
      
      process.env.ACCESS_TOKEN = newToken;
      return newToken;
    }
    
    return process.env.ACCESS_TOKEN;
  } catch (error) {
    console.error('Error ensuring valid token:', error);
    return null;
  }
};

// Initialize the Graph client with access token
const initGraphClient = async () => {
  try {
    // Get access token from environment
    const accessToken = process.env.ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Microsoft Graph API access token not found in environment variables');
    }
    
    // Initialize the Graph client with access token authentication
    graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
    
    console.log('Microsoft Graph client initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Microsoft Graph client:', error);
    return false;
  }
};

// Refresh the Graph client
const refreshGraphClient = async () => {
  console.log('Refreshing Microsoft Graph client');
  
  // Ensure we have a valid token before refreshing the client
  const validToken = await ensureValidToken();
  
  if (!validToken) {
    console.error('Failed to get a valid token for Graph client refresh');
    return false;
  }
  
  return initGraphClient();
};

// Make authenticated request to Graph API
const makeGraphRequest = async (endpoint, params = {}) => {
  try {
    // Ensure we have a valid token
    await ensureValidToken();
    
    // Initialize client if needed
    if (!graphClient) {
      await initGraphClient();
    }
    
    // Make request
    const response = await graphClient.api(endpoint).get();
    return response;
  } catch (error) {
    // Check if error is due to authentication
    if (error.statusCode === 401) {
      console.log('Authentication error, refreshing token and retrying...');
      
      // Refresh token and client
      await refreshGraphClient();
      
      // Retry request once
      if (graphClient) {
        return await graphClient.api(endpoint).get();
      }
    }
    
    throw error;
  }
};

// Get received emails count for today across all folders
const getReceivedEmailsCount = async () => {
  try {
    // Ensure we have a valid token
    await ensureValidToken();
    
    // Initialize client if needed
    if (!graphClient) {
      await initGraphClient();
    }
    
    // Get today's date in ISO format (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    
    console.log(`Getting emails received since ${todayIso}`);
    
    // Query for all emails received today across all folders
    // This uses the /me/messages endpoint which searches across all folders
    const response = await graphClient.api('/me/messages')
      .filter(`receivedDateTime ge ${todayIso}`)
      .count(true)
      .top(999) // Adding top parameter to handle pagination if needed
      .get();
    
    // Extract count from response
    const count = response['@odata.count'] || 0;
    
    console.log(`Received emails count for today across all folders: ${count}`);
    return count;
  } catch (error) {
    console.error('Error getting received emails count:', error);
    
    // Check if error is due to authentication
    if (error.statusCode === 401) {
      console.log('Authentication error, refreshing token and retrying...');
      
      // Refresh token and client
      await refreshGraphClient();
      
      // Retry request once
      if (graphClient) {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayIso = today.toISOString();
          
          const response = await graphClient.api('/me/messages')
            .filter(`receivedDateTime ge ${todayIso}`)
            .count(true)
            .top(999)
            .get();
          
          return response['@odata.count'] || 0;
        } catch (retryError) {
          console.error('Error in retry attempt:', retryError);
        }
      }
    }
    
    return 0;
  }
};

// Get current inbox count
const getInboxCount = async () => {
  try {
    // Query for total inbox count
    const response = await graphClient.api('/me/mailFolders/inbox')
      .select('totalItemCount')
      .get();
    
    // Extract count from response
    const count = response.totalItemCount || 0;
    
    console.log(`Current inbox count: ${count}`);
    return count;
  } catch (error) {
    console.error('Error getting inbox count:', error);
    return 0;
  }
};

// Update daily email stats
const updateDailyEmailStats = async () => {
  try {
    // Ensure we have a valid token
    await ensureValidToken();
    
    // Get received emails count for today
    const emailsReceived = await getReceivedEmailsCount();
    
    // Save to storage
    await saveEmailStats({
      date: new Date().toISOString().split('T')[0],
      emailsReceived,
      type: 'received',
    });
    
    console.log('Daily email stats updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating daily email stats:', error);
    return false;
  }
};

// Update midnight inbox count
const updateMidnightInboxCount = async () => {
  try {
    // Ensure we have a valid token
    await ensureValidToken();
    
    // Get current inbox count
    const inboxCount = await getInboxCount();
    
    // Save to storage
    await saveEmailStats({
      date: new Date().toISOString().split('T')[0],
      inboxCountAtMidnight: inboxCount,
      type: 'midnight',
    });
    
    console.log('Midnight inbox count updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating midnight inbox count:', error);
    return false;
  }
};

module.exports = {
  initGraphClient,
  refreshGraphClient,
  getReceivedEmailsCount,
  getInboxCount,
  updateDailyEmailStats,
  updateMidnightInboxCount,
  ensureValidToken,
  updateTokenInEnvFile
};