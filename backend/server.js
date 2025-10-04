const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const approvalRoutes = require('./src/routes/approvalRoutes');
const currencyRoutes = require('./src/routes/currencyRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { protect } = require('./src/middleware/authMiddleware');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Debug middleware for API requests
app.use('/api', (req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-reimbursement')
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Seed currencies on first run
  const { seedCurrencies } = require('./src/utils/seedCurrencies');
  await seedCurrencies();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/companies', protect, companyRoutes);
app.use('/api/expenses', protect, expenseRoutes);
app.use('/api/approvals', protect, approvalRoutes);
app.use('/api/currencies', protect, currencyRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Expense Reimbursement API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Static files for uploaded receipts
app.use('/uploads', express.static('uploads'));

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;