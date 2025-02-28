const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const indexRoutes = require('./routes/index');
const { initEnvWatcher } = require('./config/env');
const { initScheduler } = require('./services/scheduler');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', indexRoutes);

// Initialize environment variable watcher
initEnvWatcher();

// Initialize scheduler
initScheduler();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;