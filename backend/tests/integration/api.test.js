const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');

// Import the main app
const app = require('../../server');
const User = require('../../src/models/User');
const Expense = require('../../src/models/Expense');
const jwt = require('jsonwebtoken');

describe('Expense API Integration Tests - Error Handling', () => {
  let authToken, mockUser;

  beforeEach(() => {
    // Create mock user and auth token
    mockUser = {
      _id: 'integration_user_id',
      name: 'Integration Test User',
      email: 'integration@test.com',
      department: 'Engineering',
      role: 'employee'
    };

    authToken = jwt.sign(
      { userId: mockUser._id, email: mockUser.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Stub user lookup for auth middleware
    sinon.stub(User, 'findById').resolves(mockUser);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /api/expenses - Error Scenarios', () => {
    it('should handle invalid expense data gracefully', async () => {
      const invalidExpenseData = {
        amount: 'not_a_number',
        currency: 'INVALID_CURRENCY',
        category: '',
        description: 'a'.repeat(1001) // Too long
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidExpenseData)
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Validation failed');
      expect(response.body).to.have.property('validationErrors').that.is.an('array');
    });

    it('should handle file upload failures gracefully', async () => {
      // Mock file upload service failure
      const ocrService = require('../../src/services/ocrService');
      sinon.stub(ocrService, 'processOCR').rejects(new Error('OCR service unavailable'));

      const validExpenseData = {
        amount: 150.00,
        currency: 'USD',
        category: 'Travel',
        description: 'Business trip expenses'
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .field('amount', validExpenseData.amount)
        .field('currency', validExpenseData.currency)
        .field('category', validExpenseData.category)
        .field('description', validExpenseData.description)
        .attach('receipt', Buffer.from('fake_image_data'), 'receipt.jpg')
        .expect(201); // Should still create expense even if OCR fails

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('ocrProcessed', false);
      expect(response.body.data).to.have.property('ocrError');
    });

    it('should handle database connection failures', async () => {
      // Mock database save failure
      sinon.stub(Expense.prototype, 'save').rejects(new Error('Database connection lost'));

      const validExpenseData = {
        amount: 75.50,
        currency: 'USD',
        category: 'Meals',
        description: 'Team lunch'
      };

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validExpenseData)
        .expect(500);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Internal server error');
    });

    it('should handle concurrent submissions of identical expenses', async () => {
      const duplicateExpenseData = {
        amount: 100.00,
        currency: 'USD',
        category: 'Office Supplies',
        description: 'Laptop charger'
      };

      // Mock existing expense with same details
      sinon.stub(Expense, 'findOne').resolves({
        _id: 'existing_expense_id',
        ...duplicateExpenseData,
        submittedBy: mockUser._id,
        submittedAt: new Date()
      });

      sinon.stub(Expense.prototype, 'save').resolves({
        _id: 'new_expense_id',
        ...duplicateExpenseData
      });

      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateExpenseData)
        .expect(201); // Should create but with warning

      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('warning');
      expect(response.body.warning).to.include('Similar expense detected');
    });
  });

  describe('GET /api/expenses - Error Scenarios', () => {
    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .query({
          page: 'invalid',
          limit: -5,
          sortBy: 'nonexistent_field'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Invalid pagination parameters');
    });

    it('should handle database query failures gracefully', async () => {
      // Mock database query failure
      sinon.stub(Expense, 'find').rejects(new Error('Query timeout'));

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Failed to fetch expenses');
    });

    it('should handle empty result sets appropriately', async () => {
      // Mock empty result
      sinon.stub(Expense, 'find').returns({
        sort: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        skip: sinon.stub().resolves([]),
      });

      sinon.stub(Expense, 'countDocuments').resolves(0);

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('expenses').that.is.an('array').with.length(0);
      expect(response.body.data).to.have.property('total', 0);
      expect(response.body.data).to.have.property('message', 'No expenses found');
    });
  });

  describe('PUT /api/expenses/:id/approve - Approval Error Scenarios', () => {
    it('should handle approval of non-existent expense', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      sinon.stub(Expense, 'findById').resolves(null);

      const response = await request(app)
        .put(`/api/expenses/${nonExistentId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ decision: 'approved' })
        .expect(404);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Expense not found');
    });

    it('should handle unauthorized approval attempts', async () => {
      const mockExpense = {
        _id: 'test_expense_id',
        status: 'pending',
        submittedBy: 'other_user_id',
        amount: 200.00
      };

      sinon.stub(Expense, 'findById').resolves(mockExpense);

      // User trying to approve their own expense (not allowed)
      mockExpense.submittedBy = mockUser._id;

      const response = await request(app)
        .put(`/api/expenses/${mockExpense._id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ decision: 'approved' })
        .expect(403);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Cannot approve your own expense');
    });

    it('should handle approval workflow service failures', async () => {
      const mockExpense = {
        _id: 'test_expense_id',
        status: 'pending',
        submittedBy: 'other_user_id',
        amount: 200.00
      };

      sinon.stub(Expense, 'findById').resolves(mockExpense);

      // Mock approval service failure
      const approvalService = require('../../src/services/approvalService');
      if (approvalService.processApproval) {
        sinon.stub(approvalService, 'processApproval')
          .rejects(new Error('Approval service temporarily unavailable'));
      }

      const response = await request(app)
        .put(`/api/expenses/${mockExpense._id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ decision: 'approved' })
        .expect(500);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Approval processing failed');
    });
  });

  describe('Authentication and Authorization Edge Cases', () => {
    it('should handle expired JWT tokens', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: mockUser._id, email: mockUser.email }, 
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Token expired');
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedToken = 'invalid.jwt.token.format';

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Invalid token');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .expect(401);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('No token provided');
    });

    it('should handle user account deactivation during session', async () => {
      // Mock user as deactivated
      User.findById.restore();
      sinon.stub(User, 'findById').resolves({
        ...mockUser,
        isActive: false,
        deactivatedAt: new Date()
      });

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Account deactivated');
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle rate limiting gracefully', async () => {
      // Skip if rate limiting not implemented yet
      if (!process.env.ENABLE_RATE_LIMITING) {
        return;
      }

      // Simulate many rapid requests
      const rapidRequests = Array(100).fill().map(() =>
        request(app)
          .get('/api/expenses')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(rapidRequests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).to.be.greaterThan(0);
      rateLimitedResponses.forEach(response => {
        expect(response.body).to.have.property('error');
        expect(response.body.error).to.include('Too many requests');
      });
    });

    it('should sanitize SQL injection attempts in query parameters', async () => {
      const maliciousQuery = {
        category: "'; DROP TABLE expenses; --",
        description: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .get('/api/expenses')
        .query(maliciousQuery)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Invalid query parameters');
    });
  });
});