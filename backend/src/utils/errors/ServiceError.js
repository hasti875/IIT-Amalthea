const BaseError = require('./BaseError');

/**
 * Service Error class for external service failures
 * Used when external APIs or services fail
 */
class ServiceError extends BaseError {
  /**
   * @param {string} message - Service error message
   * @param {string} service - Name of the failing service
   * @param {number} statusCode - HTTP status code
   * @param {Object} metadata - Additional error context
   */
  constructor(message, service, statusCode = 503, metadata = {}) {
    super(message, statusCode, 'SERVICE_ERROR', true, {
      service,
      ...metadata
    });
  }

  /**
   * Creates error for OCR service failure
   * @param {string} reason - Reason for OCR failure
   * @param {Object} metadata - Additional context
   * @returns {ServiceError}
   */
  static ocrFailure(reason = 'OCR processing failed', metadata = {}) {
    return new ServiceError(
      `OCR Service Error: ${reason}`,
      'ocr',
      503,
      { reason, ...metadata }
    );
  }

  /**
   * Creates error for currency API failure
   * @param {string} reason - Reason for currency API failure
   * @param {Object} metadata - Additional context
   * @returns {ServiceError}
   */
  static currencyApiFailure(reason = 'Currency conversion failed', metadata = {}) {
    return new ServiceError(
      `Currency API Error: ${reason}`,
      'currency-api',
      503,
      { reason, ...metadata }
    );
  }

  /**
   * Creates error for database service failure
   * @param {string} operation - Database operation that failed
   * @param {Object} metadata - Additional context
   * @returns {ServiceError}
   */
  static databaseFailure(operation, metadata = {}) {
    return new ServiceError(
      `Database Error: ${operation} failed`,
      'database',
      500,
      { operation, ...metadata }
    );
  }

  /**
   * Creates error for file upload service failure
   * @param {string} reason - Reason for upload failure
   * @param {Object} metadata - Additional context
   * @returns {ServiceError}
   */
  static uploadFailure(reason = 'File upload failed', metadata = {}) {
    return new ServiceError(
      `Upload Service Error: ${reason}`,
      'file-upload',
      500,
      { reason, ...metadata }
    );
  }
}

/**
 * Business Logic Error class for business rule violations
 * Used when business logic constraints are violated
 */
class BusinessLogicError extends BaseError {
  /**
   * @param {string} message - Business logic error message
   * @param {string} rule - Business rule that was violated
   * @param {Object} metadata - Additional context
   */
  constructor(message, rule = null, metadata = {}) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', true, {
      rule,
      ...metadata
    });
  }

  /**
   * Creates error for approval workflow violation
   * @param {string} reason - Reason for workflow violation
   * @returns {BusinessLogicError}
   */
  static approvalWorkflowViolation(reason) {
    return new BusinessLogicError(
      `Approval workflow violation: ${reason}`,
      'approval_workflow'
    );
  }

  /**
   * Creates error for expense limit exceeded
   * @param {number} amount - Expense amount
   * @param {number} limit - Expense limit
   * @returns {BusinessLogicError}
   */
  static expenseLimitExceeded(amount, limit) {
    return new BusinessLogicError(
      `Expense amount ${amount} exceeds limit of ${limit}`,
      'expense_limit',
      { amount, limit }
    );
  }

  /**
   * Creates error for duplicate submission
   * @param {string} resource - Resource being duplicated
   * @returns {BusinessLogicError}
   */
  static duplicateSubmission(resource) {
    return new BusinessLogicError(
      `Duplicate ${resource} submission not allowed`,
      'duplicate_submission',
      { resource }
    );
  }
}

module.exports = {
  ServiceError,
  BusinessLogicError
};