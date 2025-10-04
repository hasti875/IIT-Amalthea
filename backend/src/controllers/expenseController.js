const Expense = require('../models/Expense');
const ApprovalRule = require('../models/ApprovalRule');
const { ExchangeRate } = require('../models/Currency');
const { processOCR } = require('../services/ocrService');
const { convertCurrency } = require('../services/currencyService');

// @desc    Get all expenses for current user
// @route   GET /api/expenses
// @access  Private
const getMyExpenses = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = { submittedBy: req.user.id };
    if (status) {
      query.status = status;
    }

    const expenses = await Expense.find(query)
      .populate('approvalFlow.approver', 'firstName lastName email')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching expenses'
    });
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email department')
      .populate('approvalFlow.approver', 'firstName lastName email role')
      .populate('company', 'name baseCurrency');

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check if user has access to this expense
    const hasAccess = expense.submittedBy._id.toString() === req.user.id ||
                     expense.approvalFlow.some(flow => flow.approver._id.toString() === req.user.id) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { expense }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching expense'
    });
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      category,
      subcategory,
      expenseDate,
      vendor,
      paidBy,
      projectCode,
      remarks,
      tags,
      isUrgent
    } = req.body;

    // Convert currency if different from company base currency
    let amountInBaseCurrency = { value: amount.value, exchangeRate: 1, convertedAt: new Date() };
    
    if (amount.currency.code !== req.user.company.baseCurrency.code) {
      const conversion = await convertCurrency(
        amount.value,
        amount.currency.code,
        req.user.company.baseCurrency.code
      );
      amountInBaseCurrency = conversion;
    }

    const expenseData = {
      submittedBy: req.user.id,
      company: req.user.company._id,
      title,
      description,
      amount,
      amountInBaseCurrency,
      category,
      subcategory,
      expenseDate,
      vendor,
      paidBy,
      projectCode,
      remarks,
      tags,
      isUrgent,
      status: 'draft'
    };

    // Handle receipt upload if present
    if (req.file) {
      expenseData.receipt = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      // Process OCR asynchronously
      try {
        const ocrResult = await processOCR(req.file.path);
        expenseData.ocrData = ocrResult;
      } catch (ocrError) {
        console.error('OCR processing failed:', ocrError);
        // Continue without OCR data if it fails
      }
    }

    const expense = await Expense.create(expenseData);

    res.status(201).json({
      status: 'success',
      message: 'Expense created successfully',
      data: { expense }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error creating expense'
    });
  }
};

// @desc    Submit expense for approval
// @route   POST /api/expenses/:id/submit
// @access  Private
const submitExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('submittedBy', 'manager role department');

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check if user owns this expense
    if (expense.submittedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Only draft expenses can be submitted'
      });
    }

    // Find applicable approval rules
    const approvalRules = await ApprovalRule.find({
      company: req.user.company._id,
      isActive: true
    }).sort({ priority: 1 });

    let applicableRule = null;
    for (const rule of approvalRules) {
      if (rule.appliesTo(expense)) {
        applicableRule = rule;
        break;
      }
    }

    if (!applicableRule) {
      // No approval rule found, auto-approve or create default flow
      if (expense.amountInBaseCurrency.value <= req.user.company.settings.autoApprovalLimit) {
        expense.status = 'approved';
        expense.approvedAt = new Date();
      } else {
        // Create default approval flow with manager
        if (expense.submittedBy.manager) {
          expense.approvalFlow = [{
            approver: expense.submittedBy.manager,
            level: 1,
            status: 'pending',
            isRequired: true
          }];
          expense.status = 'waiting-approval';
        } else {
          return res.status(400).json({
            status: 'error',
            message: 'No manager assigned and no approval rules configured'
          });
        }
      }
    } else {
      // Generate approval flow from rule
      expense.approvalFlow = applicableRule.generateApprovalFlow(expense);
      expense.status = expense.approvalFlow.length > 0 ? 'waiting-approval' : 'approved';
    }

    expense.submittedAt = new Date();
    await expense.save();

    res.status(200).json({
      status: 'success',
      message: 'Expense submitted successfully',
      data: { expense }
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error submitting expense'
    });
  }
};

