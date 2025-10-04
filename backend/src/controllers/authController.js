const User = require('../models/User');
const Company = require('../models/Company');
const { generateToken } = require('../middleware/authMiddleware');
const { Currency } = require('../models/Currency');
const UserService = require('../services/userService');

/**
 * @desc    Register new user and create company
 * @route   POST /api/auth/register
 * @access  Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.firstName - User's first name
 * @param {string} req.body.lastName - User's last name
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {string} req.body.companyName - Company name
 * @param {string} req.body.country - Company country
 * @param {string} req.body.baseCurrency - Company base currency code
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and token
 */
const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      companyName,
      country,
      baseCurrency
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !companyName || !country || !baseCurrency) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Get currency details
    const currencyDetails = await Currency.findOne({ code: baseCurrency.toUpperCase() });
    if (!currencyDetails) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid currency code'
      });
    }

    // Create company first
    const company = await Company.create({
      name: companyName,
      country,
      baseCurrency: {
        code: currencyDetails.code,
        name: currencyDetails.name,
        symbol: currencyDetails.symbol
      }
    });

    // Create user as admin
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'admin', // First user is automatically admin
      company: company._id
    });

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      company: {
        id: company._id,
        name: company.name,
        country: company.country,
        baseCurrency: company.baseCurrency
      }
    };

    res.status(201).json({
      status: 'success',
      message: 'Company and admin user created successfully',
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
};

/**
 * @desc    Authenticate user and get token
 * @route   POST /api/auth/login
 * @access  Public
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and token, or requirePasswordChange flag for temporary passwords
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password for comparison)
    const user = await User.findOne({ email }).select('+password').populate('company');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact your administrator.'
      });
    }

    // Check if user must change password (temporary password)
    if (user.mustChangePassword) {
      // Generate token but flag that password change is required
      const token = generateToken(user._id);
      
      return res.status(200).json({
        status: 'success',
        message: 'Login successful but password change required',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            mustChangePassword: true
          },
          token,
          requirePasswordChange: true
        }
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      employeeId: user.employeeId,
      manager: user.manager,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      company: {
        id: user.company._id,
        name: user.company.name,
        country: user.company.country,
        baseCurrency: user.company.baseCurrency,
        settings: user.company.settings
      }
    };

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object from middleware
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with current user data
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company').populate('manager', 'firstName lastName email');

    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      employeeId: user.employeeId,
      manager: user.manager ? {
        id: user.manager._id,
        name: user.manager.fullName,
        email: user.manager.email
      } : null,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      company: {
        id: user.company._id,
        name: user.company.name,
        country: user.company.country,
        baseCurrency: user.company.baseCurrency,
        settings: user.company.settings
      }
    };

    res.status(200).json({
      status: 'success',
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching user data'
    });
  }
};

/**
 * @desc    Update user profile information
 * @route   PUT /api/auth/profile
 * @access  Private
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object from middleware
 * @param {Object} req.body - Profile update data
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated user data
 */
const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      department,
      position,
      employeeId
    } = req.body;

    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (department) updateFields.department = department;
    if (position) updateFields.position = position;
    if (employeeId) updateFields.employeeId = employeeId;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('company').populate('manager', 'firstName lastName email');

    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      employeeId: user.employeeId,
      manager: user.manager ? {
        id: user.manager._id,
        name: user.manager.fullName,
        email: user.manager.email
      } : null,
      avatar: user.avatar,
      company: {
        id: user.company._id,
        name: user.company.name,
        country: user.company.country,
        baseCurrency: user.company.baseCurrency
      }
    };

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: userData }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating profile'
    });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate password change data
    const validation = UserService.validatePasswordChange(currentPassword, newPassword);
    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: validation.message
      });
    }

    // Change password using service layer
    const result = await UserService.changePassword(req.user.id, currentPassword, newPassword);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: result.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error changing password'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword
};