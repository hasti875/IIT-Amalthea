const BaseError = require('./BaseError');
const ValidationError = require('./ValidationError');
const { AuthenticationError, AuthorizationError } = require('./AuthError');
const { ServiceError, BusinessLogicError } = require('./ServiceError');
const { NotFoundError, ConflictError } = require('./ResourceError');

/**
 * Custom Error Handler function
 * Handles different types of errors and returns appropriate responses
 */
const handleError = (error, req, res, next) => {
  let customError = error;

  // Convert Mongoose validation errors
  if (error.name === 'ValidationError') {
    customError = ValidationError.fromMongoose(error);
  }

  // Convert Mongoose cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    customError = new NotFoundError('Resource', error.value);
  }

  // Convert Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    
    if (field === 'email') {
      customError = ConflictError.duplicateEmail(value);
    } else {
      customError = new ConflictError(
        `Duplicate ${field}: ${value}`,
        field,
        { field, value }
      );
    }
  }

  // Convert JWT errors
  if (error.name === 'JsonWebTokenError') {
    customError = AuthenticationError.invalidToken();
  }

  if (error.name === 'TokenExpiredError') {
    customError = AuthenticationError.tokenExpired();
  }

  // If it's not a custom error, wrap it in BaseError
  if (!(customError instanceof BaseError)) {
    customError = new BaseError(
      error.message || 'Something went wrong',
      error.statusCode || 500,
      'INTERNAL_ERROR',
      false,
      { originalError: error.name }
    );
  }

  // Log error
  customError.log();

  // Send error response
  res.status(customError.statusCode).json({
    status: 'error',
    ...customError.toJSON()
  });
};

/**
 * Async Error Handler wrapper
 * Wraps async functions to catch errors and pass to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Error Handler
 * Handles routes that don't exist
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route', `${req.method} ${req.originalUrl}`);
  next(error);
};

module.exports = {
  // Error Classes
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ServiceError,
  BusinessLogicError,
  NotFoundError,
  ConflictError,
  
  // Handlers
  handleError,
  asyncHandler,
  notFoundHandler
};