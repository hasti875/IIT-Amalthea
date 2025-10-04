import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Camera, Upload, Check, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReceiptData {
  amount: string;
  date: string;
  vendor: string;
  description: string;
}

interface ReceiptUploadProps {
  onReceiptProcessed: (data: ReceiptData) => void;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onReceiptProcessed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const processWithOCR = useCallback(async (imageFile: File) => {
    const formData = new FormData();
    formData.append('receipt', imageFile);

    try {
      const response = await fetch('http://localhost:5000/api/expenses/process-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'success' && result.data && result.data.extractedData) {
        return result.data.extractedData;
      } else {
        throw new Error('Invalid response format from OCR service');
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process receipt with OCR');
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const processReceipt = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress
      setProgress(20);
      
      // Process with OCR
      setProgress(50);
      let extractedData;
      
      try {
        extractedData = await processWithOCR(file);
      } catch (ocrError) {
        console.warn('OCR processing failed, using manual entry:', ocrError);
        // Fallback to manual entry if OCR fails
        extractedData = null;
      }
      
      setProgress(80);
      
      // Format the data with safe defaults
      const receiptData: ReceiptData = {
        amount: extractedData?.amount ? (extractedData.amount.toString().replace(/[^0-9.]/g, '')) : '',
        date: extractedData?.date || new Date().toISOString().split('T')[0],
        vendor: extractedData?.vendor || '',
        description: extractedData?.description || 'Receipt expense',
      };

      setProgress(100);
      onReceiptProcessed(receiptData);

      // If OCR failed but we still processed the receipt, show a warning
      if (!extractedData) {
        setError('OCR processing failed, but receipt was uploaded. Please fill in details manually.');
      }

    } catch (error) {
      console.error('Receipt processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process receipt');
      
      // Even if processing fails, allow manual entry
      onReceiptProcessed({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        description: 'Receipt expense - manual entry required'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Receipt Upload & Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            id="receipt-upload"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
          
          {preview ? (
            <div className="space-y-4">
              <img 
                src={preview} 
                alt="Receipt preview" 
                className="mx-auto max-h-48 rounded-lg shadow-md"
              />
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                <span>Receipt uploaded successfully</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                <p className="text-lg font-medium">Drop receipt here or click to upload</p>
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, and PDF files up to 10MB
                </p>
              </div>
            </div>
          )}
          
          <label
            htmlFor="receipt-upload"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </label>
        </div>

        {/* Processing Progress */}
        {processing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing receipt with OCR...</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-500">
              {progress < 30 && "Uploading image..."}
              {progress >= 30 && progress < 70 && "Extracting text..."}
              {progress >= 70 && progress < 100 && "Parsing data..."}
              {progress === 100 && "Complete!"}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {file && !processing && (
          <div className="space-y-2">
            <Button 
              onClick={processReceipt}
              className="w-full h-11 px-8"
            >
              <Camera className="h-4 w-4 mr-2" />
              Process Receipt with OCR
            </Button>
            <Button 
              className="w-full h-11 px-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground" 
              onClick={() => onReceiptProcessed({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                vendor: '',
                description: 'Manual expense entry'
              })}
            >
              Use This Receipt & Enter Details Manually
            </Button>
          </div>
        )}

        {/* Manual Entry Option - Always Visible */}
        {!processing && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">or</p>
            <Button 
              className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground" 
              onClick={() => onReceiptProcessed({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                vendor: '',
                description: ''
              })}
            >
              Skip Receipt & Enter Details Manually
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptUpload;