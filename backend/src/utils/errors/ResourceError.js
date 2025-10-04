const BaseError = require('./BaseError');

/**
 * Resource Not Found Error class
 * Used when requested resources don't exist
 */
class NotFoundError extends BaseError {
  /**
   * @param {string} resource - Type of resource not found
   * @param {string|number} identifier - Resource identifier
   * @param {Object} metadata - Additional context
   */
  constructor(resource = 'Resource', identifier = null, metadata = {}) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404, 'NOT_FOUND', true, {
      resource,
      identifier,
      ...metadata
    });
  }

  /**
   * Creates error for user not found
   * @param {string} identifier - User identifier (email, id, etc.)
   * @returns {NotFoundError}
   */
  static user(identifier) {
    return new NotFoundError('User', identifier);
  }

  /**
   * Creates error for expense not found
   * @param {string} expenseId - Expense ID
   * @returns {NotFoundError}
   */
  static expense(expenseId) {
    return new NotFoundError('Expense', expenseId);
  }

  /**
   * Creates error for company not found
   * @param {string} companyId - Company ID
   * @returns {NotFoundError}
   */
  static company(companyId) {
    return new NotFoundError('Company', companyId);
  }

  /**
   * Creates error for approval rule not found
   * @param {string} ruleId - Rule ID
   * @returns {NotFoundError}
   */
  static approvalRule(ruleId) {
    return new NotFoundError('Approval Rule', ruleId);
  }
}

/**
 * Conflict Error class for resource conflicts
 * Used when operations conflict with existing data
 */
class ConflictError extends BaseError {
  /**
   * @param {string} message - Conflict error message
   * @param {string} resource - Conflicting resource
   * @param {Object} metadata - Additional context
   */
  constructor(message, resource = null, metadata = {}) {
    super(message, 409, 'CONFLICT', true, {
      resource,
      ...metadata
    });
  }

  /**
   * Creates error for duplicate email
   * @param {string} email - Conflicting email
   * @returns {ConflictError}
   */
  static duplicateEmail(email) {
    return new ConflictError(
      `User with email '${email}' already exists`,
      'user',
      { email }
    );
  }

  /**
   * Creates error for expense status conflict
   * @param {string} currentStatus - Current expense status
   * @param {string} attemptedStatus - Attempted status change
   * @returns {ConflictError}
   */
  static expenseStatusConflict(currentStatus, attemptedStatus) {
    return new ConflictError(
      `Cannot change expense status from '${currentStatus}' to '${attemptedStatus}'`,
      'expense',
      { currentStatus, attemptedStatus }
    );
  }
}

module.exports = {
  NotFoundError,
  ConflictError
};