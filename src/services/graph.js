// Check token health by making a test API call
const checkTokenHealth = async () => {
  try {
    // First, make sure we have an access token
    if (!process.env.ACCESS_TOKEN) {
      return {
        valid: false,
        reason: 'missing_token',
        message: 'Access token is missing'
      };
    }
    
    // Basic validation of token format - should be a JWT
    if (!process.env.ACCESS_TOKEN.match(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)) {
      return {
        valid: false,
        reason: 'invalid_token_format',
        message: 'Access token format is invalid (not a valid JWT)'
      };
    }
    
    // Initialize the client if needed
    try {
      if (!graphClient) {
        await initGraphClient();
      }
      
      // If we're here, the initialization worked, now make an actual API call
      try {
        // Make a simple API call to test the token
        // We'll use the /me endpoint which requires minimal permissions
        await graphClient.api('/me').select('displayName').get();
        
        // If we get here, the token is valid and working
        return {
          valid: true,
          message: 'API token is working properly'
        };
      } catch (apiError) {
        // Check if the error is related to authentication
        if (apiError.statusCode === 401) {
          // Try to refresh the token if we have a refresh token and endpoint
          if (process.env.REFRESH_TOKEN && process.env.TOKEN_REFRESH_ENDPOINT) {
            try {
              const newToken = await refreshAccessToken();
              
              if (newToken) {
                // Test the new token
                try {
                  await graphClient.api('/me').select('displayName').get();
                  return {
                    valid: true,
                    message: 'API token was refreshed and is now working'
                  };
                } catch (retryError) {
                  return {
                    valid: false,
                    reason: 'refresh_failed_validation',
                    message: 'Token was refreshed but still failed validation'
                  };
                }
              }
            } catch (refreshError) {
              return {
                valid: false,
                reason: 'refresh_failed',
                message: 'Token refresh attempt failed: ' + refreshError.message
              };
            }
          }
          
          return {
            valid: false,
            reason: 'unauthorized',
            message: 'API token is invalid or has insufficient permissions'
          };
        } else if (apiError.statusCode === 403) {
          return {
            valid: false,
            reason: 'forbidden',
            message: 'API token lacks necessary permissions'
          };
        } else {
          return {
            valid: false,
            reason: 'api_error',
            message: `API error: ${apiError.message || 'Unknown API error'}`
          };
        }
      }
    } catch (clientInitError) {
      return {
        valid: false,
        reason: 'client_init_error',
        message: `Failed to initialize Graph client: ${clientInitError.message || 'Unknown error'}`
      };
    }
  } catch (error) {
    console.error('Error checking token health:', error);
    return {
      valid: false,
      reason: 'check_error',
      message: error.message || 'Unknown error checking token health'
    };
  }
};const { Client } = require('@microsoft/microsoft-graph-client');
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
      console.log('No refresh token available, skipping refresh');
      return null;
    }
    
    // Get refresh endpoint from environment or use default
    const refreshEndpoint = process.env.TOKEN_REFRESH_ENDPOINT;
    
    if (!refreshEndpoint) {
      console.log('No token refresh endpoint configured, skipping refresh');
      return null;
    }
    
    console.log(`Attempting to refresh token using endpoint: ${refreshEndpoint}`);
    
    // This function assumes you have a token refresh endpoint
    // Customize this based on your token refresh mechanism
    try {
      const response = await fetch(refreshEndpoint, {
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
    } catch (fetchError) {
      console.error('Error refreshing access token:', fetchError);
      return null;
    }
  } catch (error) {
    console.error('Error in refresh token process:', error);
    return null;
  }
};

// Check if token is expired and refresh if needed
const ensureValidToken = async () => {
  try {
    const healthStatus = await checkTokenHealth();
    
    if (healthStatus.valid) {
      return process.env.ACCESS_TOKEN;
    }
    
    // If it's not valid but we have a refresh token, try to refresh
    if (!healthStatus.valid && process.env.REFRESH_TOKEN) {
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        process.env.ACCESS_TOKEN = newToken;
        return newToken;
      }
    }
    
    return null;
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

// Get current inbox count (excluding flagged items)
const getInboxCount = async () => {
  try {
    // Ensure we have a valid token
    await ensureValidToken();
    
    // Initialize client if needed
    if (!graphClient) {
      await initGraphClient();
    }
    
    // Query for unflagged emails in inbox
    const response = await graphClient.api('/me/mailFolders/inbox/messages')
      .filter('flag/flagStatus ne \'flagged\'')
      .count(true)
      .get();
    
    // Extract count from response
    const count = response['@odata.count'] || 0;
    
    console.log(`Current inbox count (excluding flagged items): ${count}`);
    return count;
  } catch (error) {
    console.error('Error getting inbox count:', error);
    
    // Check if error is due to authentication
    if (error.statusCode === 401) {
      console.log('Authentication error, refreshing token and retrying...');
      
      // Refresh token and client
      await refreshGraphClient();
      
      // Retry request once
      if (graphClient) {
        try {
          const response = await graphClient.api('/me/mailFolders/inbox/messages')
            .filter('flag/flagStatus ne \'flagged\'')
            .count(true)
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

// Get current tasks count (flagged emails in inbox)
const getTasksCount = async () => {
  try {
    // Ensure we have a valid token
    await ensureValidToken();
    
    // Initialize client if needed
    if (!graphClient) {
      await initGraphClient();
    }
    
    // Query for flagged emails in inbox
    const response = await graphClient.api('/me/mailFolders/inbox/messages')
      .filter('flag/flagStatus eq \'flagged\'')
      .count(true)
      .get();
    
    // Extract count from response
    const count = response['@odata.count'] || 0;
    
    console.log(`Current tasks count (flagged emails): ${count}`);
    return count;
  } catch (error) {
    console.error('Error getting tasks count:', error);
    
    // Check if error is due to authentication
    if (error.statusCode === 401) {
      console.log('Authentication error, refreshing token and retrying...');
      
      // Refresh token and client
      await refreshGraphClient();
      
      // Retry request once
      if (graphClient) {
        try {
          const response = await graphClient.api('/me/mailFolders/inbox/messages')
            .filter('flag/flagStatus eq \'flagged\'')
            .count(true)
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
    
    // Get current inbox count (excluding flagged items)
    const inboxCount = await getInboxCount();
    
    // Get current tasks count (flagged emails)
    const tasksCount = await getTasksCount();
    
    // Save to storage
    await saveEmailStats({
      date: new Date().toISOString().split('T')[0],
      inboxCountAtMidnight: inboxCount,
      tasksCountAtMidnight: tasksCount,
      type: 'midnight',
    });
    
    console.log('Midnight counts updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating midnight counts:', error);
    return false;
  }
};

module.exports = {
  initGraphClient,
  refreshGraphClient,
  getReceivedEmailsCount,
  getInboxCount,
  getTasksCount,
  updateDailyEmailStats,
  updateMidnightInboxCount,
  ensureValidToken,
  checkTokenHealth,
  updateTokenInEnvFile
};