// @desc    Update expense (only if draft)
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check if user owns this expense
    if (expense.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Only draft expenses can be updated'
      });
    }

    const {
      title,
      description,
      amount,
      category,
      subcategory,
      expenseDate,
      vendor,
      paidBy,
      projectCode,
      remarks,
      tags,
      isUrgent
    } = req.body;

    // Update fields
    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (category) updateFields.category = category;
    if (subcategory) updateFields.subcategory = subcategory;
    if (expenseDate) updateFields.expenseDate = expenseDate;
    if (vendor) updateFields.vendor = vendor;
    if (paidBy) updateFields.paidBy = paidBy;
    if (projectCode) updateFields.projectCode = projectCode;
    if (remarks) updateFields.remarks = remarks;
    if (tags) updateFields.tags = tags;
    if (typeof isUrgent === 'boolean') updateFields.isUrgent = isUrgent;

    // Handle amount update
    if (amount) {
      updateFields.amount = amount;
      
      // Recalculate base currency amount
      if (amount.currency.code !== req.user.company.baseCurrency.code) {
        const conversion = await convertCurrency(
          amount.value,
          amount.currency.code,
          req.user.company.baseCurrency.code
        );
        updateFields.amountInBaseCurrency = conversion;
      } else {
        updateFields.amountInBaseCurrency = {
          value: amount.value,
          exchangeRate: 1,
          convertedAt: new Date()
        };
      }
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Expense updated successfully',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating expense'
    });
  }
};

// @desc    Delete expense (only if draft)
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Check if user owns this expense
    if (expense.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Only draft expenses can be deleted'
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deleting expense'
    });
  }
};

// @desc    Get expenses pending approval for current user
// @route   GET /api/expenses/pending-approval
// @access  Private
const getPendingApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const expenses = await Expense.find({
      'approvalFlow.approver': req.user.id,
      'approvalFlow.status': 'pending',
      status: 'waiting-approval'
    })
      .populate('submittedBy', 'firstName lastName email department')
      .populate('approvalFlow.approver', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Expense.countDocuments({
      'approvalFlow.approver': req.user.id,
      'approvalFlow.status': 'pending',
      status: 'waiting-approval'
    });

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching pending approvals'
    });
  }
};

// @desc    Process receipt with OCR
// @route   POST /api/expenses/process-receipt
// @access  Private
const processReceiptOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No receipt file uploaded'
      });
    }

    // Process the uploaded file with OCR
    const ocrResults = await processOCR(req.file.path);

    // Extract meaningful data from OCR results
    const extractedData = {
      amount: ocrResults.extractedAmount || '',
      date: ocrResults.extractedDate || new Date().toISOString().split('T')[0],
      vendor: ocrResults.extractedVendor || '',
      description: generateDescription(ocrResults.extractedText, ocrResults.extractedVendor),
      confidence: ocrResults.confidence,
      rawText: ocrResults.extractedText
    };

    res.status(200).json({
      status: 'success',
      data: {
        extractedData,
        fileName: req.file.filename,
        filePath: req.file.path
      }
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process receipt with OCR'
    });
  }
};

// Helper function to generate description from OCR text
const generateDescription = (ocrText, vendor) => {
  if (!ocrText) return '';
  
  // Try to find item descriptions, transaction types, etc.
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for common receipt patterns
  const descriptiveWords = ['meal', 'food', 'coffee', 'taxi', 'transport', 'hotel', 'office', 'supplies', 'fuel', 'parking'];
  const foundDescriptions = lines.filter(line => {
    return descriptiveWords.some(word => line.toLowerCase().includes(word));
  });

  if (foundDescriptions.length > 0) {
    return foundDescriptions[0];
  }

  // If vendor is identified, use it
  if (vendor) {
    return `Expense from ${vendor}`;
  }

  // Default description
  return 'Business expense';
};

