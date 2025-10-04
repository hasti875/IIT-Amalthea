const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');
const ApprovalRule = require('../models/ApprovalRule');
const DashboardService = require('../services/dashboardService');

// Helper function to format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount || 0);
};

/**
 * @desc    Get comprehensive dashboard data
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.company._id;

    // Build base query for filtering data based on user role
    const baseQuery = DashboardService.buildBaseQuery(userId, userRole, companyId);

    // Get all dashboard data using service layer methods
    const [
      expenseStats,
      userStats,
      financialStats,
      monthlyComparison,
      recentExpenses,
      expensesByCategory,
      expensesByStatus,
      monthlyTrends,
      recentActivity
    ] = await Promise.all([
      DashboardService.getExpenseStatistics(baseQuery),
      DashboardService.getUserStatistics(companyId, userRole),
      DashboardService.getFinancialStatistics(baseQuery),
      DashboardService.getMonthlyComparison(baseQuery),
      DashboardService.getRecentExpenses(baseQuery, 5),
      DashboardService.getExpensesByCategory(baseQuery, 10),
      DashboardService.getExpensesByStatus(baseQuery),
      DashboardService.getMonthlyTrends(baseQuery, 6),
      DashboardService.getRecentActivity(baseQuery, 10)
    ]);

    // Build response data structure
    const responseData = {
      overview: {
        ...expenseStats,
        ...financialStats,
        ...monthlyComparison,
        ...userStats
      },
      recentExpenses: recentExpenses.map(expense => ({
        ...expense.toObject(),
        submittedBy: expense.submittedBy ? {
          firstName: expense.submittedBy.firstName,
          lastName: expense.submittedBy.lastName,
          fullName: `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}`
        } : null
      })),
      recentActivity,
      analytics: {
        expensesByCategory: expensesByCategory.map(cat => ({
          category: cat._id || 'Uncategorized',
          count: cat.count,
          amount: cat.totalAmount,
          percentage: financialStats.totalAmount ? 
            Math.round((cat.totalAmount / financialStats.totalAmount) * 100) : 0
        })),
        expensesByStatus: expensesByStatus.map(status => ({
          status: status._id,
          count: status.count,
          amount: status.totalAmount,
          percentage: expenseStats.totalExpenses ? 
            Math.round((status.count / expenseStats.totalExpenses) * 100) : 0
        })),
        monthlyTrends
      }
    };

    // Add user management data for admins/managers
    if (userRole !== 'employee') {
      responseData.userManagement = {
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        inactiveUsers: userStats.totalUsers - userStats.activeUsers
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