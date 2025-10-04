const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Service class for user-related operations
 * Handles user management, authentication, and data processing
 */
class UserService {
  /**
   * Validates user invitation data
   * @param {Object} data - User invitation data
   * @param {string} data.firstName - User's first name
   * @param {string} data.lastName - User's last name  
   * @param {string} data.email - User's email address
   * @param {string} data.role - User's role
   * @returns {Object} Validation result with success flag and message
   */
  static validateInvitationData({ firstName, lastName, email, role }) {
    if (!firstName || !lastName || !email || !role) {
      return {
        success: false,
        message: 'First name, last name, email, and role are required'
      };
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Please provide a valid email address'
      };
    }

    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return {
        success: false,
        message: 'Invalid role specified'
      };
    }

    return { success: true };
  }

  /**
   * Checks if a user already exists with the given email
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if user exists, false otherwise
   */
  static async checkUserExists(email) {
    const existingUser = await User.findOne({ email });
    return !!existingUser;
  }

  /**
   * Validates and retrieves manager information
   * @param {string} managerId - Manager ID to validate
   * @param {string} companyId - Company ID to validate against
   * @returns {Promise<Object>} Validation result with manager data
   */
  static async validateManager(managerId, companyId) {
    if (!managerId) {
      return { success: true, manager: null };
    }

    const manager = await User.findOne({
      _id: managerId,
      company: companyId,
      role: { $in: ['manager', 'admin'] }
    });

    if (!manager) {
      return {
        success: false,
        message: 'Invalid manager specified'
      };
    }

    return { success: true, manager };
  }

  /**
   * Generates a temporary password for new users
   * @param {number} length - Length of the password (default: 16)
   * @returns {string} Generated temporary password
   */
  static generateTemporaryPassword(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Creates a new user with the provided data
   * @param {Object} userData - User data object
   * @param {string} userData.firstName - User's first name
   * @param {string} userData.lastName - User's last name
   * @param {string} userData.email - User's email address
   * @param {string} userData.role - User's role
   * @param {string} userData.department - User's department
   * @param {string} userData.managerId - Manager's ID (optional)
   * @param {string} userData.companyId - Company ID
   * @param {string} userData.invitedBy - ID of user who sent invitation
   * @param {string} tempPassword - Temporary password
   * @returns {Promise<Object>} Created user object
   */
  static async createUser(userData, tempPassword) {
    const newUser = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: tempPassword, // Will be hashed by pre-save hook
      role: userData.role,
      department: userData.department,
      manager: userData.managerId || null,
      company: userData.companyId,
      isActive: true,
      mustChangePassword: true,
      invitedBy: userData.invitedBy,
      invitedAt: new Date()
    });

    return await newUser.save();
  }

  /**
   * Gets populated user data for response
   * @param {string} userId - User ID to populate
   * @returns {Promise<Object>} Populated user object
   */
  static async getPopulatedUser(userId) {
    return await User.findById(userId)
      .populate('manager', 'firstName lastName email')
      .populate('company', 'name')
      .select('-password');
  }

  /**
   * Builds query for employee filtering
   * @param {Object} filters - Filter parameters
   * @param {string} filters.role - Role filter
   * @param {string} filters.department - Department filter
   * @param {string} filters.status - Status filter
   * @param {string} filters.search - Search term
   * @param {string} companyId - Company ID
   * @returns {Object} MongoDB query object
   */
  static buildEmployeeQuery(filters, companyId) {
    const { role, department, status, search } = filters;
    const query = { company: companyId };
    
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
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    return query;
  }

  /**
   * Gets paginated list of employees with filtering
   * @param {Object} query - MongoDB query object
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated employee data
   */
  static async getPaginatedEmployees(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [employees, total] = await Promise.all([
      User.find(query)
        .populate('manager', 'firstName lastName')
        .populate('company', 'name')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    return {
      employees,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Updates user profile information
   * @param {string} userId - User ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  static async updateUserProfile(userId, updateData) {
    const allowedUpdates = ['firstName', 'lastName', 'department', 'position', 'employeeId'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    return await User.findByIdAndUpdate(
      userId,
      filteredData,
      { new: true, runValidators: true }
    ).populate('company', 'name baseCurrency').select('-password');
  }

  /**
   * Validates password change data
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Validation result
   */
  static validatePasswordChange(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      return {
        success: false,
        message: 'Please provide current and new password'
      };
    }

    if (newPassword.length < 6) {
      return {
        success: false,
        message: 'New password must be at least 6 characters long'
      };
    }

    return { success: true };
  }

  /**
   * Changes user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Operation result
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    return { success: true };
  }
}

module.exports = UserService;