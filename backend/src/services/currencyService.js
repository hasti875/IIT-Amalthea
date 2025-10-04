const axios = require('axios');
const { ExchangeRate } = require('../models/Currency');
const { ServiceError } = require('../utils/errors');

/**
 * Currency service configuration with multiple API providers and fallback strategies
 */
const CURRENCY_CONFIG = {
  // Primary API providers (in order of preference)
  apiProviders: [
    {
      name: 'exchangerate-api',
      baseUrl: 'https://api.exchangerate-api.com/v4/latest',
      rateLimit: 1500, // requests per month for free tier
      timeout: 5000
    },
    {
      name: 'fixer',
      baseUrl: 'http://data.fixer.io/api/latest',
      apiKey: process.env.FIXER_API_KEY,
      timeout: 5000
    },
    {
      name: 'currencylayer',
      baseUrl: 'http://apilayer.net/api/live',
      apiKey: process.env.CURRENCY_LAYER_API_KEY,
      timeout: 5000
    }
  ],
  
  // Cache configuration
  cache: {
    freshDuration: 1 * 60 * 60 * 1000, // 1 hour for fresh rates
    staleDuration: 24 * 60 * 60 * 1000, // 24 hours for stale but usable rates
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days maximum cache age
  },
  
  // Fallback rates for common currency pairs (approximate rates for emergency use)
  fallbackRates: {
    'USD-EUR': 0.85,
    'USD-GBP': 0.73,
    'USD-JPY': 110.0,
    'USD-CAD': 1.25,
    'USD-AUD': 1.35,
    'EUR-GBP': 0.86,
    'EUR-USD': 1.18
  }
};

/**
 * Convert currency amount with enhanced error handling and fallbacks
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} options - Conversion options
 * @returns {Object} Conversion result with rate and converted amount
 */
const convertCurrency = async (amount, fromCurrency, toCurrency, options = {}) => {
  try {
    // Validate input parameters
    validateCurrencyConversionInput(amount, fromCurrency, toCurrency);
    
    // If same currency, return original amount
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return {
        value: amount,
        exchangeRate: 1,
        convertedAt: new Date(),
        source: 'same-currency',
        fallbackUsed: false
      };
    }

    // Try to get exchange rate with fallback strategies
    const rateResult = await getExchangeRateWithFallbacks(fromCurrency, toCurrency, options);
    
    const convertedAmount = amount * rateResult.exchangeRate;

    return {
      exchangeRate: rateResult.exchangeRate,
      convertedAt: new Date(),
      source: rateResult.source,
      fallbackUsed: rateResult.fallbackUsed,
      cacheAge: rateResult.cacheAge
    };

  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Try emergency fallback conversion
    const fallbackResult = await attemptFallbackConversion(amount, fromCurrency, toCurrency);
    if (fallbackResult) {
      return fallbackResult;
    }
    
    throw ServiceError.currencyApiFailure(
      `Currency conversion failed: ${error.message}`,
      { fromCurrency, toCurrency, amount }
    );
  }
};

/**
 * Validates currency conversion input parameters
 * @param {number} amount - Amount to validate
 * @param {string} fromCurrency - Source currency to validate
 * @param {string} toCurrency - Target currency to validate
 * @throws {ValidationError} If validation fails
 */
function validateCurrencyConversionInput(amount, fromCurrency, toCurrency) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new ValidationError('Amount must be a valid positive number');
  }
  
  if (!fromCurrency || typeof fromCurrency !== 'string' || fromCurrency.length !== 3) {
    throw new ValidationError('From currency must be a valid 3-letter currency code');
  }
  
  if (!toCurrency || typeof toCurrency !== 'string' || toCurrency.length !== 3) {
    throw new ValidationError('To currency must be a valid 3-letter currency code');
  }
}

/**
 * Get exchange rate with multiple fallback strategies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} options - Options for rate fetching
 * @returns {Object} Rate result with metadata
 */
