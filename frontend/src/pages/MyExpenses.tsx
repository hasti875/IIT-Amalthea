import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, Download, Edit, Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface Expense {
  _id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  description: string;
  category: string;
  vendor: string;
  date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  notes?: string;
  receiptUrl?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approver?: {
    firstName: string;
    lastName: string;
  };
}

const MyExpenses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/expenses/my-expenses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      } else {
        console.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (expenseId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setExpenses(expenses.filter(expense => expense._id !== expenseId));
      } else {
        console.error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleEditDraft = (expenseId: string) => {
    navigate(`/submit-expense?edit=${expenseId}`);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const drafts = filteredExpenses.filter(expense => expense.status === 'draft');
  const submitted = filteredExpenses.filter(expense => expense.status !== 'draft');

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
    
    switch (status) {
      case 'draft':
        return `${baseClasses} border-gray-300 bg-gray-100 text-gray-800`;
      case 'pending':
        return `${baseClasses} border-yellow-300 bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} border-green-300 bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} border-red-300 bg-red-100 text-red-800`;
      default:
        return `${baseClasses} border-gray-300 bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Expenses</h1>
          <p className="text-gray-600">Manage your expense claims and drafts</p>
        </div>
        <Button onClick={() => navigate('/submit-expense')} className="gap-2">
          <Plus className="h-4 w-4" />
          Submit New Expense
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Meals">Meals</SelectItem>
                <SelectItem value="Accommodation">Accommodation</SelectItem>
                <SelectItem value="Transportation">Transportation</SelectItem>
                <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                <SelectItem value="Software/Tools">Software/Tools</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Expenses ({filteredExpenses.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                <p className="text-gray-600 mb-4">Create your first expense to get started</p>
                <Button onClick={() => navigate('/submit-expense')}>
                  Submit New Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredExpenses.map((expense) => (
              <ExpenseCard 
                key={expense._id} 
                expense={expense} 
                onView={setSelectedExpense}
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
                formatDate={formatDate}
                formatAmount={formatAmount}
                getStatusBadge={getStatusBadge}
                getStatusIcon={getStatusIcon}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No drafts found</h3>
                <p className="text-gray-600">All your saved drafts will appear here</p>
              </CardContent>
            </Card>
          ) : (
            drafts.map((expense) => (
              <ExpenseCard 
                key={expense._id} 
                expense={expense} 
                onView={setSelectedExpense}
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
                formatDate={formatDate}
                formatAmount={formatAmount}
                getStatusBadge={getStatusBadge}
                getStatusIcon={getStatusIcon}
                isDraft={true}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          {submitted.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No submitted expenses</h3>
                <p className="text-gray-600">Your submitted expenses will appear here</p>
              </CardContent>
            </Card>
          ) : (
            submitted.map((expense) => (
              <ExpenseCard 
                key={expense._id} 
                expense={expense} 
                onView={setSelectedExpense}
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
                formatDate={formatDate}
                formatAmount={formatAmount}
                getStatusBadge={getStatusBadge}
                getStatusIcon={getStatusIcon}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Expense Details Modal */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-6">
              {/* Status and Amount */}
              <div className="flex justify-between items-start">
                <div>
                  <div className={getStatusBadge(selectedExpense.status)}>
                    {getStatusIcon(selectedExpense.status)}
                    <span className="ml-1 capitalize">{selectedExpense.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatAmount(selectedExpense.amount, selectedExpense.currency)}
                  </div>
                  {selectedExpense.convertedAmount !== selectedExpense.amount && (
                    <div className="text-sm text-gray-600">
                      ≈ {formatAmount(selectedExpense.convertedAmount, typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD')}
                    </div>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="mt-1">{formatDate(selectedExpense.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="mt-1">{selectedExpense.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vendor</label>
                  <p className="mt-1">{selectedExpense.vendor}</p>
                </div>
                {selectedExpense.submittedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Submitted</label>
                    <p className="mt-1">{formatDate(selectedExpense.submittedAt)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1">{selectedExpense.description}</p>
              </div>

              {selectedExpense.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1">{selectedExpense.notes}</p>
                </div>
              )}

              {selectedExpense.rejectionReason && (
                <div className="bg-red-50 p-4 rounded-md">
                  <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                  <p className="mt-1 text-red-700">{selectedExpense.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {selectedExpense.receiptUrl && (
                  <Button className="border border-input bg-background hover:bg-accent hover:text-accent-foreground flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Download Receipt
                  </Button>
                )}
                <Button 
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setSelectedExpense(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Expense Card Component
interface ExpenseCardProps {
  expense: Expense;
  onView: (expense: Expense) => void;
  onEdit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  formatDate: (date: string) => string;
  formatAmount: (amount: number, currency: string) => string;
  getStatusBadge: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  isDraft?: boolean;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onView,
  onEdit,
  onDelete,
  formatDate,
  formatAmount,
  getStatusBadge,
  getStatusIcon,
  isDraft = false
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={getStatusBadge(expense.status)}>
                {getStatusIcon(expense.status)}
                <span className="ml-1 capitalize">{expense.status}</span>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(expense.date)}
              </div>
            </div>
            
            <h3 className="font-semibold text-lg mb-1">{expense.description}</h3>
            <p className="text-gray-600 mb-2">{expense.vendor} • {expense.category}</p>
            
            {expense.notes && (
              <p className="text-sm text-gray-500 line-clamp-2">{expense.notes}</p>
            )}
          </div>
          
          <div className="text-right ml-4">
            <div className="text-xl font-bold mb-1">
              {formatAmount(expense.amount, expense.currency)}
            </div>
            
            <div className="flex gap-2">
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => onView(expense)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              
              {isDraft && (
                <>
                  <Button
                    className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs"
                    onClick={() => onEdit(expense._id)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    className="border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 h-8 px-3 text-xs"
                    onClick={() => onDelete(expense._id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyExpenses;