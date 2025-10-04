/**
 * Base Error class for all custom errors in the application
 * Provides structured error handling with consistent interface
 */
class BaseError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code for identification
   * @param {boolean} isOperational - Whether error is operational (expected)
   * @param {Object} metadata - Additional error context
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true, metadata = {}) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to JSON format for API responses
   * @returns {Object} Serialized error object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      metadata: this.metadata,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }

  /**
   * Logs error with appropriate level
   * @param {Object} logger - Logger instance
   */
  log(logger = console) {
    const logData = {
      error: this.toJSON(),
      stack: this.stack
    };

    if (this.statusCode >= 500) {
      logger.error('Server Error:', logData);
    } else if (this.statusCode >= 400) {
      logger.warn('Client Error:', logData);
    } else {
      logger.info('Error Info:', logData);
    }
  }
}

module.exports = BaseError;