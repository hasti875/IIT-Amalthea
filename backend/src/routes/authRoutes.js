const express = require('express');
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe);  // Alias for /me
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;