const { expect } = require('chai');
const sinon = require('sinon');

// Import models and services
const Expense = require('../../src/models/Expense');
const ApprovalRule = require('../../src/models/ApprovalRule');
const User = require('../../src/models/User');
const { BusinessLogicError, ValidationError } = require('../../src/utils/errors');

describe('Approval Workflow - Business Logic Edge Cases', () => {
  let expenseFindStub, approvalRuleFindStub, userFindStub, expenseSaveStub;
  let mockExpense, mockUser, mockManager, mockApprovalRule;

  beforeEach(() => {
    // Stub model methods
    expenseFindStub = sinon.stub(Expense, 'findById');
    approvalRuleFindStub = sinon.stub(ApprovalRule, 'find');
    userFindStub = sinon.stub(User, 'findById');
    expenseSaveStub = sinon.stub(Expense.prototype, 'save');

    // Mock data
    mockUser = {
      _id: 'user123',
      name: 'John Doe',
      email: 'john@company.com',
      department: 'Engineering',
      role: 'employee'
    };

    mockManager = {
      _id: 'manager123',
      name: 'Jane Manager',
      email: 'jane@company.com',
      department: 'Engineering',
      role: 'manager'
    };

    mockExpense = {
      _id: 'expense123',
      amount: 150.00,
      currency: 'USD',
      category: 'Travel',
      status: 'pending',
      submittedBy: 'user123',
      submittedAt: new Date(),
      approvals: [],
      save: expenseSaveStub
    };

    mockApprovalRule = {
      _id: 'rule123',
      department: 'Engineering',
      category: 'Travel',
      minAmount: 100,
      maxAmount: 500,
      requiredApprovers: ['manager123'],
      requiredApprovalCount: 1,
      isActive: true
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Approval Rule Matching Edge Cases', () => {
    it('should handle expenses that match multiple overlapping rules', async () => {
      const overlappingRules = [
        { // General rule
          department: 'Engineering',
          category: 'Travel',
          minAmount: 0,
          maxAmount: 1000,
          requiredApprovalCount: 1,
          priority: 1
        },
        { // Specific high-amount rule
          department: 'Engineering',
          category: 'Travel',
          minAmount: 100,
          maxAmount: 500,
          requiredApprovalCount: 2,
          priority: 2
        }
      ];

      approvalRuleFindStub.resolves(overlappingRules);
      expenseFindStub.resolves(mockExpense);

      const { determineApprovalRequirements } = require('../../src/services/approvalService');
      const requirements = await determineApprovalRequirements('expense123');

      // Should use the higher priority rule (more specific)
      expect(requirements.requiredApprovalCount).to.equal(2);
      expect(requirements.appliedRule.priority).to.equal(2);
    });

    it('should handle expenses with no matching approval rules', async () => {
      mockExpense.category = 'Miscellaneous';
      mockExpense.amount = 25.00;

      approvalRuleFindStub.resolves([]); // No matching rules
      expenseFindStub.resolves(mockExpense);

      const { determineApprovalRequirements } = require('../../src/services/approvalService');
      
      try {
        await determineApprovalRequirements('expense123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(BusinessLogicError);
        expect(error.message).to.include('No approval rule found');
      }
    });

    it('should handle disabled approval rules', async () => {
      mockApprovalRule.isActive = false;

      approvalRuleFindStub.resolves([mockApprovalRule]);
      expenseFindStub.resolves(mockExpense);

      const { determineApprovalRequirements } = require('../../src/services/approvalService');
      
      try {
        await determineApprovalRequirements('expense123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(BusinessLogicError);
        expect(error.message).to.include('No active approval rule');
      }
    });

    it('should handle rules with missing required approvers', async () => {
      mockApprovalRule.requiredApprovers = ['nonexistent_user'];

      approvalRuleFindStub.resolves([mockApprovalRule]);
      expenseFindStub.resolves(mockExpense);
      userFindStub.resolves(null); // Approver not found

      const { processApproval } = require('../../src/services/approvalService');
      
      try {
        await processApproval('expense123', 'nonexistent_user', 'approved');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('Approver not found');
      }
    });
  });

  describe('Approval Override Scenarios', () => {
    it('should handle CEO override for any expense amount', async () => {
      const ceoUser = {
        ...mockUser,
        _id: 'ceo123',
        role: 'ceo',
        permissions: ['expense_override']
      };

      mockExpense.amount = 5000.00; // High amount
      mockApprovalRule.maxAmount = 500; // Rule doesn't normally cover this

      expenseFindStub.resolves(mockExpense);
      userFindStub.withArgs('ceo123').resolves(ceoUser);
      approvalRuleFindStub.resolves([mockApprovalRule]);

      const { processApproval } = require('../../src/services/approvalService');
      const result = await processApproval('expense123', 'ceo123', 'approved', {
        override: true,
        reason: 'Executive decision'
      });

      expect(result.approved).to.be.true;
      expect(result.overrideUsed).to.be.true;
      expect(result.finalApprover).to.equal('ceo123');
      expect(mockExpense.status).to.equal('approved');
    });

    it('should reject override attempts by unauthorized users', async () => {
      const regularUser = {
        ...mockUser,
        role: 'employee',
        permissions: []
      };

      expenseFindStub.resolves(mockExpense);
      userFindStub.resolves(regularUser);

      const { processApproval } = require('../../src/services/approvalService');
      
      try {
        await processApproval('expense123', 'user123', 'approved', {
          override: true,
          reason: 'I want to override'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('not authorized to override');
      }
    });

    it('should require override reason for override approvals', async () => {
      const ceoUser = {
        ...mockUser,
        _id: 'ceo123',
        role: 'ceo',
        permissions: ['expense_override']
      };

      expenseFindStub.resolves(mockExpense);
      userFindStub.resolves(ceoUser);

      const { processApproval } = require('../../src/services/approvalService');
      
      try {
        await processApproval('expense123', 'ceo123', 'approved', {
          override: true
          // Missing reason
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('Override reason is required');
      }
    });
  });

  describe('Multi-Level Approval Workflows', () => {
    it('should handle sequential approval requirements correctly', async () => {
      const multiLevelRule = {
        ...mockApprovalRule,
        requiredApprovalCount: 2,
        requiredApprovers: ['manager123', 'director456'],
        approvalSequence: ['manager123', 'director456']
      };

      mockExpense.approvals = []; // No approvals yet
      
      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([multiLevelRule]);
      userFindStub.withArgs('manager123').resolves(mockManager);

      const { processApproval } = require('../../src/services/approvalService');
      
      // First approval by manager
      const firstResult = await processApproval('expense123', 'manager123', 'approved');

      expect(firstResult.approved).to.be.false; // Not fully approved yet
      expect(firstResult.pendingApprovals).to.equal(1);
      expect(mockExpense.status).to.equal('pending');
      expect(mockExpense.approvals).to.have.length(1);
    });

    it('should handle parallel approval workflows', async () => {
      const parallelRule = {
        ...mockApprovalRule,
        requiredApprovalCount: 2,
        requiredApprovers: ['manager123', 'hr456'],
        parallelApproval: true
      };

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([parallelRule]);
      userFindStub.withArgs('manager123').resolves(mockManager);
      userFindStub.withArgs('hr456').resolves({
        _id: 'hr456',
        name: 'HR Manager',
        role: 'hr_manager'
      });

      const { processApproval } = require('../../src/services/approvalService');
      
      // Both approvals can happen simultaneously
      const managerResult = await processApproval('expense123', 'manager123', 'approved');
      const hrResult = await processApproval('expense123', 'hr456', 'approved');

      expect(hrResult.approved).to.be.true; // Fully approved after second approval
      expect(mockExpense.status).to.equal('approved');
      expect(mockExpense.approvals).to.have.length(2);
    });

    it('should handle rejection in multi-level approval', async () => {
      const multiLevelRule = {
        ...mockApprovalRule,
        requiredApprovalCount: 2,
        requiredApprovers: ['manager123', 'director456']
      };

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([multiLevelRule]);
      userFindStub.withArgs('manager123').resolves(mockManager);

      const { processApproval } = require('../../src/services/approvalService');
      
      // Manager rejects the expense
      const result = await processApproval('expense123', 'manager123', 'rejected', {
        reason: 'Insufficient documentation'
      });

      expect(result.approved).to.be.false;
      expect(result.rejected).to.be.true;
      expect(mockExpense.status).to.equal('rejected');
      expect(mockExpense.rejectedBy).to.equal('manager123');
      expect(mockExpense.rejectionReason).to.equal('Insufficient documentation');
    });
  });

  describe('Approval Deadline and Time-based Logic', () => {
    it('should handle auto-approval for overdue expenses', async () => {
      const overdueRule = {
        ...mockApprovalRule,
        autoApprovalDeadline: 7, // 7 days
        autoApprovalAmount: 200
      };

      // Expense submitted 10 days ago
      mockExpense.submittedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockExpense.amount = 150; // Within auto-approval limit

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([overdueRule]);

      const { checkAutoApprovalEligibility } = require('../../src/services/approvalService');
      const result = await checkAutoApprovalEligibility('expense123');

      expect(result.eligible).to.be.true;
      expect(result.reason).to.include('deadline exceeded');
      expect(result.daysOverdue).to.equal(3);
    });

    it('should not auto-approve high-value overdue expenses', async () => {
      const overdueRule = {
        ...mockApprovalRule,
        autoApprovalDeadline: 7,
        autoApprovalAmount: 200
      };

      mockExpense.submittedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockExpense.amount = 500; // Exceeds auto-approval limit

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([overdueRule]);

      const { checkAutoApprovalEligibility } = require('../../src/services/approvalService');
      const result = await checkAutoApprovalEligibility('expense123');

      expect(result.eligible).to.be.false;
      expect(result.reason).to.include('amount exceeds auto-approval limit');
      expect(result.requiresManualApproval).to.be.true;
    });

    it('should handle approvals during non-business hours', async () => {
      // Mock current time to be weekend
      const weekendDate = new Date('2024-01-13T15:00:00Z'); // Saturday
      sinon.useFakeTimers(weekendDate);

      const businessHourRule = {
        ...mockApprovalRule,
        businessHoursOnly: true,
        timeZone: 'America/New_York'
      };

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([businessHourRule]);
      userFindStub.resolves(mockManager);

      const { processApproval } = require('../../src/services/approvalService');
      const result = await processApproval('expense123', 'manager123', 'approved');

      expect(result.deferredToBusinessHours).to.be.true;
      expect(result.scheduledProcessingTime).to.be.a('date');
      expect(mockExpense.status).to.equal('pending_business_hours');

      sinon.restore(); // Restore real timers
    });
  });

  describe('Delegation and Temporary Approval Rights', () => {
    it('should handle approval delegation during manager absence', async () => {
      const delegationRule = {
        delegatedFrom: 'manager123',
        delegatedTo: 'acting_manager456',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        reason: 'Manager on vacation'
      };

      const actingManager = {
        _id: 'acting_manager456',
        name: 'Acting Manager',
        role: 'acting_manager',
        delegations: [delegationRule]
      };

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([mockApprovalRule]);
      userFindStub.withArgs('acting_manager456').resolves(actingManager);

      const { processApproval } = require('../../src/services/approvalService');
      const result = await processApproval('expense123', 'acting_manager456', 'approved', {
        delegatedApproval: true,
        originalApprover: 'manager123'
      });

      expect(result.approved).to.be.true;
      expect(result.delegatedApproval).to.be.true;
      expect(result.originalApprover).to.equal('manager123');
      expect(result.actualApprover).to.equal('acting_manager456');
    });

    it('should reject expired delegation attempts', async () => {
      const expiredDelegation = {
        delegatedFrom: 'manager123',
        delegatedTo: 'acting_manager456',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (expired)
      };

      const actingManager = {
        _id: 'acting_manager456',
        name: 'Acting Manager',
        delegations: [expiredDelegation]
      };

      expenseFindStub.resolves(mockExpense);
      userFindStub.resolves(actingManager);

      const { processApproval } = require('../../src/services/approvalService');
      
      try {
        await processApproval('expense123', 'acting_manager456', 'approved', {
          delegatedApproval: true,
          originalApprover: 'manager123'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('Delegation has expired');
      }
    });
  });

  describe('Audit Trail and Compliance', () => {
    it('should maintain complete audit trail for complex approvals', async () => {
      const auditTrail = [];
      
      // Mock audit logging
      const auditStub = sinon.stub().callsFake((entry) => {
        auditTrail.push(entry);
      });

      mockExpense.addAuditEntry = auditStub;

      expenseFindStub.resolves(mockExpense);
      approvalRuleFindStub.resolves([mockApprovalRule]);
      userFindStub.resolves(mockManager);

      const { processApproval } = require('../../src/services/approvalService');
      await processApproval('expense123', 'manager123', 'approved');

      expect(auditTrail).to.have.length.greaterThan(0);
      expect(auditTrail[0]).to.have.property('action', 'approval_processed');
      expect(auditTrail[0]).to.have.property('approver', 'manager123');
      expect(auditTrail[0]).to.have.property('timestamp');
      expect(auditTrail[0]).to.have.property('result', 'approved');
    });

    it('should handle approval workflow state corruption recovery', async () => {
      // Expense in invalid state
      mockExpense.status = 'corrupted_state';
      mockExpense.approvals = [
        { approver: 'unknown_user', decision: 'approved', timestamp: new Date() }
      ];

      expenseFindStub.resolves(mockExpense);

      const { validateAndRepairWorkflowState } = require('../../src/services/approvalService');
      
      try {
        await validateAndRepairWorkflowState('expense123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(BusinessLogicError);
        expect(error.message).to.include('Workflow state corruption detected');
        expect(error.repairSuggestions).to.be.an('array');
      }
    });
  });
});