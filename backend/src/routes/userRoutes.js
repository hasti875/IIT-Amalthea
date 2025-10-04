const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  inviteEmployee,
  getEmployees,
  getManagers,
  updateEmployee,
  deactivateEmployee
} = require('../controllers/userController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @route   POST /api/users/invite
// @desc    Invite new employee
// @access  Private (Admin)
router.post('/invite', authorize('admin'), inviteEmployee);

// @route   GET /api/users/employees
// @desc    Get all employees with filtering
// @access  Private (Admin/Manager)
router.get('/employees', authorize('admin', 'manager'), getEmployees);

// @route   GET /api/users/managers
// @desc    Get managers for dropdown
// @access  Private (Admin/Manager)
router.get('/managers', authorize('admin', 'manager'), getManagers);

// @route   PUT /api/users/:id
// @desc    Update employee
// @access  Private (Admin)
router.put('/:id', authorize('admin'), updateEmployee);

// @route   DELETE /api/users/:id
// @desc    Deactivate employee
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), deactivateEmployee);

module.exports = router;