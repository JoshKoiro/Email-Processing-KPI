const cron = require('node-cron');
const { updateDailyEmailStats, updateMidnightInboxCount } = require('./graph');

// Initialize scheduler
const initScheduler = () => {
  try {
    // Schedule hourly job to update daily email stats
    cron.schedule('0 * * * *', async () => {
      console.log('Running scheduled task: Update daily email stats');
      await updateDailyEmailStats();
    });
    
    // Schedule midnight job to update inbox count
    cron.schedule('0 0 * * *', async () => {
      console.log('Running scheduled task: Update midnight inbox count');
      await updateMidnightInboxCount();
    });
    
    // Initial run to get data immediately
    setTimeout(async () => {
      console.log('Initial run: Update daily email stats');
      await updateDailyEmailStats();
    }, 5000);
    
    console.log('Scheduler initialized');
    return true;
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    return false;
  }
};

module.exports = {
  initScheduler,
};