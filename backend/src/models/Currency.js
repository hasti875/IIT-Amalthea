const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Currency code is required'],
    unique: true,
    uppercase: true,
    length: [3, 'Currency code must be 3 characters']
  },
  name: {
    type: String,
    required: [true, 'Currency name is required'],
    trim: true
  },
  symbol: {
    type: String,
    required: [true, 'Currency symbol is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create additional indexes (code already indexed via unique: true)
currencySchema.index({ country: 1 });

const exchangeRateSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    required: [true, 'Base currency is required'],
    uppercase: true
  },
  targetCurrency: {
    type: String,
    required: [true, 'Target currency is required'],
    uppercase: true
  },
  rate: {
    type: Number,
    required: [true, 'Exchange rate is required'],
    min: [0, 'Exchange rate must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Rate date is required'],
    default: Date.now
  },
  source: {
    type: String,
    enum: ['api', 'manual'],
    default: 'api'
  }
}, {
  timestamps: true
});

// Create compound index
exchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1, date: -1 });

// Static method to get latest exchange rate
exchangeRateSchema.statics.getLatestRate = function(baseCurrency, targetCurrency) {
  return this.findOne({
    baseCurrency: baseCurrency.toUpperCase(),
    targetCurrency: targetCurrency.toUpperCase()
  }).sort({ date: -1 });
};

const Currency = mongoose.model('Currency', currencySchema);
const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

module.exports = { Currency, ExchangeRate };