// @desc    Get all expenses for approval (enhanced)
// @route   GET /api/expenses/approvals
// @access  Private (Manager/Admin)
const getApprovalsEnhanced = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    let matchCondition = {
      'approvalFlow.approver': req.user.id
    };

    if (status !== 'all') {
      matchCondition['approvalFlow.status'] = status;
    }

    const expenses = await Expense.find(matchCondition)
      .populate('submittedBy', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role')
      .populate('company', 'name baseCurrency')
      .sort({ createdAt: -1, isUrgent: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Expense.countDocuments(matchCondition);

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get approvals enhanced error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching approvals'
    });
  }
};

// @desc    Get approval statistics
// @route   GET /api/expenses/approval-stats
// @access  Private (Manager/Admin)
const getApprovalStats = async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [pending, approved, rejected, totalAmount] = await Promise.all([
      Expense.countDocuments({
        'approvalFlow.approver': req.user.id,
        'approvalFlow.status': 'pending'
      }),
      Expense.countDocuments({
        'approvalFlow.approver': req.user.id,
        'approvalFlow.status': 'approved',
        'approvalFlow.actionDate': { $gte: currentMonth }
      }),
      Expense.countDocuments({
        'approvalFlow.approver': req.user.id,
        'approvalFlow.status': 'rejected',
        'approvalFlow.actionDate': { $gte: currentMonth }
      }),
      Expense.aggregate([
        {
          $match: {
            'approvalFlow.approver': req.user.id,
            'approvalFlow.status': 'pending'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amountInBaseCurrency.value' }
          }
        }
      ])
    ]);

    // Calculate average processing time
    const processedExpenses = await Expense.find({
      'approvalFlow.approver': req.user.id,
      'approvalFlow.status': { $in: ['approved', 'rejected'] },
      'approvalFlow.actionDate': { $gte: currentMonth }
    }).select('submittedAt approvalFlow');

    let avgProcessingTime = 0;
    if (processedExpenses.length > 0) {
      const totalTime = processedExpenses.reduce((sum, expense) => {
        const userApproval = expense.approvalFlow.find(
          flow => flow.approver.toString() === req.user.id
        );
        if (userApproval && userApproval.actionDate) {
          return sum + (new Date(userApproval.actionDate) - new Date(expense.submittedAt));
        }
        return sum;
      }, 0);
      avgProcessingTime = Math.round(totalTime / processedExpenses.length / (1000 * 60 * 60)); // Convert to hours
    }

    res.status(200).json({
      status: 'success',
      data: {
        pending,
        approved,
        rejected,
        totalAmount: totalAmount[0]?.total || 0,
        avgProcessingTime
      }
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching approval stats'
    });
  }
};

