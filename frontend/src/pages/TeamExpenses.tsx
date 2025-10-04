import { useState, useEffect } from "react";
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
import { 
  Search, 
  Eye, 
  Download, 
  Filter, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface TeamExpense {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
  };
  amount: number;
  currency: string;
  convertedAmount: number;
  description: string;
  category: string;
  vendor: string;
  date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  receiptUrl?: string;
  notes?: string;
  approver?: {
    firstName: string;
    lastName: string;
  };
}

interface TeamStats {
  totalExpenses: number;
  totalAmount: number;
  pendingApprovals: number;
  averageExpense: number;
  topCategories: Array<{ category: string; amount: number; count: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
}

const TeamExpenses = () => {
  const { user } = useAuth();
  const [teamExpenses, setTeamExpenses] = useState<TeamExpense[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30days");
  const [selectedExpense, setSelectedExpense] = useState<TeamExpense | null>(null);

  useEffect(() => {
    fetchTeamExpenses();
    fetchTeamStats();
  }, [dateRange]);

  const fetchTeamExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/team-expenses?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamExpenses(data);
      } else {
        console.error('Failed to fetch team expenses');
      }
    } catch (error) {
      console.error('Error fetching team expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/team-stats?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamStats(data);
      }
    } catch (error) {
      console.error('Error fetching team stats:', error);
    }
  };

  const filteredExpenses = teamExpenses.filter(expense => {
    const employeeName = `${expense.employee.firstName} ${expense.employee.lastName}`.toLowerCase();
    const matchesSearch = employeeName.includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesEmployee = employeeFilter === "all" || expense.employee._id === employeeFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesEmployee && matchesCategory;
  });

  // Group expenses by status for tabs
  const pendingExpenses = filteredExpenses.filter(exp => exp.status === 'pending');
  const approvedExpenses = filteredExpenses.filter(exp => exp.status === 'approved');
  const rejectedExpenses = filteredExpenses.filter(exp => exp.status === 'rejected');
  const draftExpenses = filteredExpenses.filter(exp => exp.status === 'draft');

  // Get unique employees for filter
  const uniqueEmployees = Array.from(
    new Map(teamExpenses.map(exp => [exp.employee._id, exp.employee])).values()
  );

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
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
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
          <h1 className="text-2xl font-bold">Team Expenses</h1>
          <p className="text-gray-600">Monitor and analyze your team's expense activity</p>
        </div>
        
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 3 months</SelectItem>
            <SelectItem value="1year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold">{teamStats.totalExpenses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold">
                    {formatAmount(teamStats.totalAmount, typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-xl font-bold">{teamStats.pendingApprovals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Average Expense</p>
                  <p className="text-xl font-bold">
                    {formatAmount(teamStats.averageExpense, typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Section */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamStats.topCategories.slice(0, 5).map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${ 
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-purple-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-sm font-medium">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {formatAmount(category.amount, typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD')}
                      </div>
                      <div className="text-xs text-gray-500">{category.count} expenses</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uniqueEmployees.slice(0, 5).map((employee) => {
                  const employeeExpenses = teamExpenses.filter(exp => exp.employee._id === employee._id);
                  const totalAmount = employeeExpenses.reduce((sum, exp) => sum + exp.convertedAmount, 0);
                  
                  return (
                    <div key={employee._id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{employee.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatAmount(totalAmount, typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD')}
                        </div>
                        <div className="text-xs text-gray-500">{employeeExpenses.length} expenses</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueEmployees.map((employee) => (
                  <SelectItem key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
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
          <TabsTrigger value="all">All ({filteredExpenses.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingExpenses.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedExpenses.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedExpenses.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftExpenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ExpensesList expenses={filteredExpenses} onView={setSelectedExpense} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <ExpensesList expenses={pendingExpenses} onView={setSelectedExpense} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <ExpensesList expenses={approvedExpenses} onView={setSelectedExpense} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <ExpensesList expenses={rejectedExpenses} onView={setSelectedExpense} />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <ExpensesList expenses={draftExpenses} onView={setSelectedExpense} />
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
              {/* Employee and Status */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedExpense.employee.firstName} {selectedExpense.employee.lastName}
                  </h3>
                  <p className="text-gray-600">{selectedExpense.employee.email}</p>
                  <div className={getStatusBadge(selectedExpense.status)} style={{ marginTop: '8px' }}>
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
                  <label className="text-sm font-medium text-gray-500">Expense Date</label>
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

// Expenses List Component
interface ExpensesListProps {
  expenses: TeamExpense[];
  onView: (expense: TeamExpense) => void;
}

const ExpensesList: React.FC<ExpensesListProps> = ({ expenses, onView }) => {
  const { user } = useAuth();
  
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
        return <FileText className="h-4 w-4" />;
    }
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
          <p className="text-gray-600">No expenses match the current filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense._id} className="hover:shadow-md transition-shadow">
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
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">{expense.employee.firstName} {expense.employee.lastName}</span>
                  {' • '}{expense.vendor} • {expense.category}
                </p>
                {expense.submittedAt && (
                  <p className="text-sm text-gray-500">
                    Submitted: {formatDate(expense.submittedAt)}
                  </p>
                )}
                
                {expense.notes && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{expense.notes}</p>
                )}
              </div>
              
              <div className="text-right ml-4">
                <div className="text-xl font-bold mb-1">
                  {formatAmount(expense.amount, expense.currency)}
                </div>
                {expense.convertedAmount !== expense.amount && (
                  <div className="text-sm text-gray-600 mb-2">
                    ≈ {formatAmount(expense.convertedAmount, typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD')}
                  </div>
                )}
                
                <Button
                  className="h-8 px-3 text-xs"
                  onClick={() => onView(expense)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TeamExpenses;