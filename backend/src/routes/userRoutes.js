const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all users in company (Admin/Manager only)
// @route   GET /api/users
// @access  Private (Admin/Manager)
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { role, department, page = 1, limit = 10 } = req.query;
    
    const query = { company: req.user.company._id };
    if (role) query.role = role;
    if (department) query.department = department;

    const users = await User.find(query)
      .select('-password')
      .populate('manager', 'firstName lastName email')
      .sort({ firstName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching users'
    });
  }
});

// @desc    Get employees (Admin/Manager only)
// @route   GET /api/users/employees
// @access  Private (Admin/Manager)
router.get('/employees', authorize('admin', 'manager'), async (req, res) => {
  try {
    const employees = await User.find({ 
      company: req.user.company._id,
      role: 'employee' 
    })
      .select('firstName lastName email department role')
      .sort({ firstName: 1 });

    res.status(200).json({
      status: 'success',
      data: { employees }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching employees'
    });
  }
});

// @desc    Get managers (Admin only)
// @route   GET /api/users/managers
// @access  Private (Admin)
router.get('/managers', authorize('admin', 'manager'), async (req, res) => {
  try {
    const managers = await User.find({ 
      company: req.user.company._id,
      role: { $in: ['manager', 'admin'] }
    })
      .select('firstName lastName email department role')
      .sort({ firstName: 1 });

    res.status(200).json({
      status: 'success',
      data: { managers }
    });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching managers'
    });
  }
});

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      manager,
      employeeId,
      department,
      position
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email, company: req.user.company._id });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists in your company'
      });
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: role || 'employee',
      company: req.user.company._id,
      employeeId,
      department,
      position
    };

    if (manager) {
      // Verify manager exists and belongs to same company
      const managerUser = await User.findOne({ _id: manager, company: req.user.company._id });
      if (!managerUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Manager not found in your company'
        });
      }
      userData.manager = manager;
    }

    const user = await User.create(userData);

    // Return user data without password
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'firstName lastName email');

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error creating user'
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id, 
      company: req.user.company._id 
    })
      .select('-password')
      .populate('manager', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching user'
    });
  }
});

// @desc    Update user (Admin or self)
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id, 
      company: req.user.company._id 
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check permissions - admin can update anyone, users can only update themselves
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const {
      firstName,
      lastName,
      role,
      manager,
      employeeId,
      department,
      position,
      isActive
    } = req.body;

    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (employeeId) updateFields.employeeId = employeeId;
    if (department) updateFields.department = department;
    if (position) updateFields.position = position;

    // Only admin can update role and active status
    if (req.user.role === 'admin') {
      if (role) updateFields.role = role;
      if (typeof isActive === 'boolean') updateFields.isActive = isActive;
      
      if (manager) {
        const managerUser = await User.findOne({ _id: manager, company: req.user.company._id });
        if (!managerUser) {
          return res.status(400).json({
            status: 'error',
            message: 'Manager not found in your company'
          });
        }
        updateFields.manager = manager;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('manager', 'firstName lastName email');

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error updating user'
    });
  }
});

module.exports = router;