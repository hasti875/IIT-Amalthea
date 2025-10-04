const { expect } = require('chai');
const sinon = require('sinon');

// Test configuration and shared utilities
global.expect = expect;
global.sinon = sinon;

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/amalthea_test';

// Disable console.log during tests unless explicitly enabled
if (!process.env.ENABLE_TEST_LOGS) {
  console.log = () => {};
  console.info = () => {};
}

// Global test helpers
global.createMockUser = (overrides = {}) => {
  return {
    _id: 'test_user_id',
    name: 'Test User',
    email: 'test@example.com',
    department: 'Engineering',
    role: 'employee',
    isActive: true,
    createdAt: new Date(),
    ...overrides
  };
};

global.createMockExpense = (overrides = {}) => {
  return {
    _id: 'test_expense_id',
    amount: 100.00,
    currency: 'USD',
    category: 'Travel',
    description: 'Test expense',
    status: 'pending',
    submittedBy: 'test_user_id',
    submittedAt: new Date(),
    approvals: [],
    save: sinon.stub().resolves(),
    ...overrides
  };
};

global.createMockApprovalRule = (overrides = {}) => {
  return {
    _id: 'test_rule_id',
    department: 'Engineering',
    category: 'Travel',
    minAmount: 0,
    maxAmount: 1000,
    requiredApprovalCount: 1,
    requiredApprovers: ['manager_id'],
    isActive: true,
    ...overrides
  };
};

// Clean up after each test
afterEach(() => {
  sinon.restore();
});

// Timeout configuration for tests
const DEFAULT_TEST_TIMEOUT = 5000;

// Set default timeout for all tests
beforeEach(function() {
  this.timeout(DEFAULT_TEST_TIMEOUT);
});

// Helper to create mock HTTP responses
global.createMockAxiosResponse = (data, status = 200) => {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  };
};

// Helper to create mock file for OCR testing
global.createMockFile = (options = {}) => {
  return {
    path: options.path || '/test/path/receipt.jpg',
    size: options.size || 1024,
    mimetype: options.mimetype || 'image/jpeg',
    originalname: options.originalname || 'receipt.jpg'
  };
};

// Database connection mock helper
global.mockDatabaseConnection = () => {
  const mongoose = require('mongoose');
  sinon.stub(mongoose, 'connect').resolves();
  sinon.stub(mongoose, 'disconnect').resolves();
};

// Error testing helpers
global.expectBusinessLogicError = (fn, expectedMessage) => {
  return expect(fn).to.be.rejectedWith(Error).and.eventually.satisfy((err) => {
    return err.constructor.name === 'BusinessLogicError' && 
           err.message.includes(expectedMessage);
  });
};

global.expectValidationError = (fn, expectedMessage) => {
  return expect(fn).to.be.rejectedWith(Error).and.eventually.satisfy((err) => {
    return err.constructor.name === 'ValidationError' && 
           err.message.includes(expectedMessage);
  });
};

global.expectServiceError = (fn, expectedMessage) => {
  return expect(fn).to.be.rejectedWith(Error).and.eventually.satisfy((err) => {
    return err.constructor.name === 'ServiceError' && 
           err.message.includes(expectedMessage);
  });
};

module.exports = {
  // Export any additional test utilities here
};