const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');

// Import the enhanced currency service
const currencyService = require('../../src/services/currencyService');
const Currency = require('../../src/models/Currency');
const { ServiceError } = require('../../src/utils/errors');

describe('Currency Service - Fallback and Error Handling', () => {
  let axiosStub, currencyFindStub, currencySaveStub;

  beforeEach(() => {
    // Stub axios for API calls
    axiosStub = sinon.stub(axios, 'get');
    
    // Stub Currency model operations
    currencyFindStub = sinon.stub(Currency, 'findOne');
    currencySaveStub = sinon.stub(Currency.prototype, 'save');
    
    // Reset internal cache
    if (currencyService._clearCache) {
      currencyService._clearCache();
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('API Provider Failures and Fallbacks', () => {
    it('should fallback to second provider when first fails', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      
      // Mock database cache miss
      currencyFindStub.resolves(null);
      
      // First provider (exchangerate-api) fails
      axiosStub.withArgs(sinon.match(/exchangerate-api/))
        .rejects(new Error('Network timeout'));
      
      // Second provider (fixer.io) succeeds
      axiosStub.withArgs(sinon.match(/fixer\.io/))
        .resolves({
          data: {
            success: true,
            rates: { EUR: 0.85 }
          }
        });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(0.85);
      expect(result.source).to.equal('fixer.io');
      expect(result.fallbackUsed).to.be.true;
      expect(result.providersAttempted).to.equal(2);
    });

    it('should fallback to third provider when first two fail', async () => {
      const fromCurrency = 'GBP';
      const toCurrency = 'JPY';
      
      currencyFindStub.resolves(null);
      
      // First two providers fail
      axiosStub.withArgs(sinon.match(/exchangerate-api/))
        .rejects(new Error('Service unavailable'));
      axiosStub.withArgs(sinon.match(/fixer\.io/))
        .rejects(new Error('Rate limit exceeded'));
      
      // Third provider (openexchangerates) succeeds
      axiosStub.withArgs(sinon.match(/openexchangerates/))
        .resolves({
          data: {
            rates: {
              GBP: 0.8,
              JPY: 110
            }
          }
        });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(137.5); // 110 / 0.8
      expect(result.source).to.equal('openexchangerates.org');
      expect(result.fallbackUsed).to.be.true;
      expect(result.providersAttempted).to.equal(3);
    });

    it('should use emergency fallback rates when all providers fail', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      
      currencyFindStub.resolves(null);
      
      // All providers fail
      axiosStub.rejects(new Error('All services down'));

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.be.a('number');
      expect(result.source).to.equal('emergency_fallback');
      expect(result.fallbackUsed).to.be.true;
      expect(result.isEmergencyRate).to.be.true;
      expect(result.warning).to.include('using emergency fallback rate');
    });

    it('should handle invalid API response format gracefully', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'CAD';
      
      currencyFindStub.resolves(null);
      
      // Provider returns invalid format
      axiosStub.withArgs(sinon.match(/exchangerate-api/))
        .resolves({
          data: { error: 'Invalid currency code' }
        });
      
      // Second provider returns malformed data
      axiosStub.withArgs(sinon.match(/fixer\.io/))
        .resolves({
          data: { rates: null }
        });
      
      // Third provider succeeds
      axiosStub.withArgs(sinon.match(/openexchangerates/))
        .resolves({
          data: {
            rates: {
              USD: 1,
              CAD: 1.25
            }
          }
        });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(1.25);
      expect(result.source).to.equal('openexchangerates.org');
      expect(result.providersAttempted).to.equal(3);
    });
  });

  describe('Network and Timeout Handling', () => {
    it('should handle network timeout with retry mechanism', async () => {
      const fromCurrency = 'EUR';
      const toCurrency = 'USD';
      
      currencyFindStub.resolves(null);
      
      // First attempt times out, second succeeds
      axiosStub.onFirstCall()
        .rejects(new Error('ETIMEDOUT'));
      axiosStub.onSecondCall()
        .resolves({
          data: {
            conversion_rates: { USD: 1.18 }
          }
        });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(1.18);
      expect(result.retryAttempted).to.be.true;
      expect(axiosStub.calledTwice).to.be.true;
    });

    it('should handle DNS resolution failures', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'GBP';
      
      currencyFindStub.resolves(null);
      
      axiosStub.rejects(new Error('ENOTFOUND api.exchangerate-api.com'));

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.be.a('number');
      expect(result.source).to.equal('emergency_fallback');
      expect(result.networkError).to.be.true;
    });

    it('should respect custom timeout settings', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'AUD';
      const options = { timeout: 1000 };
      
      currencyFindStub.resolves(null);
      
      // Simulate slow response
      axiosStub.returns(new Promise(() => {})); // Never resolves

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency, options);

      expect(result.source).to.equal('emergency_fallback');
      expect(result.timeoutError).to.be.true;
    });
  });

  describe('Caching and Database Integration', () => {
    it('should return cached rate when available and fresh', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      
      // Mock fresh cached rate (updated within last hour)
      currencyFindStub.resolves({
        fromCurrency,
        toCurrency,
        rate: 0.85,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        source: 'cached_rate'
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(0.85);
      expect(result.source).to.equal('cached_rate');
      expect(result.fromCache).to.be.true;
      expect(axiosStub.called).to.be.false; // No API calls made
    });

    it('should refresh stale cached rates', async () => {
      const fromCurrency = 'EUR';
      const toCurrency = 'GBP';
      
      // Mock stale cached rate (older than 1 hour)
      currencyFindStub.resolves({
        fromCurrency,
        toCurrency,
        rate: 0.88,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        source: 'cached_rate',
        save: currencySaveStub
      });
      
      // Fresh rate from API
      axiosStub.resolves({
        data: {
          conversion_rates: { GBP: 0.87 }
        }
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(0.87);
      expect(result.cacheRefreshed).to.be.true;
      expect(currencySaveStub.called).to.be.true;
    });

    it('should handle database save failures gracefully', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'JPY';
      
      currencyFindStub.resolves(null);
      currencySaveStub.rejects(new Error('Database connection lost'));
      
      axiosStub.resolves({
        data: {
          conversion_rates: { JPY: 110.5 }
        }
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(110.5);
      expect(result.cacheSaveError).to.be.true;
      // Should still return the rate even if caching fails
    });
  });

  describe('Currency Code Validation', () => {
    it('should handle invalid currency codes', async () => {
      const fromCurrency = 'INVALID';
      const toCurrency = 'USD';

      try {
        await currencyService.getExchangeRate(fromCurrency, toCurrency);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(ServiceError);
        expect(error.message).to.include('Invalid currency code');
      }
    });

    it('should handle same from/to currency conversion', async () => {
      const currency = 'USD';

      const result = await currencyService.getExchangeRate(currency, currency);

      expect(result.rate).to.equal(1.0);
      expect(result.source).to.equal('same_currency');
      expect(axiosStub.called).to.be.false;
    });

    it('should normalize currency codes to uppercase', async () => {
      const fromCurrency = 'usd';
      const toCurrency = 'eur';
      
      currencyFindStub.withArgs({
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      }).resolves({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        rate: 0.85,
        lastUpdated: new Date(),
        source: 'cached_rate'
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(0.85);
      expect(currencyFindStub.calledWith({
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      })).to.be.true;
    });
  });

  describe('Rate Calculation Edge Cases', () => {
    it('should handle cross-currency calculations correctly', async () => {
      const fromCurrency = 'GBP';
      const toCurrency = 'CAD';
      
      currencyFindStub.resolves(null);
      
      // API returns USD-based rates
      axiosStub.resolves({
        data: {
          base: 'USD',
          rates: {
            GBP: 0.8,  // 1 USD = 0.8 GBP
            CAD: 1.25  // 1 USD = 1.25 CAD
          }
        }
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      // 1 GBP = (1/0.8) * 1.25 CAD = 1.5625 CAD
      expect(result.rate).to.be.closeTo(1.5625, 0.0001);
      expect(result.calculationMethod).to.equal('cross_currency');
    });

    it('should handle very small exchange rates', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'IDR'; // Indonesian Rupiah (high value)
      
      currencyFindStub.resolves(null);
      
      axiosStub.resolves({
        data: {
          conversion_rates: { IDR: 14500.75 }
        }
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(14500.75);
      expect(result.precision).to.be.at.least(2);
    });

    it('should handle precision for cryptocurrency rates', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'BTC';
      
      currencyFindStub.resolves(null);
      
      axiosStub.resolves({
        data: {
          conversion_rates: { BTC: 0.000025 }
        }
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.rate).to.equal(0.000025);
      expect(result.highPrecisionRate).to.be.true;
    });
  });

  describe('Performance and Concurrent Requests', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const requests = [
        ['USD', 'EUR'],
        ['EUR', 'GBP'],
        ['GBP', 'JPY'],
        ['JPY', 'USD'],
        ['CAD', 'AUD']
      ];
      
      currencyFindStub.resolves(null);
      
      axiosStub.resolves({
        data: {
          conversion_rates: {
            EUR: 0.85,
            GBP: 0.75,
            JPY: 110,
            USD: 1.0,
            CAD: 1.25,
            AUD: 1.35
          }
        }
      });

      const promises = requests.map(([from, to]) => 
        currencyService.getExchangeRate(from, to)
      );
      
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.rate).to.be.a('number');
        expect(result.rate).to.be.greaterThan(0);
      });

      // Should batch API calls efficiently
      expect(axiosStub.callCount).to.be.lessThan(requests.length);
    });

    it('should provide request timing metrics', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      
      currencyFindStub.resolves(null);
      
      axiosStub.resolves({
        data: {
          conversion_rates: { EUR: 0.85 }
        }
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.requestTime).to.be.a('number');
      expect(result.requestTime).to.be.greaterThan(0);
      expect(result.timestamp).to.be.a('date');
    });
  });

  describe('Emergency Fallback Rates', () => {
    it('should provide reasonable emergency rates for major currencies', async () => {
      const majorPairs = [
        ['USD', 'EUR'],
        ['USD', 'GBP'],
        ['USD', 'JPY'],
        ['EUR', 'GBP']
      ];

      currencyFindStub.resolves(null);
      axiosStub.rejects(new Error('All services down'));

      for (const [from, to] of majorPairs) {
        const result = await currencyService.getExchangeRate(from, to);
        
        expect(result.rate).to.be.a('number');
        expect(result.rate).to.be.greaterThan(0);
        expect(result.source).to.equal('emergency_fallback');
        expect(result.isEmergencyRate).to.be.true;
      }
    });

    it('should warn about emergency rates accuracy', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      
      currencyFindStub.resolves(null);
      axiosStub.rejects(new Error('Network error'));

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result.warning).to.include('emergency fallback rate');
      expect(result.accuracyWarning).to.be.true;
      expect(result.recommendedAction).to.include('verify manually');
    });
  });
});