const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Middleware to protect routes and authenticate users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if authenticated, returns error response if not
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).populate('company').select('-password');

      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Not authorized, user not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Account is deactivated'
        });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, no token'
    });
  }
};

/**
 * @desc    Middleware to authorize specific user roles
 * @param {...string} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * @desc    Middleware to check if user belongs to the same company for data access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if authorized, returns error response if not
 */
const checkCompanyAccess = (req, res, next) => {
  // Skip for admin users
  if (req.user.role === 'admin') {
    return next();
  }

  // Extract company ID from request params or body
  const companyId = req.params.companyId || req.body.company;
  
  if (companyId && companyId !== req.user.company._id.toString()) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. You can only access data from your company.'
    });
  }

  next();
};

/**
 * @desc    Generate JWT token for user authentication
 * @param {string} id - User ID to encode in the token
 * @returns {string} JWT token string
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = {
  protect,
  authorize,
  checkCompanyAccess,
  generateToken
};