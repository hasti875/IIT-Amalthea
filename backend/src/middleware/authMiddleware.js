const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
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

// Grant access to specific roles
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

// Check if user belongs to the same company
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

// Generate JWT Token
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