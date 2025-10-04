import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Send, Calculator, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExpenseFormData {
  amount: string;
  date: string;
  vendor: string;
  description: string;
  category: string;
  currency: string;
  notes?: string;
}

interface Currency {
  _id: string;
  code: string;
  name: string;
  rate: number;
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseFormData>;
  onSaveDraft: (data: ExpenseFormData) => void;
  onSubmit: (data: ExpenseFormData) => void;
  isSubmitting?: boolean;
  isDrafting?: boolean;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  initialData,
  onSaveDraft,
  onSubmit,
  isSubmitting = false,
  isDrafting = false
}) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    description: '',
    category: '',
    currency: 'USD',
    notes: '',
    ...initialData
  });

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});

  const expenseCategories = [
    'Travel',
    'Meals',
    'Accommodation',
    'Transportation',
    'Office Supplies',
    'Software/Tools',
    'Training/Education',
    'Entertainment',
    'Marketing',
    'Other'
  ];

  useEffect(() => {
    fetchCurrencies();
    fetchUserBaseCurrency();
  }, []);

  useEffect(() => {
    // Auto-convert currency when amount or currency changes
    if (formData.amount && formData.currency && formData.currency !== baseCurrency) {
      convertCurrency();
    } else {
      setConvertedAmount(null);
    }
  }, [formData.amount, formData.currency, baseCurrency]);

  const fetchCurrencies = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/currencies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data);
      }
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
    }
  };

  const fetchUserBaseCurrency = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBaseCurrency(data.user.company?.baseCurrency || 'USD');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const convertCurrency = async () => {
    if (!formData.amount || !formData.currency) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/currencies/convert?from=${formData.currency}&to=${baseCurrency}&amount=${formData.amount}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setConvertedAmount(data.convertedAmount);
      }
    } catch (error) {
      console.error('Currency conversion failed:', error);
    }
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ExpenseFormData> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = () => {
    onSaveDraft(formData);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleInputChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency._id} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>
        </div>

        {/* Currency Conversion Display */}
        {convertedAmount && formData.currency !== baseCurrency && (
          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">
                {formData.currency} {formData.amount} = {baseCurrency} {convertedAmount.toFixed(2)}
              </span>
              <div className="inline-flex items-center rounded-full border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold ml-2">
                Company Base Currency
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Vendor and Description */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor/Merchant *</Label>
            <Input
              id="vendor"
              placeholder="e.g., Amazon, Starbucks, Uber"
              value={formData.vendor}
              onChange={(e) => handleInputChange('vendor', e.target.value)}
              className={errors.vendor ? 'border-red-500' : ''}
            />
            {errors.vendor && (
              <p className="text-sm text-red-500">{errors.vendor}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Brief description of the expense"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details or justification..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="border border-input bg-background hover:bg-accent hover:text-accent-foreground flex-1"
            onClick={handleSaveDraft}
            disabled={isDrafting || isSubmitting}
          >
            {isDrafting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </>
            )}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isDrafting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </>
            )}
          </Button>
        </div>

        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors above before submitting.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;