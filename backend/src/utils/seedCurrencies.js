const { Currency } = require('../models/Currency');

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', country: 'South Korea' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', country: 'Hong Kong' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', country: 'New Zealand' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', country: 'Mexico' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', country: 'Brazil' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', country: 'South Africa' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', country: 'Russia' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', country: 'United Arab Emirates' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', country: 'Saudi Arabia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', country: 'Thailand' }
];

const seedCurrencies = async () => {
  try {
    // Check if currencies already exist
    const existingCurrencies = await Currency.countDocuments();
    
    if (existingCurrencies === 0) {
      await Currency.insertMany(currencies);
      console.log('✅ Currencies seeded successfully');
    } else {
      console.log('ℹ️ Currencies already exist, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding currencies:', error);
  }
};

module.exports = { seedCurrencies };