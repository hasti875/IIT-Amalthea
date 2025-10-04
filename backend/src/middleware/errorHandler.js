const { handleError } = require('../utils/errors');

/**
 * Enhanced Error handling middleware using structured error classes
 * Provides consistent error responses with proper logging and formatting
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = handleError;

module.exports = errorHandler;