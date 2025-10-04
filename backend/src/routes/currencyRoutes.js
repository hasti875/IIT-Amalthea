const express = require('express');
const { Currency } = require('../models/Currency');
const { getAllExchangeRates } = require('../services/currencyService');

const router = express.Router();

// @desc    Get all currencies
// @route   GET /api/currencies
// @access  Private
router.get('/', async (req, res) => {
  try {
    const currencies = await Currency.find({ isActive: true }).sort({ code: 1 });
    
    res.status(200).json({
      status: 'success',
      data: { currencies }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching currencies'
    });
  }
});

// @desc    Get exchange rates
// @route   GET /api/currencies/rates/:baseCurrency?
// @access  Private
router.get('/rates/:baseCurrency?', async (req, res) => {
  try {
    const baseCurrency = req.params.baseCurrency || 'USD';
    const rates = await getAllExchangeRates(baseCurrency);
    
    res.status(200).json({
      status: 'success',
      data: rates
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching exchange rates'
    });
  }
});

module.exports = router;