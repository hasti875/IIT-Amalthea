const BaseError = require('./BaseError');

/**
 * Authentication Error class for authentication and authorization failures
 * Used when user authentication or authorization fails
 */
class AuthenticationError extends BaseError {
  /**
   * @param {string} message - Authentication error message
   * @param {string} type - Type of auth error (invalid_credentials, token_expired, etc.)
   * @param {Object} metadata - Additional context
   */
  constructor(message = 'Authentication failed', type = 'invalid_credentials', metadata = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, {
      type,
      ...metadata
    });
  }

  /**
   * Creates error for invalid credentials
   * @returns {AuthenticationError}
   */
  static invalidCredentials() {
    return new AuthenticationError(
      'Invalid email or password',
      'invalid_credentials'
    );
  }

  /**
   * Creates error for expired token
   * @returns {AuthenticationError}
   */
  static tokenExpired() {
    return new AuthenticationError(
      'Token has expired',
      'token_expired'
    );
  }

  /**
   * Creates error for invalid token
   * @returns {AuthenticationError}
   */
  static invalidToken() {
    return new AuthenticationError(
      'Invalid or malformed token',
      'invalid_token'
    );
  }

  /**
   * Creates error for missing token
   * @returns {AuthenticationError}
   */
  static missingToken() {
    return new AuthenticationError(
      'Access token is required',
      'missing_token'
    );
  }
}

/**
 * Authorization Error class for permission-related failures
 * Used when user doesn't have required permissions
 */
class AuthorizationError extends BaseError {
  /**
   * @param {string} message - Authorization error message
   * @param {string} requiredRole - Required role for the action
   * @param {string} userRole - User's current role
   */
  constructor(message = 'Access forbidden', requiredRole = null, userRole = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, {
      requiredRole,
      userRole,
      type: 'authorization'
    });
  }

  /**
   * Creates error for insufficient permissions
   * @param {string} requiredRole - Required role
   * @param {string} userRole - User's role
   * @returns {AuthorizationError}
   */
  static insufficientPermissions(requiredRole, userRole) {
    return new AuthorizationError(
      `Access denied. Required role: ${requiredRole}`,
      requiredRole,
      userRole
    );
  }

  /**
   * Creates error for resource access denial
   * @param {string} resource - Resource being accessed
   * @returns {AuthorizationError}
   */
  static resourceAccessDenied(resource) {
    return new AuthorizationError(
      `Access denied to ${resource}`,
      null,
      null
    );
  }
}

module.exports = {
  AuthenticationError,
  AuthorizationError
};