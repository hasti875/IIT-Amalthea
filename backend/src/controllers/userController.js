const User = require('../models/User');
const Company = require('../models/Company');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// @desc    Invite new employee
// @route   POST /api/users/invite
// @access  Private (Admin)
const inviteEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, role, department, managerId } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'First name, last name, email, and role are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Validate manager if provided
    let manager = null;
    if (managerId) {
      manager = await User.findOne({
        _id: managerId,
        company: req.user.company._id,
        role: { $in: ['manager', 'admin'] }
      });
      
      if (!manager) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid manager specified'
        });
      }
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      department,
      manager: managerId || null,
      company: req.user.company._id,
      isActive: true,
      mustChangePassword: true,
      invitedBy: req.user.id,
      invitedAt: new Date()
    });

    await newUser.save();

    // TODO: Send invitation email with temporary password
    // For now, we'll return the temp password in response
    console.log(`Temporary password for ${email}: ${tempPassword}`);

    // Populate the response
    const populatedUser = await User.findById(newUser._id)
      .populate('manager', 'firstName lastName email')
      .populate('company', 'name')
      .select('-password');

    res.status(201).json({
      status: 'success',
      message: 'Employee invited successfully',
      data: {
        user: populatedUser,
        temporaryPassword: tempPassword // Remove this in production
      }
    });
  } catch (error) {
    console.error('Invite employee error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error inviting employee'
    });
  }
};

// @desc    Get all employees with filtering
// @route   GET /api/users/employees
// @access  Private (Admin/Manager)
const getEmployees = async (req, res) => {
  try {
    const { role, department, status, page = 1, limit = 10, search } = req.query;
    
    const query = { company: req.user.company._id };
    
    // Build search query
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await User.find(query)
      .populate('manager', 'firstName lastName email')
      .select('-password')
      .sort({ firstName: 1, lastName: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Add fullName virtual field
    const employeesWithFullName = employees.map(emp => ({
      ...emp.toObject(),
      fullName: `${emp.firstName} ${emp.lastName}`
    }));

    res.status(200).json({
      status: 'success',
      data: {
        employees: employeesWithFullName,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching employees'
    });
  }
};

// @desc    Get managers for dropdown
// @route   GET /api/users/managers
// @access  Private (Admin/Manager)
const getManagers = async (req, res) => {
  try {
    const managers = await User.find({
      company: req.user.company._id,
      role: { $in: ['manager', 'admin'] },
      isActive: true
    })
      .select('firstName lastName email role')
      .sort({ firstName: 1 });

    res.status(200).json({
      status: 'success',
      data: { managers }
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching managers'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateEmployee = async (req, res) => {
  try {
    const { firstName, lastName, role, department, managerId, isActive } = req.body;
    
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    // Validate manager if provided
    if (managerId && managerId !== user.manager?.toString()) {
      const manager = await User.findOne({
        _id: managerId,
        company: req.user.company._id,
        role: { $in: ['manager', 'admin'] }
      });
      
      if (!manager) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid manager specified'
        });
      }
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    if (department) user.department = department;
    if (managerId !== undefined) user.manager = managerId || null;
    if (isActive !== undefined) user.isActive = isActive;
    
    user.updatedAt = new Date();

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating employee'
    });
  }
};

// @desc    Deactivate employee
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deactivateEmployee = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    // Check if user has pending expenses
    const Expense = require('../models/Expense');
    const pendingExpenses = await Expense.countDocuments({
      submittedBy: user._id,
      status: { $in: ['submitted', 'waiting-approval'] }
    });

    if (pendingExpenses > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot deactivate user: ${pendingExpenses} pending expenses need to be resolved first`
      });
    }

    // Deactivate instead of delete
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivatedBy = req.user.id;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Employee deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate employee error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deactivating employee'
    });
  }
};

module.exports = {
  inviteEmployee,
  getEmployees,
  getManagers,
  updateEmployee,
  deactivateEmployee
};