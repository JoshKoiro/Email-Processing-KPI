const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const { ClientSecretCredential } = require('@azure/identity');
const { saveEmailStats } = require('./storage');

let graphClient = null;

// Initialize the Graph client
const initGraphClient = () => {
  try {
    // Get credentials from environment variables
    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Microsoft Graph API credentials not found in environment variables');
    }
    
    // Create a credential instance using client secret
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    
    // Create an authentication provider for Microsoft Graph API
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });
    
    // Initialize the Graph client
    graphClient = Client.initWithMiddleware({
      authProvider,
    });
    
    console.log('Microsoft Graph client initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Microsoft Graph client:', error);
    return false;
  }
};

// Refresh the Graph client (called when environment variables change)
const refreshGraphClient = () => {
  console.log('Refreshing Microsoft Graph client');
  return initGraphClient();
};

// Get received emails count for today
const getReceivedEmailsCount = async () => {
  try {
    if (!graphClient) {
      await initGraphClient();
    }
    
    // Get today's date in ISO format (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    
    // Query for emails received today
    const response = await graphClient.api('/me/mailFolders/inbox/messages')
      .filter(`receivedDateTime ge ${todayIso}`)
      .count(true)
      .get();
    
    // Extract count from response
    const count = response['@odata.count'] || 0;
    
    console.log(`Received emails count for today: ${count}`);
    return count;
  } catch (error) {
    console.error('Error getting received emails count:', error);
    return 0;
  }
};

// Get current inbox count
const getInboxCount = async () => {
  try {
    if (!graphClient) {
      await initGraphClient();
    }
    
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
};