const Tesseract = require('tesseract.js');

/**
 * Process OCR on uploaded receipt image
 * @param {string} imagePath - Path to the uploaded image
 * @returns {Object} OCR results with extracted data
 */
const processOCR = async (imagePath) => {
  try {
    const { data: { text, confidence } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m) // Optional: log OCR progress
    });

    // Extract meaningful information from OCR text
    const extractedData = extractReceiptData(text);

    return {
      extractedText: text,
      confidence: confidence,
      extractedAmount: extractedData.amount,
      extractedDate: extractedData.date,
      extractedVendor: extractedData.vendor,
      processedAt: new Date()
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to process receipt with OCR');
  }
};

/**
 * Extract structured data from OCR text
 * @param {string} text - Raw OCR text
 * @returns {Object} Extracted structured data
 */
const extractReceiptData = (text) => {
  const extracted = {
    amount: null,
    date: null,
    vendor: null
  };

  try {
    // Extract amount - look for patterns like $12.34, 12.34, £12.34, €12.34
    const amountPattern = /(?:[$£€₹¥]?\s?)?(\d{1,6}(?:[.,]\d{2})?)\s?(?:[$£€₹¥]|USD|EUR|GBP|INR|JPY|total|amount|sum)?/gi;
    const amounts = [];
    let match;
    
    while ((match = amountPattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0.01 && amount < 100000) { // Reasonable amount range
        amounts.push(amount);
      }
    }
    
    if (amounts.length > 0) {
      // Take the largest amount found (likely to be the total)
      extracted.amount = Math.max(...amounts);
    }

    // Extract date - look for various date formats
    const datePatterns = [
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g
    ];

    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
          extracted.date = parsedDate;
          break;
        }
      }
    }

    // Extract vendor/merchant name - typically at the top of receipt
    const lines = text.split('\n').filter(line => line.trim().length > 2);
    if (lines.length > 0) {
      // Take the first substantial line as potential vendor name
      const firstLine = lines[0].trim();
      if (firstLine.length > 2 && firstLine.length < 50) {
        extracted.vendor = firstLine;
      }
    }

    // Alternative vendor extraction - look for common business indicators
    const vendorPatterns = [
      /^([A-Z][A-Za-z\s&]{2,30}(?:Inc|LLC|Ltd|Corp|Co\.)?)/m,
      /Store[:\s]+([A-Za-z\s]{3,30})/i,
      /Merchant[:\s]+([A-Za-z\s]{3,30})/i
    ];

    if (!extracted.vendor) {
      for (const pattern of vendorPatterns) {
        const vendorMatch = text.match(pattern);
        if (vendorMatch) {
          extracted.vendor = vendorMatch[1].trim();
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error extracting receipt data:', error);
  }

  return extracted;
};

/**
 * Validate OCR extracted data against user input
 * @param {Object} ocrData - OCR extracted data
 * @param {Object} userInput - User provided expense data
 * @returns {Object} Validation results and suggestions
 */
const validateOCRData = (ocrData, userInput) => {
  const validation = {
    suggestions: [],
    warnings: [],
    confidence: 'low'
  };

  // Compare amounts
  if (ocrData.extractedAmount && userInput.amount) {
    const amountDiff = Math.abs(ocrData.extractedAmount - userInput.amount.value);
    const percentDiff = (amountDiff / userInput.amount.value) * 100;

    if (percentDiff > 10) {
      validation.warnings.push({
        type: 'amount_mismatch',
        message: `OCR detected amount ${ocrData.extractedAmount} differs from entered amount ${userInput.amount.value}`,
        ocrValue: ocrData.extractedAmount,
        userValue: userInput.amount.value
      });
    } else if (percentDiff < 5) {
      validation.confidence = 'high';
    }
  }

  // Compare dates
  if (ocrData.extractedDate && userInput.expenseDate) {
    const ocrDate = new Date(ocrData.extractedDate);
    const userDate = new Date(userInput.expenseDate);
    const daysDiff = Math.abs((ocrDate - userDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 7) {
      validation.warnings.push({
        type: 'date_mismatch',
        message: `OCR detected date ${ocrDate.toDateString()} differs from entered date ${userDate.toDateString()}`,
        ocrValue: ocrDate,
        userValue: userDate
      });
    }
  }

  // Suggest vendor if not provided
  if (ocrData.extractedVendor && !userInput.vendor) {
    validation.suggestions.push({
      type: 'vendor_suggestion',
      message: `OCR detected vendor: ${ocrData.extractedVendor}`,
      value: ocrData.extractedVendor
    });
  }

  return validation;
};

module.exports = {
  processOCR,
  extractReceiptData,
  validateOCRData
};