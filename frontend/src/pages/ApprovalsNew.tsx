import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  FileText, 
  User, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  ArrowUp,
  Users,
  Shield,
  Crown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ApprovalLevel {
  _id: string;
  approver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  level: number;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  actionDate?: string;
  isRequired: boolean;
}

interface ExpenseForApproval {
  _id: string;
  title: string;
  description: string;
  submittedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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
  submittedAt: string;
  receipt?: {
    filename: string;
    path: string;
  };
  ocrData?: {
    confidence: number;
    extractedText: string;
  };
  approvalFlow: ApprovalLevel[];
  status: string;
  isUrgent: boolean;
  projectCode?: string;
  remarks?: string;
}

interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  avgProcessingTime: number;
}

export default function ApprovalsNew() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseForApproval[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    avgProcessingTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseForApproval | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchApprovals();
    fetchApprovalStats();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/expenses/approvals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch approval requests"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/expenses/approval-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching approval stats:', error);
    }
  };

  const handleApprovalAction = async () => {
    if (!selectedExpense || !approvalType) return;

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${selectedExpense._id}/approval-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approvalType,
          comments: comments.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Success",
          description: `Expense ${approvalType === 'approve' ? 'approved' : 'rejected'} successfully`
        });

        setApprovalDialog(false);
        setSelectedExpense(null);
        setComments("");
        setApprovalType(null);
        
        // Refresh the data
        fetchApprovals();
        fetchApprovalStats();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to process approval"
        });
      }
    } catch (error) {
      console.error('Approval action error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process approval"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openApprovalDialog = (expense: ExpenseForApproval, action: 'approve' | 'reject') => {
    setSelectedExpense(expense);
    setApprovalType(action);
    setApprovalDialog(true);
  };

  const getExpensesByStatus = (status: string) => {
    return expenses.filter(expense => {
      if (status === 'pending') {
        return expense.approvalFlow.some(flow => 
          flow.approver._id === user?.id && flow.status === 'pending'
        );
      } else {
        return expense.approvalFlow.some(flow => 
          flow.approver._id === user?.id && flow.status === status
        );
      }
    });
  };

  const getCurrentApprovalLevel = (expense: ExpenseForApproval) => {
    return expense.approvalFlow.find(flow => flow.status === 'pending')?.level || 0;
  };

  const getApprovalProgress = (expense: ExpenseForApproval) => {
    const totalLevels = expense.approvalFlow.length;
    const completedLevels = expense.approvalFlow.filter(flow => flow.status !== 'pending').length;
    return totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-red-500" />;
      case 'manager': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <Users className="h-4 w-4 text-green-500" />;
    }
  };

  const canUserApprove = (expense: ExpenseForApproval) => {
    return expense.approvalFlow.some(flow => 
      flow.approver._id === user?.id && flow.status === 'pending'
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading approval requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Expense Approvals</h1>
        <p className="text-muted-foreground">Review and approve expense submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime}h</div>
            <p className="text-xs text-muted-foreground">Processing time</p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({getExpensesByStatus('pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({getExpensesByStatus('approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({getExpensesByStatus('rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {getExpensesByStatus('pending').map((expense) => (
            <Card key={expense._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
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
                          Submitted by {expense.submittedBy.firstName} {expense.submittedBy.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {expense.amount.currency.symbol}{expense.amount.value.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${expense.amountInBaseCurrency.value.toLocaleString()} USD
                        </div>
                      </div>
                    </div>

                    {/* Expense Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <p className="font-medium capitalize">{expense.category}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Vendor</Label>
                        <p className="font-medium">{expense.vendor || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <p className="font-medium">
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Submitted</Label>
                        <p className="font-medium">
                          {new Date(expense.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Approval Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Approval Progress</Label>
                        <span className="text-xs text-muted-foreground">
                          Level {getCurrentApprovalLevel(expense)} of {expense.approvalFlow.length}
                        </span>
                      </div>
                      <Progress value={getApprovalProgress(expense)} className="w-full" />
                      
                      {/* Approval Flow */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {expense.approvalFlow.map((flow, index) => (
                          <div key={index} className="flex items-center">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              flow.status === 'approved' ? 'bg-green-100 text-green-700' :
                              flow.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              flow.approver._id === user?.id ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getRoleIcon(flow.approver.role)}
                              <span>{flow.approver.firstName}</span>
                              {flow.status === 'approved' && <Check className="h-3 w-3" />}
                              {flow.status === 'rejected' && <X className="h-3 w-3" />}
                              {flow.status === 'pending' && flow.approver._id === user?.id && (
                                <Clock className="h-3 w-3" />
                              )}
                            </div>
                            {index < expense.approvalFlow.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canUserApprove(expense) && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          className="border h-8 px-3"
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          className="bg-red-600 hover:bg-red-700 h-8 px-3"
                          onClick={() => openApprovalDialog(expense, 'reject')}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700 h-8 px-3"
                          onClick={() => openApprovalDialog(expense, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {getExpensesByStatus('pending').length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending expense approvals at the moment.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {/* Similar structure for approved expenses */}
        </TabsContent>

        <TabsContent value="rejected">
          {/* Similar structure for rejected expenses */}
        </TabsContent>
      </Tabs>

      {/* Approval Action Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalType === 'approve' ? 'Approve Expense' : 'Reject Expense'}
            </DialogTitle>
            <DialogDescription>
              {approvalType === 'approve' 
                ? 'Confirm expense approval and add any comments.'
                : 'Please provide a reason for rejecting this expense.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Expense Details</Label>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p><strong>{selectedExpense.title}</strong></p>
                  <p>Amount: {selectedExpense.amount.currency.symbol}{selectedExpense.amount.value}</p>
                  <p>Submitted by: {selectedExpense.submittedBy.firstName} {selectedExpense.submittedBy.lastName}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="comments">
                  {approvalType === 'approve' ? 'Comments (Optional)' : 'Rejection Reason'}
                </Label>
                <Textarea
                  id="comments"
                  placeholder={
                    approvalType === 'approve' 
                      ? 'Add any comments...'
                      : 'Please explain why this expense is being rejected...'
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={() => setApprovalDialog(false)}
              className="border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprovalAction}
              disabled={actionLoading || (approvalType === 'reject' && !comments.trim())}
              className={approvalType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionLoading ? 'Processing...' : (approvalType === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}