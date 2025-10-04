const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs').promises;
const path = require('path');

// Import the enhanced OCR service
const ocrService = require('../../src/services/ocrService');
const { ServiceError } = require('../../src/utils/errors');

describe('OCR Service - Edge Cases and Error Handling', () => {
  let fsStub, tesseractStub;

  beforeEach(() => {
    // Stub filesystem operations
    fsStub = sinon.stub(fs, 'access');
    sinon.stub(fs, 'stat');
    
    // Mock Tesseract
    tesseractStub = sinon.stub(require('tesseract.js'), 'recognize');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('File Validation Edge Cases', () => {
    it('should reject files that do not exist', async () => {
      const nonExistentPath = '/path/to/nonexistent/file.jpg';
      fsStub.rejects(new Error('ENOENT: no such file or directory'));

      const result = await ocrService.processOCR(nonExistentPath);

      expect(result.success).to.be.false;
      expect(result.fallbackUsed).to.be.true;
      expect(result.suggestions).to.be.an('array').that.includes('Try uploading a clearer image');
    });

    it('should reject files exceeding maximum size limit', async () => {
      const largFilePath = '/path/to/large/file.jpg';
      fsStub.resolves();
      fs.stat.resolves({ size: 15 * 1024 * 1024 }); // 15MB - exceeds 10MB limit

      const result = await ocrService.processOCR(largFilePath);

      expect(result.success).to.be.false;
      expect(result.fallbackReason).to.include('OCR processing failed');
    });

    it('should reject unsupported file formats', async () => {
      const unsupportedPath = '/path/to/file.txt';
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });

      const result = await ocrService.processOCR(unsupportedPath);

      expect(result.success).to.be.false;
      expect(result.error).to.include('Unsupported file format');
    });

    it('should handle zero-byte files gracefully', async () => {
      const emptyFilePath = '/path/to/empty.jpg';
      fsStub.resolves();
      fs.stat.resolves({ size: 0 });

      const result = await ocrService.processOCR(emptyFilePath);

      expect(result.success).to.be.false;
      expect(result.fallbackUsed).to.be.true;
    });
  });

  describe('OCR Processing Edge Cases', () => {
    beforeEach(() => {
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });
    });

    it('should handle OCR timeout gracefully', async () => {
      const imagePath = '/path/to/slow-processing.jpg';
      
      // Simulate timeout by making Tesseract hang
      tesseractStub.returns(new Promise(() => {})); // Never resolves

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.false;
      expect(result.fallbackUsed).to.be.true;
      expect(result.suggestions).to.include('Try uploading a clearer image');
    });

    it('should handle low confidence results with fallback engines', async () => {
      const imagePath = '/path/to/blurry.jpg';
      
      // First attempt with primary engine - low confidence
      tesseractStub.onFirstCall().resolves({
        data: { text: 'barely readable text', confidence: 25 }
      });
      
      // Second attempt with fallback engine - better confidence
      tesseractStub.onSecondCall().resolves({
        data: { text: 'Receipt Total: $45.67 Date: 2024-01-15', confidence: 85 }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.fallbackUsed).to.be.true;
      expect(result.confidence).to.equal(85);
      expect(result.extractedAmount).to.not.be.null;
    });

    it('should handle completely unreadable images', async () => {
      const imagePath = '/path/to/unreadable.jpg';
      
      tesseractStub.resolves({
        data: { text: '', confidence: 0 }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.false;
      expect(result.extractedText).to.equal('');
      expect(result.confidence).to.equal(0);
      expect(result.suggestions).to.include('Consider manually entering the expense details');
    });

    it('should extract partial data when some fields are missing', async () => {
      const imagePath = '/path/to/partial.jpg';
      
      tesseractStub.resolves({
        data: { 
          text: 'Starbucks Coffee\nTotal: $4.50\nThank you!', 
          confidence: 78 
        }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.extractedAmount).to.equal(4.50);
      expect(result.extractedVendor).to.include('Starbucks');
      expect(result.extractedDate).to.be.null; // Date not found
    });

    it('should handle corrupted image files', async () => {
      const imagePath = '/path/to/corrupted.jpg';
      
      tesseractStub.rejects(new Error('Corrupt JPEG data'));

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.false;
      expect(result.error).to.include('OCR processing failed');
      expect(result.fallbackUsed).to.be.true;
    });

    it('should retry with exponential backoff on temporary failures', async () => {
      const imagePath = '/path/to/temp-fail.jpg';
      
      // First two attempts fail, third succeeds
      tesseractStub.onCall(0).rejects(new Error('Temporary network error'));
      tesseractStub.onCall(1).rejects(new Error('Service unavailable'));
      tesseractStub.onCall(2).resolves({
        data: { text: 'Receipt Total: $23.45', confidence: 82 }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.fallbackUsed).to.be.true; // Used retry fallback
      expect(result.attempt).to.equal(3);
      expect(result.extractedAmount).to.equal(23.45);
    });
  });

  describe('Text Extraction Edge Cases', () => {
    beforeEach(() => {
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });
    });

    it('should handle receipts with multiple amounts and pick the correct total', async () => {
      const imagePath = '/path/to/multi-amount.jpg';
      
      tesseractStub.resolves({
        data: { 
          text: 'Item 1: $5.99\nItem 2: $12.50\nSubtotal: $18.49\nTax: $1.85\nTotal: $20.34', 
          confidence: 90 
        }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.extractedAmount).to.equal(20.34); // Should pick the total, not other amounts
    });

    it('should handle foreign currency symbols', async () => {
      const imagePath = '/path/to/foreign-currency.jpg';
      
      tesseractStub.resolves({
        data: { 
          text: 'Restaurant Bill\n€45.67\nMerci beaucoup!', 
          confidence: 85 
        }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.extractedAmount).to.equal(45.67);
    });

    it('should handle dates in multiple formats', async () => {
      const imagePath = '/path/to/date-formats.jpg';
      
      tesseractStub.resolves({
        data: { 
          text: 'Coffee Shop\\nDate: 15/03/2024\\nTotal: $6.50', 
          confidence: 88 
        }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.extractedDate).to.not.be.null;
      expect(result.extractedAmount).to.equal(6.50);
    });

    it('should handle receipts with no clear structure', async () => {
      const imagePath = '/path/to/messy-receipt.jpg';
      
      tesseractStub.resolves({
        data: { 
          text: 'ljds McDonald\'s kdj 8.95 alksjd thank you lksjdf 03/15/24', 
          confidence: 45 
        }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.extractedAmount).to.equal(8.95);
      expect(result.extractedVendor).to.include('McDonald');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent OCR requests without memory leaks', async () => {
      const imagePaths = Array(5).fill('/path/to/test.jpg');
      
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });
      tesseractStub.resolves({
        data: { text: 'Test Receipt Total: $10.00', confidence: 80 }
      });

      const promises = imagePaths.map(path => ocrService.processOCR(path));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).to.be.true;
        expect(result.extractedAmount).to.equal(10.00);
      });

      // Verify Tesseract was called for each request
      expect(tesseractStub.callCount).to.equal(5);
    });

    it('should provide processing time metrics', async () => {
      const imagePath = '/path/to/timed.jpg';
      
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });
      tesseractStub.resolves({
        data: { text: 'Receipt Total: $15.50', confidence: 85 }
      });

      const result = await ocrService.processOCR(imagePath);

      expect(result.success).to.be.true;
      expect(result.processingTime).to.be.a('number');
      expect(result.processingTime).to.be.greaterThan(0);
      expect(result.processedAt).to.be.a('date');
    });
  });

  describe('Configuration and Options', () => {
    it('should respect custom timeout options', async () => {
      const imagePath = '/path/to/custom-timeout.jpg';
      
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });
      
      // Simulate long processing
      tesseractStub.returns(new Promise(resolve => {
        setTimeout(() => resolve({
          data: { text: 'Slow Receipt Total: $25.00', confidence: 80 }
        }), 2000);
      }));

      const options = { timeout: 1000 }; // 1 second timeout
      const result = await ocrService.processOCR(imagePath, options);

      expect(result.success).to.be.false;
      expect(result.error).to.include('timeout');
    });

    it('should use custom logger when provided', async () => {
      const imagePath = '/path/to/logged.jpg';
      const loggerSpy = sinon.spy();
      
      fsStub.resolves();
      fs.stat.resolves({ size: 1024 });
      tesseractStub.resolves({
        data: { text: 'Logged Receipt Total: $30.00', confidence: 80 }
      });

      const options = { logger: loggerSpy };
      const result = await ocrService.processOCR(imagePath, options);

      expect(result.success).to.be.true;
      // Logger should have been called during processing
      expect(loggerSpy.called).to.be.true;
    });
  });
});