async function getExchangeRateWithFallbacks(fromCurrency, toCurrency, options) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  // Strategy 1: Try fresh cached rate (< 1 hour old)
  const freshRate = await getCachedRate(from, to, CURRENCY_CONFIG.cache.freshDuration);
  if (freshRate) {
    return {
      exchangeRate: freshRate.rate,
      source: 'fresh-cache',
      fallbackUsed: false,
      cacheAge: Date.now() - freshRate.date.getTime()
    };
  }
  
  // Strategy 2: Try to fetch from external APIs
  for (const provider of CURRENCY_CONFIG.apiProviders) {
    try {
      const rate = await fetchFromProvider(provider, from, to);
      if (rate) {
        // Cache the new rate
        await cacheExchangeRate(from, to, rate, provider.name);
        
        return {
          exchangeRate: rate,
          source: `api-${provider.name}`,
          fallbackUsed: false,
          cacheAge: 0
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch rate from ${provider.name}:`, error.message);
      continue; // Try next provider
    }
  }
  
  // Strategy 3: Use stale cached rate (< 24 hours old)
  const staleRate = await getCachedRate(from, to, CURRENCY_CONFIG.cache.staleDuration);
  if (staleRate) {
    console.warn(`Using stale exchange rate for ${from}-${to}`);
    return {
      exchangeRate: staleRate.rate,
      source: 'stale-cache',
      fallbackUsed: true,
      cacheAge: Date.now() - staleRate.date.getTime()
    };
  }
  
  // Strategy 4: Use hardcoded fallback rates
  const fallbackRate = getFallbackRate(from, to);
  if (fallbackRate) {
    console.warn(`Using emergency fallback rate for ${from}-${to}`);
    return {
      exchangeRate: fallbackRate,
      source: 'emergency-fallback',
      fallbackUsed: true,
      cacheAge: null
    };
  }
  
  throw new Error(`No exchange rate available for ${from} to ${to}`);
}

/**
 * Attempts emergency fallback conversion using hardcoded rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {Object|null} Fallback conversion result or null
 */
async function attemptFallbackConversion(amount, fromCurrency, toCurrency) {
  try {
    const fallbackRate = getFallbackRate(fromCurrency.toUpperCase(), toCurrency.toUpperCase());
    if (fallbackRate) {
      return {
        value: Math.round(amount * fallbackRate * 100) / 100,
        exchangeRate: fallbackRate,
        convertedAt: new Date(),
        source: 'emergency-fallback',
        fallbackUsed: true,
        warning: 'Used emergency fallback rate - may not be current'
      };
    }
  } catch (error) {
    console.error('Emergency fallback conversion failed:', error);
  }
  return null;
}

/**
 * Fetch exchange rate from external API
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Exchange rate
 */
const fetchExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    // Using a free exchange rate API (you can replace with your preferred provider)
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    
    if (apiKey) {
      // Using ExchangeRate-API.com (requires API key)
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}`
      );
      
      if (response.data.result === 'success') {
        return response.data.conversion_rate;
      }
    }

    // Fallback to Fixer.io or another free API
    const fallbackResponse = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    
    if (fallbackResponse.data && fallbackResponse.data.rates[toCurrency]) {
      return fallbackResponse.data.rates[toCurrency];
    }

    // If all APIs fail, throw error
    throw new Error('No exchange rate data available');

  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Return a default rate or throw error based on your preference
    // For demo purposes, returning 1 (you should handle this properly in production)
    console.warn(`Using fallback exchange rate of 1 for ${fromCurrency} to ${toCurrency}`);
    return 1;
  }
};

/**
 * Get all available currencies with latest rates
 * @param {string} baseCurrency - Base currency code
 * @returns {Object} All currencies with their exchange rates
 */
const getAllExchangeRates = async (baseCurrency = 'USD') => {
  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );

    return {
      base: response.data.base,
      date: response.data.date,
      rates: response.data.rates
    };

  } catch (error) {
    console.error('Error fetching all exchange rates:', error);
    throw new Error('Failed to fetch exchange rates');
  }
};

/**
 * Update all exchange rates in database
 * @param {string} baseCurrency - Base currency for rates
 */
