const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  baseCurrency: {
    code: {
      type: String,
      required: [true, 'Currency code is required'],
      uppercase: true,
      length: [3, 'Currency code must be 3 characters']
    },
    name: {
      type: String,
      required: [true, 'Currency name is required']
    },
    symbol: {
      type: String,
      required: [true, 'Currency symbol is required']
    }
  },
  settings: {
    approvalThreshold: {
      type: Number,
      default: 1000, // Amount above which approval is required
      min: [0, 'Approval threshold cannot be negative']
    },
    autoApprovalLimit: {
      type: Number,
      default: 100, // Amount below which expenses are auto-approved
      min: [0, 'Auto approval limit cannot be negative']
    },
    allowMultipleCurrency: {
      type: Boolean,
      default: true
    },
    requireReceipt: {
      type: Boolean,
      default: true
    },
    maxReceiptSize: {
      type: Number,
      default: 10 * 1024 * 1024 // 10MB in bytes
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Company', companySchema);