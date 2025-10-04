const axios = require('axios');
const { ExchangeRate } = require('../models/Currency');

/**
 * Convert currency amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Object} Conversion result with rate and converted amount
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    // If same currency, return original amount
    if (fromCurrency === toCurrency) {
      return {
        value: amount,
        exchangeRate: 1,
        convertedAt: new Date()
      };
    }

    // Try to get cached exchange rate (within last 24 hours)
    const cachedRate = await ExchangeRate.findOne({
      baseCurrency: fromCurrency.toUpperCase(),
      targetCurrency: toCurrency.toUpperCase(),
      date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ date: -1 });

    let exchangeRate;

    if (cachedRate) {
      exchangeRate = cachedRate.rate;
    } else {
      // Fetch fresh exchange rate from API
      exchangeRate = await fetchExchangeRate(fromCurrency, toCurrency);
      
      // Cache the new rate
      await ExchangeRate.create({
        baseCurrency: fromCurrency.toUpperCase(),
        targetCurrency: toCurrency.toUpperCase(),
        rate: exchangeRate,
        date: new Date(),
        source: 'api'
      });
    }

    const convertedAmount = amount * exchangeRate;

    return {
      value: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      exchangeRate: exchangeRate,
      convertedAt: new Date()
    };

  } catch (error) {
    console.error('Currency conversion error:', error);
    throw new Error('Failed to convert currency');
  }
};

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
    throw new Error('Failed to fetch historical exchange rates');
  }
};

module.exports = {
  convertCurrency,
  fetchExchangeRate,
  getAllExchangeRates,
  updateExchangeRates,
  getHistoricalRates
};