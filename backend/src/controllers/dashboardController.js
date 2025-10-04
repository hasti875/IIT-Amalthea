const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');
const ApprovalRule = require('../models/ApprovalRule');

// Helper function to get activity type based on status
const getActivityType = (status) => {
  switch (status) {
    case 'submitted': return 'expense_submitted';
    case 'waiting-approval': return 'expense_pending';
    case 'approved': return 'expense_approved';
    case 'rejected': return 'expense_rejected';
    case 'paid': return 'expense_paid';
    default: return 'expense_updated';
  }
};

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount || 0);
};

// @desc    Get comprehensive dashboard data
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.company._id;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Base query for company-wide data (admin/manager) or user-specific (employee)
    const baseQuery = userRole === 'employee' 
      ? { submittedBy: userId }
      : { company: companyId };

    // Get comprehensive statistics
    const [
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      paidExpenses,
      totalUsers,
      activeUsers,
      totalAmount,
      pendingAmount,
      approvedAmount,
      thisMonthExpenses,
      lastMonthExpenses,
      recentExpenses,
      expensesByCategory,
      expensesByStatus,
      monthlyTrends
    ] = await Promise.all([
      // Basic counts
      Expense.countDocuments(baseQuery),
      Expense.countDocuments({ ...baseQuery, status: { $in: ['submitted', 'waiting-approval'] } }),
      Expense.countDocuments({ ...baseQuery, status: 'approved' }),
      Expense.countDocuments({ ...baseQuery, status: 'rejected' }),
      Expense.countDocuments({ ...baseQuery, status: 'paid' }),
      
      // User statistics (admin/manager only)
      userRole !== 'employee' ? User.countDocuments({ company: companyId }) : Promise.resolve(0),
      userRole !== 'employee' ? User.countDocuments({ company: companyId, isActive: true }) : Promise.resolve(0),
      
      // Amount aggregations
      Expense.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, total: { $sum: '$amountInBaseCurrency.value' } } }
      ]),
      
      Expense.aggregate([
        { $match: { ...baseQuery, status: { $in: ['submitted', 'waiting-approval'] } } },
        { $group: { _id: null, total: { $sum: '$amountInBaseCurrency.value' } } }
      ]),
      
      Expense.aggregate([
        { $match: { ...baseQuery, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amountInBaseCurrency.value' } } }
      ]),

      // Monthly comparisons
      Expense.countDocuments({ ...baseQuery, createdAt: { $gte: currentMonth } }),
      Expense.countDocuments({ 
        ...baseQuery, 
        createdAt: { $gte: lastMonth, $lt: currentMonth } 
      }),

      // Recent expenses
      Expense.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('submittedBy', 'firstName lastName')
        .select('title amount amountInBaseCurrency status createdAt expenseDate category'),

      // Expenses by category
      Expense.aggregate([
        { $match: baseQuery },
        { 
          $group: { 
            _id: '$category', 
            count: { $sum: 1 },
            totalAmount: { $sum: '$amountInBaseCurrency.value' }
          } 
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
      ]),

      // Expenses by status
      Expense.aggregate([
        { $match: baseQuery },
        { 
          $group: { 
            _id: '$status', 
            count: { $sum: 1 },
            totalAmount: { $sum: '$amountInBaseCurrency.value' }
          } 
        }
      ]),

      // Monthly trends (last 6 months)
      Expense.aggregate([
        { 
          $match: {
            ...baseQuery,
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amountInBaseCurrency.value' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Recent activity
    const recentActivity = await Expense.find(baseQuery)
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('submittedBy', 'firstName lastName email')
      .select('title description amount amountInBaseCurrency status createdAt updatedAt submittedAt category');

    const formattedActivity = recentActivity.map(expense => ({
      _id: expense._id,
      type: getActivityType(expense.status),
      title: expense.title,
      description: `${expense.status.charAt(0).toUpperCase() + expense.status.slice(1)} expense - ${expense.category || 'General'}`,
      amount: expense.amountInBaseCurrency?.value || expense.amount?.value || 0,
      currency: expense.amountInBaseCurrency?.currency || 'USD',
      user: expense.submittedBy,
      createdAt: expense.updatedAt || expense.createdAt,
      status: expense.status,
      category: expense.category
    }));

    // Calculate percentage changes
    const expenseGrowth = lastMonthExpenses > 0 
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100)
      : 0;

    // Format monthly trends
    const formattedTrends = monthlyTrends.map(trend => ({
      month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
      expenses: trend.count,
      amount: trend.totalAmount
    }));

    // Build response based on user role
    const responseData = {
      overview: {
        totalExpenses,
        pendingExpenses,
        approvedExpenses,
        rejectedExpenses,
        paidExpenses,
        totalAmount: totalAmount[0]?.total || 0,
        pendingAmount: pendingAmount[0]?.total || 0,
        approvedAmount: approvedAmount[0]?.total || 0,
        thisMonthExpenses,
        lastMonthExpenses,
        expenseGrowth: Math.round(expenseGrowth * 100) / 100
      },
      recentExpenses: recentExpenses.map(expense => ({
        ...expense.toObject(),
        submittedBy: expense.submittedBy ? {
          firstName: expense.submittedBy.firstName,
          lastName: expense.submittedBy.lastName,
          fullName: `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`
        } : null
      })),
      recentActivity: formattedActivity,
      analytics: {
        expensesByCategory: expensesByCategory.map(cat => ({
          category: cat._id || 'Uncategorized',
          count: cat.count,
          amount: cat.totalAmount,
          percentage: totalAmount[0]?.total ? 
            Math.round((cat.totalAmount / totalAmount[0].total) * 100) : 0
        })),
        expensesByStatus: expensesByStatus.map(status => ({
          status: status._id,
          count: status.count,
          amount: status.totalAmount,
          percentage: totalExpenses ? 
            Math.round((status.count / totalExpenses) * 100) : 0
        })),
        monthlyTrends: formattedTrends
      }
    };

    // Add user management data for admins/managers
    if (userRole !== 'employee') {
      responseData.userManagement = {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers
      };
    }

    res.status(200).json({
      status: 'success',
      data: responseData
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching dashboard statistics'
    });
  }
};

// @desc    Get pending approvals for current user
// @route   GET /api/dashboard/pending-approvals
// @access  Private
const getPendingApprovals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const pendingApprovals = await Expense.find({
      'approvalFlow.approver': userId,
      'approvalFlow.status': 'pending',
      status: 'waiting-approval'
    })
      .populate('submittedBy', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName')
      .sort({ submittedAt: 1 })
      .limit(20);

    res.status(200).json({
      status: 'success',
      data: { pendingApprovals }
    });
  } catch (error) {
    console.error('Pending approvals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching pending approvals'
    });
  }
};

// @desc    Get team performance metrics
// @route   GET /api/dashboard/team-performance
// @access  Private (Manager/Admin)
const getTeamPerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.company._id;

    // Base query depending on role
    let baseQuery = { company: companyId };
    if (userRole === 'manager') {
      // Get team members under this manager
      const teamMembers = await User.find({ 
        manager: userId, 
        company: companyId 
      }).select('_id');
      baseQuery.submittedBy = { $in: teamMembers.map(m => m._id) };
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Team performance metrics
    const [
      teamExpensesByUser,
      avgProcessingTime,
      complianceRate,
      topSpenders
    ] = await Promise.all([
      // Expenses by team member
      Expense.aggregate([
        { $match: baseQuery },
        { 
          $group: { 
            _id: '$submittedBy',
            totalExpenses: { $sum: 1 },
            totalAmount: { $sum: '$amountInBaseCurrency.value' },
            avgAmount: { $avg: '$amountInBaseCurrency.value' },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            user: {
              _id: '$user._id',
              firstName: '$user.firstName',
              lastName: '$user.lastName',
              email: '$user.email'
            },
            totalExpenses: 1,
            totalAmount: 1,
            avgAmount: 1,
            approvedCount: 1,
            rejectedCount: 1,
            approvalRate: {
              $multiply: [
                { $divide: ['$approvedCount', '$totalExpenses'] },
                100
              ]
            }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),

      // Average processing time
      Expense.aggregate([
        { 
          $match: { 
            ...baseQuery,
            status: { $in: ['approved', 'rejected'] },
            submittedAt: { $exists: true },
            'approvalFlow.actionDate': { $exists: true }
          }
        },
        {
          $addFields: {
            processingTime: {
              $subtract: [
                { $arrayElemAt: ['$approvalFlow.actionDate', -1] },
                '$submittedAt'
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' }
          }
        }
      ]),

      // Compliance rate (approved vs total)
      Expense.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            complianceRate: {
              $multiply: [{ $divide: ['$approved', '$total'] }, 100]
            }
          }
        }
      ]),

      // Top spenders this month
      Expense.aggregate([
        { 
          $match: { 
            ...baseQuery,
            createdAt: { $gte: currentMonth }
          }
        },
        {
          $group: {
            _id: '$submittedBy',
            monthlyTotal: { $sum: '$amountInBaseCurrency.value' },
            expenseCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            user: {
              firstName: '$user.firstName',
              lastName: '$user.lastName'
            },
            monthlyTotal: 1,
            expenseCount: 1
          }
        },
        { $sort: { monthlyTotal: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        teamPerformance: teamExpensesByUser,
        metrics: {
          avgProcessingTime: avgProcessingTime[0]?.avgProcessingTime 
            ? Math.round(avgProcessingTime[0].avgProcessingTime / (1000 * 60 * 60)) // Convert to hours
            : 0,
          complianceRate: complianceRate[0]?.complianceRate || 0,
          topSpenders
        }
      }
    });
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching team performance'
    });
  }
};

module.exports = {
  getDashboardStats,
  getPendingApprovals,
  getTeamPerformance
};