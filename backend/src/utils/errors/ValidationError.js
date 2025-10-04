const BaseError = require('./BaseError');

/**
 * Validation Error class for input validation failures
 * Used when request data doesn't meet validation criteria
 */
class ValidationError extends BaseError {
  /**
   * @param {string} message - Validation error message
   * @param {Array|Object} details - Validation error details
   * @param {string} field - Field that failed validation
   */
  constructor(message = 'Validation failed', details = null, field = null) {
    super(message, 400, 'VALIDATION_ERROR', true, {
      details,
      field,
      type: 'validation'
    });
  }

  /**
   * Creates ValidationError from Joi validation result
   * @param {Object} joiError - Joi validation error
   * @returns {ValidationError} Formatted validation error
   */
  static fromJoi(joiError) {
    const details = joiError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return new ValidationError(
      'Input validation failed',
      details,
      details[0]?.field
    );
  }

  /**
   * Creates ValidationError from mongoose validation error
   * @param {Object} mongooseError - Mongoose validation error
   * @returns {ValidationError} Formatted validation error
   */
  static fromMongoose(mongooseError) {
    const details = Object.keys(mongooseError.errors).map(key => ({
      field: key,
      message: mongooseError.errors[key].message,
      value: mongooseError.errors[key].value
    }));

    return new ValidationError(
      'Database validation failed',
      details,
      details[0]?.field
    );
  }
}

module.exports = ValidationError;