const updateExchangeRates = async (baseCurrency = 'USD') => {
  try {
    const ratesData = await getAllExchangeRates(baseCurrency);
    
    const updatePromises = Object.entries(ratesData.rates).map(([currency, rate]) => {
      return ExchangeRate.findOneAndUpdate(
        {
          baseCurrency: baseCurrency,
          targetCurrency: currency,
          date: { $gte: new Date().setHours(0, 0, 0, 0) } // Today's date
        },
        {
          baseCurrency: baseCurrency,
          targetCurrency: currency,
          rate: rate,
          date: new Date(),
          source: 'api'
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(updatePromises);
    console.log(`Updated ${updatePromises.length} exchange rates for base currency ${baseCurrency}`);

  } catch (error) {
    console.error('Error updating exchange rates:', error);
  }
};

/**
 * Get cached exchange rate within specified age
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency  
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {Object|null} Cached rate or null
 */
async function getCachedRate(fromCurrency, toCurrency, maxAge) {
  const cutoffTime = new Date(Date.now() - maxAge);
  
  return await ExchangeRate.findOne({
    baseCurrency: fromCurrency,
    targetCurrency: toCurrency,
    date: { $gte: cutoffTime }
  }).sort({ date: -1 });
}

/**
 * Fetch exchange rate from specific provider
 * @param {Object} provider - API provider configuration
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number|null} Exchange rate or null
 */
async function fetchFromProvider(provider, fromCurrency, toCurrency) {
  try {
    let url, responseHandler;
    
    switch (provider.name) {
      case 'exchangerate-api':
        url = `${provider.baseUrl}/${fromCurrency}`;
        responseHandler = (data) => data.rates?.[toCurrency];
        break;
        
      case 'fixer':
        url = `${provider.baseUrl}?access_key=${provider.apiKey}&base=${fromCurrency}&symbols=${toCurrency}`;
        responseHandler = (data) => data.rates?.[toCurrency];
        break;
        
      case 'currencylayer':
        url = `${provider.baseUrl}?access_key=${provider.apiKey}&source=${fromCurrency}&currencies=${toCurrency}`;
        responseHandler = (data) => data.quotes?.[`${fromCurrency}${toCurrency}`];
        break;
        
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
    
    const response = await axios.get(url, { 
      timeout: provider.timeout,
      headers: { 'User-Agent': 'ExpenseFlow/1.0' }
    });
    
    if (response.data && response.data.success !== false) {
      const rate = responseHandler(response.data);
      if (rate && typeof rate === 'number' && rate > 0) {
        return rate;
      }
    }
    
    throw new Error(`Invalid response from ${provider.name}`);
    
  } catch (error) {
    throw new Error(`${provider.name} API error: ${error.message}`);
  }
}

/**
 * Cache exchange rate in database
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @param {number} rate - Exchange rate
 * @param {string} source - Rate source
 */
async function cacheExchangeRate(fromCurrency, toCurrency, rate, source) {
  try {
    await ExchangeRate.create({
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate: rate,
      date: new Date(),
      source: source
    });
  } catch (error) {
    // Don't throw error if caching fails, just log it
    console.warn('Failed to cache exchange rate:', error.message);
  }
}

/**
 * Get hardcoded fallback rate for emergency use
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number|null} Fallback rate or null
 */
function getFallbackRate(fromCurrency, toCurrency) {
  const key = `${fromCurrency}-${toCurrency}`;
  const reverseKey = `${toCurrency}-${fromCurrency}`;
  
  // Direct lookup
  if (CURRENCY_CONFIG.fallbackRates[key]) {
    return CURRENCY_CONFIG.fallbackRates[key];
  }
  
  // Reverse lookup (invert the rate)
  if (CURRENCY_CONFIG.fallbackRates[reverseKey]) {
    return 1 / CURRENCY_CONFIG.fallbackRates[reverseKey];
  }
  
  return null;
}

/**
 * Get historical exchange rates for a currency pair
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Historical rates
 */
const getHistoricalRates = async (fromCurrency, toCurrency, startDate, endDate) => {
  try {
    const rates = await ExchangeRate.find({
      baseCurrency: fromCurrency.toUpperCase(),
      targetCurrency: toCurrency.toUpperCase(),
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    return rates;
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    throw ServiceError.currencyApiFailure(
      'Failed to fetch historical exchange rates',
      { fromCurrency, toCurrency, startDate, endDate }
    );
  }
};

module.exports = {
  convertCurrency,
  fetchExchangeRate,
  getAllExchangeRates,
  updateExchangeRates,
  getHistoricalRates
};