const fs = require('fs').promises;
const path = require('path');

// Path to the data file
const dataFilePath = path.resolve(process.cwd(), 'data', 'email-stats.json');

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.resolve(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error creating data directory:', error);
    return false;
  }
};

// Load existing data
const loadData = async () => {
  try {
    await ensureDataDirectory();
    
    try {
      const data = await fs.readFile(dataFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty structure
      if (error.code === 'ENOENT' || error instanceof SyntaxError) {
        return { dailyStats: [] };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading data:', error);
    return { dailyStats: [] };
  }
};

// Save data to file
const saveData = async (data) => {
  try {
    await ensureDataDirectory();
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
};

// Save email stats
const saveEmailStats = async (stats) => {
  try {
    // Load existing data
    const data = await loadData();
    
    // Find existing entry for today
    const todayIndex = data.dailyStats.findIndex(
      entry => entry.date === stats.date
    );
    
    if (todayIndex >= 0) {
      // Update existing entry
      if (stats.type === 'received') {
        data.dailyStats[todayIndex].emailsReceived = stats.emailsReceived;
      } else if (stats.type === 'midnight') {
        data.dailyStats[todayIndex].inboxCountAtMidnight = stats.inboxCountAtMidnight;
      }
    } else {
      // Create new entry
      const newEntry = {
        date: stats.date,
      };
      
      if (stats.type === 'received') {
        newEntry.emailsReceived = stats.emailsReceived;
      } else if (stats.type === 'midnight') {
        newEntry.inboxCountAtMidnight = stats.inboxCountAtMidnight;
      }
      
      data.dailyStats.push(newEntry);
    }
    
    // Sort entries by date (newest first)
    data.dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save updated data
    await saveData(data);
    return true;
  } catch (error) {
    console.error('Error saving email stats:', error);
    return false;
  }
};

// Get all email stats
const getAllEmailStats = async () => {
  try {
    const data = await loadData();
    return data.dailyStats;
  } catch (error) {
    console.error('Error getting all email stats:', error);
    return [];
  }
};

module.exports = {
  loadData,
  saveData,
  saveEmailStats,
  getAllEmailStats,
};