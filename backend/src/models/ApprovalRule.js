const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: [100, 'Rule name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: [1, 'Priority must be at least 1']
  },
  conditions: {
    amountRange: {
      min: {
        type: Number,
        default: 0,
        min: [0, 'Minimum amount cannot be negative']
      },
      max: {
        type: Number,
        default: null // null means no upper limit
      }
    },
    categories: [{
      type: String,
      enum: [
        'travel',
        'meals',
        'accommodation',
        'transportation',
        'office-supplies',
        'software',
        'training',
        'marketing',
        'entertainment',
        'healthcare',
        'other'
      ]
    }],
    departments: [String],
    employeeRoles: [{
      type: String,
      enum: ['employee', 'manager', 'admin']
    }],
    specificEmployees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  approvalWorkflow: {
    type: {
      type: String,
      enum: ['sequential', 'parallel', 'conditional'],
      required: [true, 'Workflow type is required']
    },
    levels: [{
      level: {
        type: Number,
        required: true,
        min: [1, 'Level must be at least 1']
      },
      approvers: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        role: {
          type: String,
          enum: ['specific-user', 'manager', 'department-head', 'cfo', 'ceo']
        },
        isRequired: {
          type: Boolean,
          default: true
        }
      }],
      approvalThreshold: {
        type: {
          type: String,
          enum: ['all', 'majority', 'percentage', 'count', 'any'],
          default: 'all'
        },
        value: Number // For percentage or count
      },
      timeLimit: {
        hours: {
          type: Number,
          min: [1, 'Time limit must be at least 1 hour']
        },
        escalateTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    }]
  },
  specialRules: {
    autoApprove: {
      enabled: {
        type: Boolean,
        default: false
      },
      conditions: {
        maxAmount: Number,
        trustedEmployees: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }],
        categories: [String]
      }
    },
    escalation: {
      enabled: {
        type: Boolean,
        default: false
      },
      afterHours: Number,
      escalateTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    delegation: {
      enabled: {
        type: Boolean,
        default: false
      },
      allowSelfDelegation: {
        type: Boolean,
        default: false
      }
    }
  },
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    reminderFrequency: {
      type: String,
      enum: ['none', 'daily', 'every-2-days', 'weekly'],
      default: 'daily'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create indexes
approvalRuleSchema.index({ company: 1, isActive: 1 });
approvalRuleSchema.index({ priority: 1 });
approvalRuleSchema.index({ 'conditions.amountRange.min': 1, 'conditions.amountRange.max': 1 });

// Virtual for checking if rule applies to amount
approvalRuleSchema.methods.appliesTo = function(expense) {
  const { conditions } = this;
  
  // Check amount range
  if (conditions.amountRange.min && expense.amountInBaseCurrency.value < conditions.amountRange.min) {
    return false;
  }
  
  if (conditions.amountRange.max && expense.amountInBaseCurrency.value > conditions.amountRange.max) {
    return false;
  }
  
  // Check categories
  if (conditions.categories.length > 0 && !conditions.categories.includes(expense.category)) {
    return false;
  }
  
  // Check departments (if expense has department info)
  if (conditions.departments.length > 0 && expense.submittedBy.department && 
      !conditions.departments.includes(expense.submittedBy.department)) {
    return false;
  }
  
  // Check employee roles
  if (conditions.employeeRoles.length > 0 && !conditions.employeeRoles.includes(expense.submittedBy.role)) {
    return false;
  }
  
  // Check specific employees
  if (conditions.specificEmployees.length > 0 && !conditions.specificEmployees.includes(expense.submittedBy._id)) {
    return false;
  }
  
  return true;
};

// Method to generate approval flow for an expense
approvalRuleSchema.methods.generateApprovalFlow = function(expense) {
  const approvalFlow = [];
  
  this.approvalWorkflow.levels.forEach(level => {
    level.approvers.forEach(approverConfig => {
      let approver = null;
      
      switch (approverConfig.role) {
        case 'specific-user':
          approver = approverConfig.user;
          break;
        case 'manager':
          approver = expense.submittedBy.manager;
          break;
        // Add more role-based approver logic here
      }
      
      if (approver) {
        approvalFlow.push({
          approver: approver,
          level: level.level,
          status: 'pending',
          isRequired: approverConfig.isRequired
        });
      }
    });
  });
  
  return approvalFlow;
};

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);