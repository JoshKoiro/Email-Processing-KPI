const express = require('express');
const { ensureValidToken, checkTokenHealth } = require('../services/graph');

const router = express.Router();

// Simple health check that verifies Graph API token actually works
router.get('/', async (req, res) => {
  try {
    // Check token health by making a real API call
    const healthStatus = await checkTokenHealth();
    
    if (healthStatus.valid) {
      // Return healthy status
      return res.status(200).json({
        status: 'healthy',
        message: 'API token is working properly',
        timestamp: new Date().toISOString()
      });
    } else {
      // Return unhealthy status due to failed API call
      return res.status(503).json({
        status: 'unhealthy',
        message: healthStatus.message || 'API token is not working',
        timestamp: new Date().toISOString(),
        reason: healthStatus.reason || 'api_error'
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Return unhealthy status with error details
    return res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      reason: 'health_check_error',
      error: error.message
    });
  }
});

// Detailed health check with more diagnostic information
router.get('/details', async (req, res) => {
  try {
    // Get health status by making a real API call
    const healthStatus = await checkTokenHealth();
    
    // Build health status response
    const healthResponse = {
      status: healthStatus.valid ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      components: {
        api: {
          status: healthStatus.valid ? 'healthy' : 'unhealthy',
          working: healthStatus.valid,
          message: healthStatus.message
        }
      }
    };
    
    // Add reason if API call failed
    if (!healthStatus.valid && healthStatus.reason) {
      healthResponse.components.api.reason = healthStatus.reason;
    }
    
    // Set appropriate status code
    const statusCode = healthStatus.valid ? 200 : 503;
    
    return res.status(statusCode).json(healthResponse);
  } catch (error) {
    console.error('Detailed health check failed:', error);
    
    // Return unhealthy status with error details
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      components: {
        api: {
          status: 'unhealthy',
          working: false,
          reason: 'health_check_error',
          error: error.message
        }
      }
    });
  }
});

module.exports = router;