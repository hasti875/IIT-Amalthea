import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar,
  DollarSign,
  ArrowRight,
  Receipt,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExpenseItem {
  _id: string;
  title: string;
  description: string;
  amount: {
    value: number;
    currency: {
      code: string;
      symbol: string;
    };
  };
  amountInBaseCurrency: {
    value: number;
    exchangeRate: number;
  };
  category: string;
  vendor: string;
  expenseDate: string;
  submittedAt?: string;
  status: 'draft' | 'submitted' | 'waiting-approval' | 'approved' | 'rejected' | 'paid';
  approvalFlow: Array<{
    approver: {
      _id: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    level: number;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    actionDate?: string;
    isRequired: boolean;
  }>;
  receipt?: {
    filename: string;
    path: string;
  };
  isUrgent: boolean;
  projectCode?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}

export default function MyExpensesNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const expenseCategories = [
    'travel', 'meals', 'accommodation', 'transportation', 
    'office-supplies', 'software', 'training', 'marketing', 
    'entertainment', 'healthcare', 'other'
  ];

  useEffect(() => {
    fetchExpenses();
  }, [currentPage, statusFilter, categoryFilter, searchTerm]);

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`http://localhost:5000/api/expenses?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.data.expenses || []);
        setTotalPages(data.data.pagination?.pages || 1);
        
        // Calculate stats
        const stats = data.data.expenses.reduce((acc: any, expense: ExpenseItem) => {
          acc.total += 1;
          acc[expense.status] = (acc[expense.status] || 0) + 1;
          acc.totalAmount += expense.amountInBaseCurrency.value;
          return acc;
        }, {
          total: 0,
          draft: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          totalAmount: 0
        });
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch expenses"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Expense deleted successfully"
        });
        fetchExpenses();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to delete expense"
        });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete expense"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'submitted': case 'waiting-approval': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'paid': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'submitted': case 'waiting-approval': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'paid': return <DollarSign className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getApprovalProgress = (expense: ExpenseItem) => {
    if (expense.status === 'draft') return 0;
    if (expense.status === 'approved') return 100;
    if (expense.status === 'rejected') return 0;
    
    const totalLevels = expense.approvalFlow.length;
    if (totalLevels === 0) return 0;
    
    const completedLevels = expense.approvalFlow.filter(flow => flow.status !== 'pending').length;
    return (completedLevels / totalLevels) * 100;
  };

  const getCurrentApprover = (expense: ExpenseItem) => {
    const pendingApproval = expense.approvalFlow.find(flow => flow.status === 'pending');
    return pendingApproval ? pendingApproval.approver : null;
  };

  const formatCurrency = (amount: number) => {
    const baseCurrency = user?.company?.baseCurrency;
    const currencyCode = typeof baseCurrency === 'string' ? baseCurrency : baseCurrency?.code || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading expenses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Expenses</h1>
          <p className="text-muted-foreground">Track and manage your expense submissions</p>
        </div>
        <Button onClick={() => navigate('/submit-expense')}>
          <Plus className="h-4 w-4 mr-2" />
          New Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Not submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Ready for payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Need revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="waiting-approval">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map(category => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category.replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first expense to get started.'}
              </p>
              <Button onClick={() => navigate('/submit-expense')}>
                <Plus className="h-4 w-4 mr-2" />
                Submit New Expense
              </Button>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => (
            <Card key={expense._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Expense Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{expense.title}</h3>
                          {expense.isUrgent && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {expense.vendor && `${expense.vendor} • `}
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {expense.amount.currency.symbol}{expense.amount.value.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(expense.amountInBaseCurrency.value)}
                        </div>
                      </div>
                    </div>

                    {/* Expense Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <p className="font-medium capitalize">{expense.category.replace('-', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="flex items-center gap-1 mt-1">
                          {getStatusIcon(expense.status)}
                          <Badge className={getStatusColor(expense.status)}>
                            {expense.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <p className="font-medium">
                          {expense.submittedAt 
                            ? new Date(expense.submittedAt).toLocaleDateString()
                            : 'Not submitted'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Updated:</span>
                        <p className="font-medium">
                          {new Date(expense.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Approval Progress */}
                    {expense.status === 'waiting-approval' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Approval Progress</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(getApprovalProgress(expense))}% complete
                          </span>
                        </div>
                        <Progress value={getApprovalProgress(expense)} className="w-full" />
                        
                        {getCurrentApprover(expense) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-muted-foreground">
                              Waiting for approval from{' '}
                              <span className="font-medium">
                                {getCurrentApprover(expense)!.firstName} {getCurrentApprover(expense)!.lastName}
                              </span>
                              {' '}({getCurrentApprover(expense)!.role})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setSelectedExpense(expense);
                            setDetailsDialog(true);
                          }}
                          className="h-8 px-3 border bg-background hover:bg-accent hover:text-accent-foreground"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        
                        {expense.status === 'draft' && (
                          <>
                            <Button
                              onClick={() => navigate(`/submit-expense?edit=${expense._id}`)}
                              className="h-8 px-3 border bg-background hover:bg-accent hover:text-accent-foreground"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteExpense(expense._id)}
                              className="h-8 px-3 bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(expense.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 border bg-background hover:bg-accent hover:text-accent-foreground"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="h-8 px-3 border bg-background hover:bg-accent hover:text-accent-foreground"
          >
            Next
          </Button>
        </div>
      )}

      {/* Expense Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              Complete information about your expense submission
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Title</h4>
                  <p className="text-sm text-muted-foreground">{selectedExpense.title}</p>
                </div>
                <div>
                  <h4 className="font-medium">Status</h4>
                  <Badge className={getStatusColor(selectedExpense.status)}>
                    {selectedExpense.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
              </div>

              {/* Amount Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Original Amount</h4>
                  <p className="text-lg font-bold">
                    {selectedExpense.amount.currency.symbol}{selectedExpense.amount.value.toLocaleString()}
                    <span className="text-sm text-muted-foreground ml-2">
                      {selectedExpense.amount.currency.code}
                    </span>
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Converted Amount</h4>
                  <p className="text-lg font-bold">
                    {formatCurrency(selectedExpense.amountInBaseCurrency.value)}
                  </p>
                  {selectedExpense.amountInBaseCurrency.exchangeRate !== 1 && (
                    <p className="text-xs text-muted-foreground">
                      Rate: {selectedExpense.amountInBaseCurrency.exchangeRate}
                    </p>
                  )}
                </div>
              </div>

              {/* Approval Flow */}
              {selectedExpense.approvalFlow.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Approval Flow</h4>
                  <div className="space-y-2">
                    {selectedExpense.approvalFlow.map((flow, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">Level {flow.level}</span>
                            {flow.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {flow.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                            {flow.status === 'pending' && <Clock className="h-4 w-4 text-orange-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {flow.approver.firstName} {flow.approver.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {flow.approver.role}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(flow.status)}>
                            {flow.status}
                          </Badge>
                          {flow.actionDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(flow.actionDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="font-medium">Category</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedExpense.category.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Expense Date</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedExpense.projectCode && (
                <div>
                  <h4 className="font-medium">Project Code</h4>
                  <p className="text-sm text-muted-foreground">{selectedExpense.projectCode}</p>
                </div>
              )}

              {selectedExpense.remarks && (
                <div>
                  <h4 className="font-medium">Remarks</h4>
                  <p className="text-sm text-muted-foreground">{selectedExpense.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}