// @desc    Process approval action (approve/reject)
// @route   POST /api/expenses/:id/approval-action
// @access  Private (Manager/Admin)
const processApprovalAction = async (req, res) => {
  try {
    const { action, comments } = req.body;
    const expenseId = req.params.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const expense = await Expense.findById(expenseId)
      .populate('submittedBy', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role');

    if (!expense) {
      return res.status(404).json({
        status: 'error',
        message: 'Expense not found'
      });
    }

    // Find the user's approval step
    const userApprovalIndex = expense.approvalFlow.findIndex(
      flow => flow.approver._id.toString() === req.user.id && flow.status === 'pending'
    );

    if (userApprovalIndex === -1) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to approve this expense or it has already been processed'
      });
    }

    // Update the approval flow
    expense.approvalFlow[userApprovalIndex].status = action === 'approve' ? 'approved' : 'rejected';
    expense.approvalFlow[userApprovalIndex].comments = comments;
    expense.approvalFlow[userApprovalIndex].actionDate = new Date();

    if (action === 'reject') {
      // If rejected, mark entire expense as rejected
      expense.status = 'rejected';
      expense.rejectionReason = comments;
    } else {
      // If approved, check if there are more approvals needed
      const nextPendingApproval = expense.approvalFlow.find(flow => flow.status === 'pending');
      
      if (!nextPendingApproval) {
        // All approvals completed
        expense.status = 'approved';
        expense.approvedAt = new Date();
      }
      // If there are more approvals, status remains 'waiting-approval'
    }

    await expense.save();

    // TODO: Send notifications to relevant parties
    // - Notify employee of approval/rejection
    // - Notify next approver if applicable

    res.status(200).json({
      status: 'success',
      message: `Expense ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        expense: {
          _id: expense._id,
          status: expense.status,
          approvalFlow: expense.approvalFlow
        }
      }
    });
  } catch (error) {
    console.error('Process approval action error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error processing approval'
    });
  }
};

// @desc    Get all expenses in company (Admin/Manager only)
// @route   GET /api/expenses/all
// @access  Private (Admin/Manager)
const getAllExpenses = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      department, 
      dateRange,
      search,
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const query = {};
    
    // Build query based on filters
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } }
      ];
    }

    let expenseQuery = Expense.find(query)
      .populate({
        path: 'submittedBy',
        select: 'firstName lastName email department role'
      })
      .populate('approvalFlow.approver', 'firstName lastName role')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Department filter (applied after population)
    if (department && department !== 'all') {
      expenseQuery = expenseQuery.populate({
        path: 'submittedBy',
        match: { department: department },
        select: 'firstName lastName email department role'
      });
    }

    const expenses = await expenseQuery.exec();
    
    // Filter out expenses where submittedBy didn't match department filter
    const filteredExpenses = expenses.filter(expense => expense.submittedBy);
    
    const totalQuery = { ...query };
    if (department && department !== 'all') {
      // Get user IDs for the department filter
      const User = require('../models/User');
      const departmentUsers = await User.find({ department }).select('_id');
      totalQuery.submittedBy = { $in: departmentUsers.map(u => u._id) };
    }
    
    const total = await Expense.countDocuments(totalQuery);

    res.status(200).json({
      status: 'success',
      data: {
        expenses: filteredExpenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all expenses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching expenses'
    });
  }
};

// @desc    Get expense statistics
// @route   GET /api/expenses/stats
// @access  Private (Admin/Manager)
const getExpenseStats = async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get total expenses
    const total = await Expense.countDocuments({});
    
    // Get expenses by status
    const statusStats = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const byStatus = {};
    statusStats.forEach(stat => {
      byStatus[stat._id] = stat.count;
    });
    
    // Get total amount and average
    const amountStats = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amountInBaseCurrency.value' },
          avgAmount: { $avg: '$amountInBaseCurrency.value' }
        }
      }
    ]);
    
    const totalAmount = amountStats[0]?.totalAmount || 0;
    const avgAmount = amountStats[0]?.avgAmount || 0;
    
    // Get department statistics
    const departmentStats = await Expense.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'submittedBy',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $group: {
          _id: '$employee.department',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountInBaseCurrency.value' },
          avgAmount: { $avg: '$amountInBaseCurrency.value' }
        }
      },
      {
        $project: {
          department: '$_id',
          count: 1,
          totalAmount: 1,
          avgAmount: 1,
          _id: 0
        }
      }
    ]);
    
    // Get recent activity (last 10 expenses)
    const recentActivity = await Expense.find({})
      .populate('submittedBy', 'firstName lastName email department')
      .sort({ updatedAt: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        byStatus,
        totalAmount,
        avgAmount,
        byDepartment: departmentStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching expense statistics'
    });
  }
};

module.exports = {
  getMyExpenses,
  getAllExpenses,
  getExpense,
  createExpense,
  submitExpense,
  updateExpense,
  deleteExpense,
  getPendingApprovals,
  processReceiptOCR,
  getApprovalsEnhanced,
  getApprovalStats,
  processApprovalAction,
  getExpenseStats
};