const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitted by user is required']
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  amount: {
    value: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    currency: {
      code: {
        type: String,
        required: [true, 'Currency code is required'],
        uppercase: true,
        length: [3, 'Currency code must be 3 characters']
      },
      name: String,
      symbol: String
    }
  },
  amountInBaseCurrency: {
    value: {
      type: Number,
      required: true
    },
    exchangeRate: {
      type: Number,
      required: true,
      default: 1
    },
    convertedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
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
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Subcategory cannot exceed 50 characters']
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Expense date cannot be in the future'
    }
  },
  vendor: {
    type: String,
    trim: true,
    maxlength: [100, 'Vendor name cannot exceed 100 characters']
  },
  paidBy: {
    type: String,
    enum: ['employee', 'company-card', 'cash-advance'],
    required: [true, 'Payment method is required']
  },
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  ocrData: {
    extractedAmount: Number,
    extractedDate: Date,
    extractedVendor: String,
    extractedText: String,
    confidence: Number,
    processedAt: Date
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'waiting-approval', 'approved', 'rejected', 'paid'],
    default: 'draft'
  },
  approvalFlow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  projectCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Project code cannot exceed 20 characters']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [1000, 'Remarks cannot exceed 1000 characters']
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
expenseSchema.index({ submittedBy: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ 'approvalFlow.approver': 1, 'approvalFlow.status': 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdAt: -1 });

// Virtual for approval status
expenseSchema.virtual('currentApprovalLevel').get(function() {
  const pendingApproval = this.approvalFlow.find(flow => flow.status === 'pending');
  return pendingApproval ? pendingApproval.level : null;
});

// Virtual for current approver
expenseSchema.virtual('currentApprover').get(function() {
  const pendingApproval = this.approvalFlow.find(flow => flow.status === 'pending');
  return pendingApproval ? pendingApproval.approver : null;
});

// Virtual for checking if all required approvals are complete
expenseSchema.virtual('isFullyApproved').get(function() {
  const requiredApprovals = this.approvalFlow.filter(flow => flow.isRequired);
  return requiredApprovals.every(flow => flow.status === 'approved');
});

// Ensure virtual fields are serialized
expenseSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to set submitted date
expenseSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  
  if (this.isModified('status') && this.status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);