import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, ArrowLeft, Save, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

// Import our expense components
import ReceiptUpload from './ReceiptUpload';
import ExpenseForm from './ExpenseForm';

interface ReceiptData {
  amount: string;
  date: string;
  vendor: string;
  description: string;
}

interface ExpenseFormData {
  amount: string;
  date: string;
  vendor: string;
  description: string;
  category: string;
  currency: string;
  notes?: string;
}

const SubmitExpense: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('receipt');
  const [receiptProcessed, setReceiptProcessed] = useState<boolean>(false);
  const [expenseData, setExpenseData] = useState<Partial<ExpenseFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const handleReceiptProcessed = (data: ReceiptData) => {
    setExpenseData(prevData => ({
      ...prevData,
      ...data,
      currency: typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD'
    }));
    setReceiptProcessed(true);
    setCurrentTab('details');
  };

  const handleSaveDraft = async (data: ExpenseFormData) => {
    setIsDrafting(true);
    try {
      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...data,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Draft saved successfully:', result);
      
      // Show success message briefly
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/my-expenses');
      }, 1500);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSubmitExpense = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...data,
          status: 'pending'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Expense submitted successfully:', result);
      
      // Show success message
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/my-expenses');
      }, 2000);
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Success!</h2>
            <p className="text-gray-600">
              Your expense has been {isDrafting ? 'saved as draft' : 'submitted for approval'}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          onClick={() => navigate('/dashboard')}
          className="h-9 px-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Submit New Expense</h1>
          <p className="text-gray-600">Upload receipt or enter expense details manually</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            currentTab === 'receipt' ? 'border-transparent bg-primary text-primary-foreground' :
            receiptProcessed ? 'border-transparent bg-secondary text-secondary-foreground' :
            'text-foreground'
          }`}>
            1. Receipt
          </div>
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            currentTab === 'details' ? 'border-transparent bg-primary text-primary-foreground' : 'text-foreground'
          }`}>
            2. Details
          </div>
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground">
            3. Submit
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receipt">Receipt Upload</TabsTrigger>
          <TabsTrigger value="details" disabled={!receiptProcessed && !expenseData.amount}>
            Expense Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipt" className="space-y-6">
          <ReceiptUpload onReceiptProcessed={handleReceiptProcessed} />
          
          {receiptProcessed && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Receipt processed successfully! You can now proceed to enter additional details.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <ExpenseForm
            initialData={expenseData}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmitExpense}
            isSubmitting={isSubmitting}
            isDrafting={isDrafting}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {currentTab === 'receipt' && !receiptProcessed && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  setExpenseData({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    vendor: '',
                    description: '',
                    currency: typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD'
                  });
                  setReceiptProcessed(true);
                  setCurrentTab('details');
                }}
                className="h-auto p-4 flex-col items-start"
              >
                <div className="font-semibold mb-1">Enter Manually</div>
                <div className="text-sm text-left opacity-90">
                  Skip receipt upload and enter expense details directly
                </div>
              </Button>
              
              <Button
                onClick={() => navigate('/my-expenses')}
                className="h-auto p-4 flex-col items-start"
              >
                <div className="font-semibold mb-1">View Drafts</div>
                <div className="text-sm text-left opacity-90">
                  Continue working on saved expense drafts
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubmitExpense;