const Expense = require('../models/Expense');
const User = require('../models/User');

/**
 * Service class for dashboard-related operations
 * Handles data aggregation and statistics calculation for dashboard views
 */
class DashboardService {
  /**
   * Gets basic expense statistics for a given query
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @returns {Promise<Object>} Object containing expense counts by status
   */
  static async getExpenseStatistics(baseQuery) {
    const [
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      paidExpenses
    ] = await Promise.all([
      Expense.countDocuments(baseQuery),
      Expense.countDocuments({ ...baseQuery, status: { $in: ['submitted', 'waiting-approval'] } }),
      Expense.countDocuments({ ...baseQuery, status: 'approved' }),
      Expense.countDocuments({ ...baseQuery, status: 'rejected' }),
      Expense.countDocuments({ ...baseQuery, status: 'paid' })
    ]);

    return {
      totalExpenses,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      paidExpenses
    };
  }

  /**
   * Gets user statistics for admin/manager roles
   * @param {string} companyId - Company ID to filter users
   * @param {string} userRole - Role of the requesting user
   * @returns {Promise<Object>} Object containing user counts
   */
  static async getUserStatistics(companyId, userRole) {
    if (userRole === 'employee') {
      return { totalUsers: 0, activeUsers: 0 };
    }

    const [totalUsers, activeUsers] = await Promise.all([
      User.countDocuments({ company: companyId }),
      User.countDocuments({ company: companyId, isActive: true })
    ]);

    return { totalUsers, activeUsers };
  }

  /**
   * Gets financial statistics (amounts) for expenses
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @returns {Promise<Object>} Object containing financial aggregations
   */
  static async getFinancialStatistics(baseQuery) {
    const [totalAmount, pendingAmount, approvedAmount] = await Promise.all([
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
      ])
    ]);

    return {
      totalAmount: totalAmount[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0,
      approvedAmount: approvedAmount[0]?.total || 0
    };
  }

  /**
   * Gets monthly comparison statistics
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @returns {Promise<Object>} Object containing monthly statistics and growth
   */
  static async getMonthlyComparison(baseQuery) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [thisMonthExpenses, lastMonthExpenses] = await Promise.all([
      Expense.countDocuments({ ...baseQuery, createdAt: { $gte: currentMonth } }),
      Expense.countDocuments({ 
        ...baseQuery, 
        createdAt: { $gte: lastMonth, $lt: currentMonth } 
      })
    ]);

    const expenseGrowth = lastMonthExpenses > 0 
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100)
      : 0;

    return {
      thisMonthExpenses,
      lastMonthExpenses,
      expenseGrowth: Math.round(expenseGrowth * 100) / 100
    };
  }

  /**
   * Gets recent expenses with populated user data
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @param {number} limit - Maximum number of expenses to return
   * @returns {Promise<Array>} Array of recent expenses
   */
  static async getRecentExpenses(baseQuery, limit = 5) {
    return await Expense.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('submittedBy', 'firstName lastName')
      .select('title amount amountInBaseCurrency status createdAt expenseDate category');
  }

  /**
   * Gets expense aggregation by category
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @param {number} limit - Maximum number of categories to return
   * @returns {Promise<Array>} Array of expense aggregations by category
   */
  static async getExpensesByCategory(baseQuery, limit = 10) {
    return await Expense.aggregate([
      { $match: baseQuery },
      { 
        $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountInBaseCurrency.value' }
        } 
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit }
    ]);
  }

  /**
   * Gets expense aggregation by status
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @returns {Promise<Array>} Array of expense aggregations by status
   */
  static async getExpensesByStatus(baseQuery) {
    return await Expense.aggregate([
      { $match: baseQuery },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountInBaseCurrency.value' }
        } 
      }
    ]);
  }

  /**
   * Gets monthly trends for the last 6 months
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @param {number} months - Number of months to look back
   * @returns {Promise<Array>} Array of monthly trend data
   */
  static async getMonthlyTrends(baseQuery, months = 6) {
    const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
    
    const trends = await Expense.aggregate([
      { 
        $match: {
          ...baseQuery,
          createdAt: { $gte: startDate }
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
    ]);

    return trends.map(trend => ({
      month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
      expenses: trend.count,
      amount: trend.totalAmount
    }));
  }

  /**
   * Gets recent activity with formatted data
   * @param {Object} baseQuery - MongoDB query object for filtering expenses
   * @param {number} limit - Maximum number of activities to return
   * @returns {Promise<Array>} Array of formatted activity data
   */
  static async getRecentActivity(baseQuery, limit = 10) {
    const recentActivity = await Expense.find(baseQuery)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('submittedBy', 'firstName lastName email')
      .select('title description amount amountInBaseCurrency status createdAt updatedAt submittedAt category');

    return recentActivity.map(expense => ({
      _id: expense._id,
      type: this.getActivityType(expense.status),
      title: expense.title,
      description: `${expense.status.charAt(0).toUpperCase() + expense.status.slice(1)} expense - ${expense.category || 'General'}`,
      amount: expense.amountInBaseCurrency?.value || expense.amount?.value || 0,
      currency: expense.amountInBaseCurrency?.currency || 'USD',
      user: expense.submittedBy,
      createdAt: expense.updatedAt || expense.createdAt,
      status: expense.status,
      category: expense.category
    }));
  }

  /**
   * Determines activity type based on expense status
   * @param {string} status - Expense status
   * @returns {string} Activity type
   */
  static getActivityType(status) {
    switch (status) {
      case 'submitted': return 'expense_submitted';
      case 'waiting-approval': return 'expense_pending';
      case 'approved': return 'expense_approved';
      case 'rejected': return 'expense_rejected';
      case 'paid': return 'expense_paid';
      default: return 'expense_updated';
    }
  }

  /**
   * Builds the base query for dashboard data based on user role
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {string} companyId - Company ID
   * @returns {Object} MongoDB query object
   */
  static buildBaseQuery(userId, userRole, companyId) {
    return userRole === 'employee' 
      ? { submittedBy: userId }
      : { company: companyId };
  }
}

module.exports = DashboardService;