const express = require('express');
const {
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
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Expense routes
router.route('/')
  .get(getMyExpenses)
  .post(upload.single('receipt'), handleMulterError, createExpense);

router.post('/process-receipt', upload.single('receipt'), handleMulterError, processReceiptOCR);
router.get('/pending-approval', getPendingApprovals);
router.get('/pending-approvals', getPendingApprovals);
router.get('/approvals', getApprovalsEnhanced);
router.get('/approval-stats', getApprovalStats);

router.route('/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);

router.post('/:id/submit', submitExpense);
router.post('/:id/approval-action', processApprovalAction);

module.exports = router;