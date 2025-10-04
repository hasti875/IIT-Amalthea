const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getApprovalRules,
  getApprovalRule,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule,
  getApplicableRules
} = require('../controllers/approvalRuleController');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get applicable rules for expense
// @route   GET /api/approval-rules/applicable
// @access  Private
router.get('/applicable', getApplicableRules);

// @desc    Get all approval rules
// @route   GET /api/approval-rules
// @access  Private (Admin)
router.get('/', authorize('admin'), getApprovalRules);

// @desc    Create new approval rule
// @route   POST /api/approval-rules
// @access  Private (Admin)
router.post('/', authorize('admin'), createApprovalRule);

// @desc    Get single approval rule
// @route   GET /api/approval-rules/:id
// @access  Private (Admin)
router.get('/:id', authorize('admin'), getApprovalRule);

// @desc    Update approval rule
// @route   PUT /api/approval-rules/:id
// @access  Private (Admin)
router.put('/:id', authorize('admin'), updateApprovalRule);

// @desc    Delete approval rule
// @route   DELETE /api/approval-rules/:id
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), deleteApprovalRule);

module.exports = router;