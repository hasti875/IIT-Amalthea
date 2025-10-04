const express = require('express');
const {
  getDashboardStats,
  getPendingApprovals,
  getTeamPerformance
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/dashboard/stats
// @desc    Get comprehensive dashboard statistics
// @access  Private
router.get('/stats', getDashboardStats);

// @route   GET /api/dashboard/pending-approvals
// @desc    Get pending approvals for current user
// @access  Private
router.get('/pending-approvals', getPendingApprovals);

// @route   GET /api/dashboard/team-performance
// @desc    Get team performance metrics
// @access  Private (Manager/Admin)
router.get('/team-performance', authorize('manager', 'admin'), getTeamPerformance);

module.exports = router;