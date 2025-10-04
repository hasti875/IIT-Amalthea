const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const { ServiceError } = require('../utils/errors');

/**
 * Configuration for OCR processing with fallback options
 */
const OCR_CONFIG = {
  primaryEngine: 'eng',
  fallbackEngines: ['eng+osd', 'osd'],
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  minConfidence: 30, // Minimum acceptable confidence level
  supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'],
  maxFileSize: 10 * 1024 * 1024 // 10MB
};

/**
 * Process OCR on uploaded receipt image with enhanced error handling and fallbacks
 * @param {string} imagePath - Path to the uploaded image
 * @param {Object} options - Processing options
 * @returns {Object} OCR results with extracted data
 */
const processOCR = async (imagePath, options = {}) => {
  const startTime = Date.now();
  
  try {
    // Validate input file
    await validateImageFile(imagePath);
    
    // Attempt OCR processing with fallbacks
    const ocrResult = await processWithFallbacks(imagePath, options);
    
    // Extract meaningful information from OCR text
    const extractedData = extractReceiptData(ocrResult.text);
    
    // Calculate processing metrics
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      extractedAmount: extractedData.amount,
      extractedDate: extractedData.date,
      extractedVendor: extractedData.vendor,
      processingTime,
      processedAt: new Date(),
      fallbackUsed: ocrResult.fallbackUsed,
      engine: ocrResult.engine
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Return graceful fallback result instead of throwing
    return createFallbackResult(error, imagePath);
  }
};

/**
 * Validates the image file before processing
 * @param {string} imagePath - Path to the image file
 * @throws {ServiceError} If file validation fails
 */
async function validateImageFile(imagePath) {
  try {
    // Check if file exists
    await fs.access(imagePath);
    
    // Check file size
    const stats = await fs.stat(imagePath);
    if (stats.size > OCR_CONFIG.maxFileSize) {
      throw ServiceError.ocrFailure(
        `File size ${stats.size} exceeds maximum allowed size of ${OCR_CONFIG.maxFileSize} bytes`,
        { fileSize: stats.size, maxSize: OCR_CONFIG.maxFileSize }
      );
    }
    
    // Check file format
    const fileExt = path.extname(imagePath).toLowerCase();
    if (!OCR_CONFIG.supportedFormats.includes(fileExt)) {
      throw ServiceError.ocrFailure(
        `Unsupported file format: ${fileExt}`,
        { format: fileExt, supportedFormats: OCR_CONFIG.supportedFormats }
      );
    }
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    throw ServiceError.ocrFailure(
      `File validation failed: ${error.message}`,
      { originalError: error.message }
    );
  }
}

/**
 * Process OCR with multiple fallback strategies
 * @param {string} imagePath - Path to the image file
 * @param {Object} options - Processing options
 * @returns {Object} OCR processing result
 */
async function processWithFallbacks(imagePath, options) {
  const engines = [OCR_CONFIG.primaryEngine, ...OCR_CONFIG.fallbackEngines];
  let lastError = null;
  
  for (let engineIndex = 0; engineIndex < engines.length; engineIndex++) {
    const engine = engines[engineIndex];
    
    for (let attempt = 1; attempt <= OCR_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`OCR attempt ${attempt}/${OCR_CONFIG.maxRetries} with engine: ${engine}`);
        
        const result = await Promise.race([
          Tesseract.recognize(imagePath, engine, {
            logger: options.logger || (() => {}), // Silent by default
            ...options.tesseractOptions
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR timeout')), OCR_CONFIG.timeout)
          )
        ]);
        
        const { data: { text, confidence } } = result;
        
        // Check if confidence is acceptable
        if (confidence < OCR_CONFIG.minConfidence) {
          throw new Error(`Low confidence: ${confidence}% (minimum: ${OCR_CONFIG.minConfidence}%)`);
        }
        
        // Check if we got meaningful text
        if (!text || text.trim().length < 5) {
          throw new Error('No meaningful text extracted from image');
        }
        
        return {
          text,
          confidence,
          engine,
          fallbackUsed: engineIndex > 0 || attempt > 1,
          attempt
        };
        
      } catch (error) {
        lastError = error;
        console.warn(`OCR attempt ${attempt} with engine ${engine} failed:`, error.message);
        
        // Wait before retry (exponential backoff)
        if (attempt < OCR_CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  }
  
  // If all attempts failed, throw the last error
  throw ServiceError.ocrFailure(
    `All OCR processing attempts failed. Last error: ${lastError?.message}`,
    { 
      engines: engines,
      maxRetries: OCR_CONFIG.maxRetries,
      lastError: lastError?.message 
    }
  );
}

/**
 * Creates a graceful fallback result when OCR completely fails
 * @param {Error} error - The error that occurred
 * @param {string} imagePath - Path to the image that failed
 * @returns {Object} Fallback result object
 */
function createFallbackResult(error, imagePath) {
  return {
    success: false,
    extractedText: '',
    confidence: 0,
    extractedAmount: null,
    extractedDate: null,
    extractedVendor: null,
    processedAt: new Date(),
    error: error.message,
    fallbackUsed: true,
    fallbackReason: 'OCR processing failed completely',
    suggestions: [
      'Try uploading a clearer image',
      'Ensure the receipt is well-lit and not blurry',
      'Check that all text is visible and not cut off',
      'Consider manually entering the expense details'
    ]
  };
}

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