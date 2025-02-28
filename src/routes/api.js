const express = require('express');
const { getAllEmailStats } = require('../services/storage');
const { 
  getReceivedEmailsCount, 
  getInboxCount, 
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
    const [emailsReceived, inboxCount] = await Promise.all([
      getReceivedEmailsCount(),
      getInboxCount(),
    ]);
    
    res.json({
      success: true,
      data: {
        emailsReceived,
        inboxCount,
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
    } else {
      const { updateDailyEmailStats } = require('../services/graph');
      success = await updateDailyEmailStats();
    }
    
    if (success) {
      res.json({ success: true, message: `Manual update of ${type || 'daily'} stats successful` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update stats' });
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
    
    // Update token in .env file
    const success = await updateTokenInEnvFile(
      accessToken,
      refreshToken,
      expiresIn || 3600 // Default to 1 hour if not provided
    );
    
    if (success) {
      return res.json({ 
        success: true, 
        message: 'Token updated successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update token' 
      });
    }
  } catch (error) {
    console.error('Error updating token:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update token' 
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