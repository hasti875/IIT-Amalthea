const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');
const ApprovalRule = require('../models/ApprovalRule');

// @desc    Get dashboard data for employees
// @route   GET /api/dashboard/employee
// @access  Private
const getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Get expense statistics
    const [
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      totalAmount,
      pendingAmount,
      recentExpenses
    ] = await Promise.all([
      Expense.countDocuments({ submittedBy: userId }),
      Expense.countDocuments({ submittedBy: userId, status: { $in: ['submitted', 'waiting-approval'] } }),
      Expense.countDocuments({ submittedBy: userId, status: 'approved' }),
      Expense.countDocuments({ submittedBy: userId, status: 'rejected' }),
      
      // Total amount aggregation
      Expense.aggregate([
        { $match: { submittedBy: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$amountInBaseCurrency.value' } } }
      ]),
      
      // Pending amount aggregation
      Expense.aggregate([
        { $match: { submittedBy: new mongoose.Types.ObjectId(userId), status: { $in: ['submitted', 'waiting-approval'] } } },
        { $group: { _id: null, total: { $sum: '$amountInBaseCurrency.value' } } }
      ]),

      // Recent expenses
      Expense.find({ submittedBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title amount status createdAt expenseDate')
    ]);

    // Recent activity
    const recentActivity = await Expense.find({ submittedBy: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('submittedBy', 'firstName lastName')
      .select('title description amount status createdAt updatedAt submittedAt');

    const formattedActivity = recentActivity.map(expense => ({
      _id: expense._id,
      type: getActivityType(expense.status),
      title: expense.title,
      description: `${expense.status.charAt(0).toUpperCase() + expense.status.slice(1)} expense`,
      amount: expense.amount?.value || expense.amountInBaseCurrency?.value,
      user: expense.submittedBy,
      createdAt: expense.updatedAt || expense.createdAt,
      status: expense.status
    }));

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          employee: {
            totalExpenses,
            pendingExpenses,
            approvedExpenses,
            rejectedExpenses,
            totalAmount: totalAmount[0]?.total || 0,
            pendingAmount: pendingAmount[0]?.total || 0,
            recentExpenses
          }
        },
        recentActivity: formattedActivity
      }
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching employee dashboard'
    });
  }
};

// @desc    Get dashboard data for managers
// @route   GET /api/dashboard/manager
// @access  Private
const getManagerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Get team members
    const teamMembers = await User.countDocuments({ 
      manager: userId,
      company: req.user.company._id 
    });

    // Get approval statistics
    const [
      pendingApprovals,
      monthlyApproved,
      recentApprovals
    ] = await Promise.all([
      Expense.countDocuments({
        'approvalFlow.approver': userId,
        'approvalFlow.status': 'pending',
        status: 'waiting-approval'
      }),
      
      Expense.countDocuments({
        'approvalFlow.approver': userId,
        'approvalFlow.status': 'approved',
        'approvalFlow.actionDate': { $gte: currentMonth }
      }),

      // Recent approvals by this manager
      Expense.find({
        'approvalFlow.approver': userId,
        'approvalFlow.status': { $in: ['approved', 'rejected'] }
      })
        .sort({ 'approvalFlow.actionDate': -1 })
        .limit(5)
        .populate('submittedBy', 'firstName lastName')
        .select('title amount status approvalFlow')
    ]);

    // Calculate average processing time
    const processedExpenses = await Expense.find({
      'approvalFlow.approver': userId,
      'approvalFlow.status': { $in: ['approved', 'rejected'] },
      'approvalFlow.actionDate': { $gte: currentMonth }
    }).select('submittedAt approvalFlow');

    let averageProcessingTime = 0;
    if (processedExpenses.length > 0) {
      const totalTime = processedExpenses.reduce((sum, expense) => {
        const managerApproval = expense.approvalFlow.find(
          flow => flow.approver.toString() === userId
        );
        if (managerApproval && managerApproval.actionDate) {
          return sum + (new Date(managerApproval.actionDate) - new Date(expense.submittedAt));
        }
        return sum;
      }, 0);
      averageProcessingTime = Math.round(totalTime / processedExpenses.length / (1000 * 60 * 60)); // Convert to hours
    }

    // Recent activity
    const recentActivity = recentApprovals.map(expense => ({
      _id: expense._id,
      type: getActivityType(expense.status),
      title: `Approval: ${expense.title}`,
      description: `${expense.status} expense from ${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`,
      amount: expense.amount?.value || expense.amountInBaseCurrency?.value,
      user: expense.submittedBy,
      createdAt: expense.approvalFlow.find(f => f.approver.toString() === userId)?.actionDate,
      status: expense.status
    }));

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          manager: {
            pendingApprovals,
            teamMembers,
            monthlyApproved,
            averageProcessingTime,
            teamExpenses: 0, // Can be calculated if needed
            recentApprovals
          }
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching manager dashboard'
    });
  }
};

// @desc    Get dashboard data for admins
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
const getAdminDashboard = async (req, res) => {
  try {
    const companyId = req.user.company._id;
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCompanyExpenses,
      monthlyExpenses,
      totalApprovalRules,
      pendingApprovals,
      recentSystemActivity
    ] = await Promise.all([
      User.countDocuments({ company: companyId }),
      Expense.countDocuments({ company: companyId }),
      Expense.countDocuments({ 
        company: companyId,
        createdAt: { $gte: currentMonth }
      }),
      ApprovalRule.countDocuments({ company: companyId, isActive: true }),
      Expense.countDocuments({ 
        company: companyId,
        status: 'waiting-approval'
      }),

      // Recent system activity
      Expense.find({ company: companyId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('submittedBy', 'firstName lastName')
        .select('title description amount status createdAt updatedAt submittedBy')
    ]);

    // Format recent activity
    const formattedActivity = recentSystemActivity.map(expense => ({
      _id: expense._id,
      type: getActivityType(expense.status),
      title: expense.title,
      description: `${expense.status} by ${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`,
      amount: expense.amount?.value || expense.amountInBaseCurrency?.value,
      user: expense.submittedBy,
      createdAt: expense.updatedAt || expense.createdAt,
      status: expense.status
    }));

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          admin: {
            totalUsers,
            totalCompanyExpenses,
            monthlyExpenses,
            totalApprovalRules,
            pendingApprovals,
            systemActivity: recentSystemActivity
          }
        },
        recentActivity: formattedActivity
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching admin dashboard'
    });
  }
};

// Helper function to determine activity type
const getActivityType = (status) => {
  switch (status) {
    case 'submitted':
    case 'waiting-approval':
      return 'expense_submitted';
    case 'approved':
      return 'expense_approved';
    case 'rejected':
      return 'expense_rejected';
    default:
      return 'expense_submitted';
  }
};

module.exports = {
  getEmployeeDashboard,
  getManagerDashboard,
  getAdminDashboard
};