const express = require('express');
const {
  getEmployeeDashboard,
  getManagerDashboard,
  getAdminDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Role-specific dashboard routes
router.get('/employee', getEmployeeDashboard);
router.get('/manager', authorize('manager', 'admin'), getManagerDashboard);
router.get('/admin', authorize('admin'), getAdminDashboard);

module.exports = router;