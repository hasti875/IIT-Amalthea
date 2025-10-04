const ApprovalRule = require('../models/ApprovalRule');

// @desc    Get all approval rules
// @route   GET /api/approval-rules
// @access  Private (Admin)
const getApprovalRules = async (req, res) => {
  try {
    const rules = await ApprovalRule.find({ company: req.user.company._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        rules,
        count: rules.length
      }
    });
  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching approval rules'
    });
  }
};

// @desc    Get single approval rule
// @route   GET /api/approval-rules/:id
// @access  Private (Admin)
const getApprovalRule = async (req, res) => {
  try {
    const rule = await ApprovalRule.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Approval rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { rule }
    });
  } catch (error) {
    console.error('Get approval rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching approval rule'
    });
  }
};

// @desc    Create new approval rule
// @route   POST /api/approval-rules
// @access  Private (Admin)
const createApprovalRule = async (req, res) => {
  try {
    const { name, description, conditions, approvers, isActive } = req.body;

    // Validate required fields
    if (!name || !approvers || !Array.isArray(approvers) || approvers.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and at least one approver are required'
      });
    }

    // Check for duplicate rule names
    const existingRule = await ApprovalRule.findOne({
      name,
      company: req.user.company._id
    });

    if (existingRule) {
      return res.status(400).json({
        status: 'error',
        message: 'Approval rule with this name already exists'
      });
    }

    const rule = new ApprovalRule({
      name,
      description,
      conditions: conditions || {},
      approvers,
      isActive: isActive !== undefined ? isActive : true,
      company: req.user.company._id,
      createdBy: req.user.id
    });

    await rule.save();

    res.status(201).json({
      status: 'success',
      message: 'Approval rule created successfully',
      data: { rule }
    });
  } catch (error) {
    console.error('Create approval rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error creating approval rule'
    });
  }
};

// @desc    Update approval rule
// @route   PUT /api/approval-rules/:id
// @access  Private (Admin)
const updateApprovalRule = async (req, res) => {
  try {
    const { name, description, conditions, approvers, isActive } = req.body;

    const rule = await ApprovalRule.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Approval rule not found'
      });
    }

    // Check for duplicate names (excluding current rule)
    if (name && name !== rule.name) {
      const existingRule = await ApprovalRule.findOne({
        name,
        company: req.user.company._id,
        _id: { $ne: req.params.id }
      });

      if (existingRule) {
        return res.status(400).json({
          status: 'error',
          message: 'Approval rule with this name already exists'
        });
      }
    }

    // Update fields
    if (name) rule.name = name;
    if (description) rule.description = description;
    if (conditions) rule.conditions = { ...rule.conditions, ...conditions };
    if (approvers) rule.approvers = approvers;
    if (isActive !== undefined) rule.isActive = isActive;
    
    rule.updatedBy = req.user.id;
    rule.updatedAt = new Date();

    await rule.save();

    res.status(200).json({
      status: 'success',
      message: 'Approval rule updated successfully',
      data: { rule }
    });
  } catch (error) {
    console.error('Update approval rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating approval rule'
    });
  }
};

// @desc    Delete approval rule
// @route   DELETE /api/approval-rules/:id
// @access  Private (Admin)
const deleteApprovalRule = async (req, res) => {
  try {
    const rule = await ApprovalRule.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Approval rule not found'
      });
    }

    // Check if rule is being used by any pending expenses
    const Expense = require('../models/Expense');
    const pendingExpenses = await Expense.countDocuments({
      status: { $in: ['submitted', 'waiting-approval'] },
      approvalRuleId: rule._id
    });

    if (pendingExpenses > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete rule: ${pendingExpenses} pending expenses are using this rule`
      });
    }

    await ApprovalRule.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Approval rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete approval rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deleting approval rule'
    });
  }
};

// @desc    Get applicable approval rules for expense amount
// @route   GET /api/approval-rules/applicable?amount=1000&category=travel
// @access  Private
const getApplicableRules = async (req, res) => {
  try {
    const { amount, category, department } = req.query;
    
    if (!amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount is required'
      });
    }

    const expenseAmount = parseFloat(amount);
    const query = {
      company: req.user.company._id,
      isActive: true,
      $or: [
        // Rules with no amount restrictions
        { 'conditions.minAmount': { $exists: false }, 'conditions.maxAmount': { $exists: false } },
        // Rules within amount range
        {
          $and: [
            { $or: [{ 'conditions.minAmount': { $lte: expenseAmount } }, { 'conditions.minAmount': { $exists: false } }] },
            { $or: [{ 'conditions.maxAmount': { $gte: expenseAmount } }, { 'conditions.maxAmount': { $exists: false } }] }
          ]
        }
      ]
    };

    // Filter by category if specified
    if (category) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'conditions.categories': { $in: [category] } },
          { 'conditions.categories': { $exists: false } },
          { 'conditions.categories': { $size: 0 } }
        ]
      });
    }

    // Filter by department if specified
    if (department) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'conditions.departments': { $in: [department] } },
          { 'conditions.departments': { $exists: false } },
          { 'conditions.departments': { $size: 0 } }
        ]
      });
    }

    const applicableRules = await ApprovalRule.find(query)
      .sort({ 'conditions.maxAmount': 1 }); // Lower amounts first

    res.status(200).json({
      status: 'success',
      data: {
        rules: applicableRules,
        count: applicableRules.length
      }
    });
  } catch (error) {
    console.error('Get applicable rules error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error finding applicable rules'
    });
  }
};

module.exports = {
  getApprovalRules,
  getApprovalRule,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule,
  getApplicableRules
};