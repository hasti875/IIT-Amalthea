import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  MoreHorizontal,
  Download,
  Users,
  TrendingUp,
  Building2,
  ChevronDown,
  CheckCheck,
  X
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
  submittedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    role: string;
  };
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

interface DepartmentStats {
  department: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
}

interface ExpenseStats {
  total: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  avgAmount: number;
  byDepartment: DepartmentStats[];
  recentActivity: ExpenseItem[];
}

export default function AllExpensesNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total: 0,
    byStatus: {},
    totalAmount: 0,
    avgAmount: 0,
    byDepartment: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const expenseCategories = [
    'travel', 'meals', 'accommodation', 'transportation', 
    'office-supplies', 'software', 'training', 'marketing', 
    'entertainment', 'healthcare', 'other'
  ];

  const departments = [
    'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 
    'Operations', 'Legal', 'Design', 'Product', 'Customer Success'
  ];

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [currentPage, statusFilter, categoryFilter, departmentFilter, dateRange, searchTerm, sortBy, sortOrder]);

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter }),
        ...(dateRange !== 'all' && { dateRange }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`http://localhost:5000/api/expenses/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.data.expenses || []);
        setTotalPages(data.data.pagination?.pages || 1);
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

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/expenses/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprovalAction = async () => {
    if (!selectedExpense) return;

    try {
      const response = await fetch(`http://localhost:5000/api/approvals/${selectedExpense._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: approvalAction,
          comments: approvalComments
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Expense ${approvalAction}d successfully`
        });
        setApprovalDialog(false);
        setApprovalComments('');
        fetchExpenses();
        fetchStats();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || `Failed to ${approvalAction} expense`
        });
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${approvalAction} expense`
      });
    }
  };

  const canApproveExpense = (expense: ExpenseItem) => {
    if (!user) return false;
    
    const currentApprovalLevel = expense.approvalFlow.find(
      flow => flow.status === 'pending' && flow.approver._id === user.id
    );
    
    return currentApprovalLevel !== undefined;
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

  const exportExpenses = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter }),
        ...(dateRange !== 'all' && { dateRange }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`http://localhost:5000/api/expenses/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Expenses exported successfully"
        });
      }
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export expenses"
      });
    }
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
          <h1 className="text-2xl font-bold">All Expenses</h1>
          <p className="text-muted-foreground">Manage and track all company expenses</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportExpenses} className="h-9 px-3 border bg-background hover:bg-accent hover:text-accent-foreground">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Button onClick={() => navigate('/submit-expense')}>
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byStatus['waiting-approval'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Per expense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byDepartment.length}</div>
            <p className="text-xs text-muted-foreground">
              With expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses, employees, vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
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
              <SelectTrigger>
                <SelectValue placeholder="Category" />
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

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expenses ({expenses.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="expenseDate">Expense Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="submittedBy">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-8 px-2 border bg-background hover:bg-accent hover:text-accent-foreground"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'No expenses have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {expenses.map((expense) => (
                <div key={expense._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Expense Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{expense.title}</h3>
                            {expense.isUrgent && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            By {expense.submittedBy.firstName} {expense.submittedBy.lastName}
                            {expense.submittedBy.department && ` • ${expense.submittedBy.department}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {expense.amount.currency.symbol}{expense.amount.value.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(expense.amountInBaseCurrency.value)}
                          </div>
                        </div>
                      </div>

                      {/* Expense Details */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                          <span className="text-muted-foreground">Category:</span>
                          <p className="font-medium capitalize">{expense.category.replace('-', ' ')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expense Date:</span>
                          <p className="font-medium">{new Date(expense.expenseDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vendor:</span>
                          <p className="font-medium">{expense.vendor || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted:</span>
                          <p className="font-medium">
                            {expense.submittedAt 
                              ? new Date(expense.submittedAt).toLocaleDateString()
                              : 'Not submitted'}
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
                          <Progress value={getApprovalProgress(expense)} className="w-full h-2" />
                          
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
                            size="sm"
                            className="h-8 px-3 border bg-background hover:bg-accent hover:text-accent-foreground"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          
                          {canApproveExpense(expense) && (
                            <>
                              <Button
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setApprovalAction('approve');
                                  setApprovalDialog(true);
                                }}
                                size="sm"
                                className="h-8 px-3 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setApprovalAction('reject');
                                  setApprovalDialog(true);
                                }}
                                size="sm"
                                className="h-8 px-3 bg-red-600 hover:bg-red-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              Complete information about the expense submission
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Title</h4>
                    <p className="text-sm">{selectedExpense.title}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Category</h4>
                    <p className="text-sm capitalize">{selectedExpense.category.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Status</h4>
                    <Badge className={getStatusColor(selectedExpense.status)}>
                      {selectedExpense.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Submitted By</h4>
                    <p className="text-sm">
                      {selectedExpense.submittedBy.firstName} {selectedExpense.submittedBy.lastName}
                      <br />
                      <span className="text-muted-foreground">
                        {selectedExpense.submittedBy.email}
                        {selectedExpense.submittedBy.department && ` • ${selectedExpense.submittedBy.department}`}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Expense Date</h4>
                    <p className="text-sm">{new Date(selectedExpense.expenseDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Amount Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-1">Original Amount</h4>
                  <p className="text-lg font-bold">
                    {selectedExpense.amount.currency.symbol}{selectedExpense.amount.value.toLocaleString()}
                    <span className="text-sm text-muted-foreground ml-2">
                      {selectedExpense.amount.currency.code}
                    </span>
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Converted Amount</h4>
                  <p className="text-lg font-bold">
                    {formatCurrency(selectedExpense.amountInBaseCurrency.value)}
                  </p>
                  {selectedExpense.amountInBaseCurrency.exchangeRate !== 1 && (
                    <p className="text-xs text-muted-foreground">
                      Exchange Rate: {selectedExpense.amountInBaseCurrency.exchangeRate}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-1">Vendor</h4>
                  <p className="text-sm">{selectedExpense.vendor || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Project Code</h4>
                  <p className="text-sm">{selectedExpense.projectCode || 'Not specified'}</p>
                </div>
              </div>

              {selectedExpense.remarks && (
                <div>
                  <h4 className="font-medium mb-1">Remarks</h4>
                  <p className="text-sm text-muted-foreground">{selectedExpense.remarks}</p>
                </div>
              )}

              {/* Approval Flow */}
              {selectedExpense.approvalFlow.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Approval Flow</h4>
                  <div className="space-y-3">
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
                          {flow.comments && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                              "{flow.comments}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t text-sm">
                <div>
                  <h4 className="font-medium mb-1">Created</h4>
                  <p className="text-muted-foreground">{new Date(selectedExpense.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Last Updated</h4>
                  <p className="text-muted-foreground">{new Date(selectedExpense.updatedAt).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Submitted</h4>
                  <p className="text-muted-foreground">
                    {selectedExpense.submittedAt 
                      ? new Date(selectedExpense.submittedAt).toLocaleString()
                      : 'Not submitted'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Action Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? 'Approve this expense to move it to the next approval level or mark it as fully approved.'
                : 'Reject this expense and provide feedback to the submitter.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Comments {approvalAction === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder={
                  approvalAction === 'approve' 
                    ? 'Optional comments for approval...'
                    : 'Please provide a reason for rejection...'
                }
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setApprovalDialog(false);
                  setApprovalComments('');
                }}
                className="border bg-background hover:bg-accent hover:text-accent-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprovalAction}
                disabled={approvalAction === 'reject' && !approvalComments.trim()}
                className={approvalAction === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'}
              >
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}