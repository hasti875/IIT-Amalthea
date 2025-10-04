import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Shield,
  Crown,
  Briefcase,
  Plus,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  employee: {
    totalExpenses: number;
    pendingExpenses: number;
    approvedExpenses: number;
    rejectedExpenses: number;
    totalAmount: number;
    pendingAmount: number;
    recentExpenses: any[];
  };
  manager: {
    pendingApprovals: number;
    teamExpenses: number;
    monthlyApproved: number;
    averageProcessingTime: number;
    teamMembers: number;
    recentApprovals: any[];
  };
  admin: {
    totalCompanyExpenses: number;
    totalUsers: number;
    totalApprovalRules: number;
    monthlyExpenses: number;
    pendingApprovals: number;
    systemActivity: any[];
  };
}

interface RecentActivity {
  _id: string;
  type: 'expense_submitted' | 'expense_approved' | 'expense_rejected' | 'user_created';
  title: string;
  description: string;
  amount?: number;
  user?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  status?: string;
}

export default function DashboardNew() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    employee: {
      totalExpenses: 0,
      pendingExpenses: 0,
      approvedExpenses: 0,
      rejectedExpenses: 0,
      totalAmount: 0,
      pendingAmount: 0,
      recentExpenses: []
    },
    manager: {
      pendingApprovals: 0,
      teamExpenses: 0,
      monthlyApproved: 0,
      averageProcessingTime: 0,
      teamMembers: 0,
      recentApprovals: []
    },
    admin: {
      totalCompanyExpenses: 0,
      totalUsers: 0,
      totalApprovalRules: 0,
      monthlyExpenses: 0,
      pendingApprovals: 0,
      systemActivity: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/dashboard/${role}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
        setRecentActivity(data.recentActivity || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch dashboard data"
      });
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount: number) => {
    const baseCurrency = user?.company?.baseCurrency;
    const currencyCode = typeof baseCurrency === 'string' ? baseCurrency : baseCurrency?.code || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'expense_submitted': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'expense_approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expense_rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'user_created': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground">
            Here's your {role} dashboard overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            {role === 'admin' ? <Crown className="h-4 w-4" /> :
             role === 'manager' ? <Shield className="h-4 w-4" /> :
             <Briefcase className="h-4 w-4" />}
            <span className="capitalize">{role}</span>
          </div>
        </div>
      </div>

      {/* Role-Based Dashboard Content */}
      {role === 'employee' && (
        <EmployeeDashboard 
          stats={stats.employee} 
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          navigate={navigate}
        />
      )}

      {role === 'manager' && (
        <ManagerDashboard 
          stats={stats.manager} 
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          navigate={navigate}
        />
      )}

      {role === 'admin' && (
        <AdminDashboard 
          stats={stats.admin} 
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          navigate={navigate}
        />
      )}

      {/* Recent Activity Section (Common for all roles) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity to display
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity._id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {activity.amount && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(activity.amount)}</p>
                      {activity.status && (
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Employee Dashboard Component
function EmployeeDashboard({ stats, formatCurrency, getStatusColor, navigate }: any) {
  return (
    <>
      {/* Employee Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExpenses}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pendingAmount)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedExpenses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalExpenses > 0 ? Math.round((stats.approvedExpenses / stats.totalExpenses) * 100) : 0}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Need resubmission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Employee */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => navigate('/submit-expense')}
              className="h-auto p-4 flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-5 w-5" />
                <span className="font-semibold">Submit New Expense</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Upload receipts and create new expense reports
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/my-expenses')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5" />
                <span className="font-semibold">View My Expenses</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Track status and history of your submissions
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/my-expenses?status=draft')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <span className="font-semibold">Continue Drafts</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Resume working on saved expense drafts
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      {stats.recentExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Your latest expense submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentExpenses.slice(0, 5).map((expense: any) => (
                <div key={expense._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium">{expense.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(expense.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(expense.amount.value)}</p>
                    <Badge className={getStatusColor(expense.status)}>
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Manager Dashboard Component
function ManagerDashboard({ stats, formatCurrency, getStatusColor, navigate }: any) {
  return (
    <>
      {/* Manager Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Require your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Under your management
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyApproved}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProcessingTime}h</div>
            <p className="text-xs text-muted-foreground">
              Average approval time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manager Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Management Actions</CardTitle>
          <CardDescription>Review and manage team expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => navigate('/approvals')}
              className="h-auto p-4 flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Review Approvals</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Approve or reject pending expense submissions
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/team-expenses')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">Team Expenses</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Monitor your team's expense activities
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/submit-expense')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-5 w-5" />
                <span className="font-semibold">Submit Expense</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Create your own expense submission
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Admin Dashboard Component
function AdminDashboard({ stats, formatCurrency, getStatusColor, navigate }: any) {
  return (
    <>
      {/* Admin Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Company employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanyExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Total submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyExpenses}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rules</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApprovalRules}</div>
            <p className="text-xs text-muted-foreground">
              Active rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              System-wide pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative Actions</CardTitle>
          <CardDescription>System management and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => navigate('/employees')}
              className="h-auto p-4 flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">Manage Users</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Add, edit, and manage employee accounts
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/approval-rules')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Approval Rules</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Configure expense approval workflows
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/all-expenses')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <span className="font-semibold">All Expenses</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Company-wide expense overview
              </p>
            </Button>

            <Button 
              onClick={() => navigate('/approvals')}
              className="h-auto p-4 flex-col items-start border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">System Approvals</span>
              </div>
              <p className="text-sm opacity-90 text-left">
                Override and manage all approvals
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}