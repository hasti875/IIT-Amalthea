import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  User, 
  Calendar, 
  DollarSign,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PendingExpense {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  amount: number;
  currency: string;
  convertedAmount: number;
  description: string;
  category: string;
  vendor: string;
  date: string;
  submittedAt: string;
  receiptUrl?: string;
  notes?: string;
  status: 'pending';
  approvalLevel: number;
  nextApprover: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface ApprovalAction {
  type: 'approve' | 'reject';
  expenseId: string;
  comments: string;
}

const Approvals = () => {
  const { user } = useAuth();
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [amountFilter, setAmountFilter] = useState<string>("all");
  const [selectedExpense, setSelectedExpense] = useState<PendingExpense | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/expenses/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingExpenses(data);
      } else {
        console.error('Failed to fetch pending approvals');
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!approvalAction) return;

    setActionLoading(true);
    try {
      const endpoint = approvalAction.type === 'approve' ? 'approve' : 'reject';
      const response = await fetch(`http://localhost:5000/api/expenses/${approvalAction.expenseId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          comments: approvalAction.comments
        }),
      });

      if (response.ok) {
        // Remove the expense from pending list
        setPendingExpenses(prev => prev.filter(exp => exp._id !== approvalAction.expenseId));
        setApprovalAction(null);
        setSelectedExpense(null);
      } else {
        console.error(`Failed to ${approvalAction.type} expense`);
      }
    } catch (error) {
      console.error(`Error ${approvalAction.type}ing expense:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpenses = pendingExpenses.filter(expense => {
    const employeeName = `${expense.employee.firstName} ${expense.employee.lastName}`.toLowerCase();
    const matchesSearch = employeeName.includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    
    const matchesAmount = amountFilter === "all" || 
                         (amountFilter === "low" && expense.convertedAmount < 100) ||
                         (amountFilter === "medium" && expense.convertedAmount >= 100 && expense.convertedAmount < 500) ||
                         (amountFilter === "high" && expense.convertedAmount >= 500);
    
    return matchesSearch && matchesCategory && matchesAmount;
  });

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

  const getPriorityBadge = (amount: number) => {
    if (amount >= 1000) return { label: 'High', class: 'border-red-300 bg-red-100 text-red-800' };
    if (amount >= 500) return { label: 'Medium', class: 'border-yellow-300 bg-yellow-100 text-yellow-800' };
    return { label: 'Low', class: 'border-green-300 bg-green-100 text-green-800' };
  };

  const getApprovalLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Manager Review', class: 'border-blue-300 bg-blue-100 text-blue-800' };
      case 2:
        return { label: 'Finance Review', class: 'border-purple-300 bg-purple-100 text-purple-800' };
      default:
        return { label: 'Review Required', class: 'border-gray-300 bg-gray-100 text-gray-800' };
    }
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
          <h1 className="text-2xl font-bold">Expense Approvals</h1>
          <p className="text-gray-600">Review and approve expense claims</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {filteredExpenses.length} pending approval{filteredExpenses.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold">{pendingExpenses.length}</p>
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
                  {formatAmount(
                    pendingExpenses.reduce((sum, exp) => sum + exp.convertedAmount, 0),
                    typeof user?.company?.baseCurrency === 'string' ? user.company.baseCurrency : 'USD'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-xl font-bold">
                  {pendingExpenses.filter(exp => exp.convertedAmount >= 1000).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Employees</p>
                <p className="text-xl font-bold">
                  {new Set(pendingExpenses.map(exp => exp.employee._id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by employee, description, or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
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

            <Select value={amountFilter} onValueChange={setAmountFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="low">Low (&lt; $100)</SelectItem>
                <SelectItem value="medium">Medium ($100 - $500)</SelectItem>
                <SelectItem value="high">High (&gt; $500)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-600">No expenses pending approval at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map((expense) => {
            const priority = getPriorityBadge(expense.convertedAmount);
            const approvalLevel = getApprovalLevelBadge(expense.approvalLevel);
            
            return (
              <Card key={expense._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priority.class}`}>
                          {priority.label}
                        </div>
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${approvalLevel.class}`}>
                          {approvalLevel.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(expense.submittedAt)}
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">{expense.description}</h3>
                      <p className="text-gray-600 mb-1">
                        <span className="font-medium">{expense.employee.firstName} {expense.employee.lastName}</span>
                        {' • '}{expense.vendor} • {expense.category}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expense Date: {formatDate(expense.date)}
                      </p>
                      
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
                      
                      <div className="flex gap-2">
                        <Button
                          className="h-8 px-3 text-xs"
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                        
                        <Button
                          className="border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 h-8 px-3 text-xs"
                          onClick={() => setApprovalAction({ type: 'approve', expenseId: expense._id, comments: '' })}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        
                        <Button
                          className="border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 h-8 px-3 text-xs"
                          onClick={() => setApprovalAction({ type: 'reject', expenseId: expense._id, comments: '' })}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expense Details Modal */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Review</DialogTitle>
            <DialogDescription>
              Review expense details and make approval decision
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-6">
              {/* Employee and Amount */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedExpense.employee.firstName} {selectedExpense.employee.lastName}
                  </h3>
                  <p className="text-gray-600">{selectedExpense.employee.email}</p>
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
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="mt-1">{formatDate(selectedExpense.submittedAt)}</p>
                </div>
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
                    <FileText className="h-4 w-4" />
                    View Receipt
                  </Button>
                )}
                
                <Button 
                  className="border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 flex-1 gap-2"
                  onClick={() => {
                    setApprovalAction({ type: 'approve', expenseId: selectedExpense._id, comments: '' });
                    setSelectedExpense(null);
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                
                <Button 
                  className="border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 flex-1 gap-2"
                  onClick={() => {
                    setApprovalAction({ type: 'reject', expenseId: selectedExpense._id, comments: '' });
                    setSelectedExpense(null);
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Action Modal */}
      <Dialog open={!!approvalAction} onOpenChange={() => setApprovalAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction?.type === 'approve' ? 'Approve Expense' : 'Reject Expense'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction?.type === 'approve' 
                ? 'Add any approval comments (optional)'
                : 'Please provide a reason for rejection'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">
                {approvalAction?.type === 'approve' ? 'Comments' : 'Rejection Reason'}
                {approvalAction?.type === 'reject' && <span className="text-red-500"> *</span>}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  approvalAction?.type === 'approve'
                    ? 'Optional approval comments...'
                    : 'Please specify why this expense is being rejected...'
                }
                value={approvalAction?.comments || ''}
                onChange={(e) => setApprovalAction(prev => prev ? { ...prev, comments: e.target.value } : null)}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                className="border border-input bg-background hover:bg-accent hover:text-accent-foreground flex-1"
                onClick={() => setApprovalAction(null)}
              >
                Cancel
              </Button>
              <Button
                className={approvalAction?.type === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700 text-white flex-1'
                  : 'bg-red-600 hover:bg-red-700 text-white flex-1'
                }
                onClick={handleApprovalAction}
                disabled={actionLoading || (approvalAction?.type === 'reject' && !approvalAction?.comments?.trim())}
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : approvalAction?.type === 'approve' ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {approvalAction?.type === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;