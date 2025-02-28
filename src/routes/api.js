const express = require('express');
const { getAllEmailStats } = require('../services/storage');
const { 
  getReceivedEmailsCount, 
  getInboxCount,
  getTasksCount,
  updateTokenInEnvFile,
  ensureValidToken 
} = require('../services/graph');

const router = express.Router();

// Get all email stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAllEmailStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting email stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get email stats' });
  }
});

// Get current counts
router.get('/current', async (req, res) => {
  try {
    const [emailsReceived, inboxCount, tasksCount] = await Promise.all([
      getReceivedEmailsCount(),
      getInboxCount(),
      getTasksCount(),
    ]);
    
    res.json({
      success: true,
      data: {
        emailsReceived,
        inboxCount,
        tasksCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting current counts:', error);
    res.status(500).json({ success: false, error: 'Failed to get current counts' });
  }
});

    // Manually trigger update
router.post('/update', async (req, res) => {
  try {
    const { type } = req.body;
    let success = false;
    
    if (type === 'midnight') {
      const { updateMidnightInboxCount } = require('../services/graph');
      success = await updateMidnightInboxCount();
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Manual update of midnight counts (inbox and tasks) successful' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to update midnight counts' 
        });
      }
    } else {
      const { updateDailyEmailStats } = require('../services/graph');
      success = await updateDailyEmailStats();
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Manual update of daily stats successful' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to update daily stats' 
        });
      }
    }
  } catch (error) {
    console.error('Error during manual update:', error);
    res.status(500).json({ success: false, error: 'Failed to update stats' });
  }
});

// Update access token
router.post('/token', async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresIn } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Access token is required' 
      });
    }
    
    // Basic token format validation
    if (!accessToken.match(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)) {
      return res.status(400).json({
        success: false,
        error: 'Access token appears to be invalid. It should be in JWT format (xxx.yyy.zzz)'
      });
    }
    
    // Update token in .env file
    const success = await updateTokenInEnvFile(
      accessToken,
      refreshToken,
      expiresIn || 3600 // Default to 1 hour if not provided
    );
    
    if (success) {
      // Immediately test the token with a quick API call
      try {
        // Force a refresh of the Graph client with the new token
        await refreshGraphClient();
        
        // Test with a simple API call to verify the token works
        const { checkTokenHealth } = require('../services/graph');
        const healthStatus = await checkTokenHealth();
        
        if (healthStatus.valid) {
          return res.json({ 
            success: true, 
            message: 'Token updated successfully and is working properly',
            apiStatus: 'healthy'
          });
        } else {
          return res.json({
            success: true, // Still return success because we updated the token
            message: 'Token was updated, but API test failed: ' + (healthStatus.message || 'Unknown reason'),
            apiStatus: 'unhealthy',
            reason: healthStatus.reason
          });
        }
      } catch (apiError) {
        console.error('Error testing new token:', apiError);
        return res.json({
          success: true, // Still return success because we updated the token
          message: 'Token was updated, but API test failed',
          apiStatus: 'unhealthy',
          error: apiError.message
        });
      }
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update token in configuration' 
      });
    }
  } catch (error) {
    console.error('Error updating token:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
});

// Check token status
router.get('/token/status', async (req, res) => {
  try {
    // Check if token is valid and not expired
    const valid = await ensureValidToken();
    
    res.json({
      success: true,
      data: {
        valid: !!valid,
        expiresAt: process.env.TOKEN_EXPIRY || null
      }
    });
  } catch (error) {
    console.error('Error checking token status:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check token status' 
    });
  }
});

module.exports = router;