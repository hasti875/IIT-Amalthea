import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Shield, 
  UserCheck, 
  Mail,
  Eye,
  MoreHorizontal,
  Crown,
  Briefcase
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface InviteData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'manager' | 'employee';
  managerId?: string;
  department?: string;
}

const EmployeesManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [inviteData, setInviteData] = useState<InviteData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee',
    managerId: '',
    department: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchManagers();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/users/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      } else {
        console.error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/managers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleInviteEmployee = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(inviteData),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees([...employees, data.data]);
        setIsInviteDialogOpen(false);
        setInviteData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'employee',
          managerId: '',
          department: ''
        });
        // Show success message
      } else {
        const errorData = await response.json();
        console.error('Failed to invite employee:', errorData);
        // Show error message
      }
    } catch (error) {
      console.error('Error inviting employee:', error);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          role: selectedEmployee.role,
          managerId: selectedEmployee.manager?._id,
          department: selectedEmployee.department,
          isActive: selectedEmployee.isActive
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(employees.map(emp => 
          emp._id === selectedEmployee._id ? data.data : emp
        ));
        setIsEditDialogOpen(false);
        setSelectedEmployee(null);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp._id !== employeeId));
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && emp.isActive) ||
                         (statusFilter === "inactive" && !emp.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'border-red-300 bg-red-100 text-red-800';
      case 'manager':
        return 'border-blue-300 bg-blue-100 text-blue-800';
      case 'employee':
        return 'border-green-300 bg-green-100 text-green-800';
      default:
        return 'border-gray-300 bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3" />;
      case 'manager':
        return <Shield className="h-3 w-3" />;
      case 'employee':
        return <Briefcase className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Only allow admins to access this page
  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">Only administrators can access employee management</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-gray-600">Manage users, roles, and organizational structure</p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Invite Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Employee</DialogTitle>
              <DialogDescription>
                Send an invitation to join your company
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({...inviteData, firstName: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({...inviteData, lastName: e.target.value})}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                  placeholder="john.doe@company.com"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={inviteData.role} 
                  onValueChange={(value) => setInviteData({...inviteData, role: value as 'manager' | 'employee'})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {inviteData.role === 'employee' && (
                <div>
                  <Label htmlFor="manager">Manager</Label>
                  <Select 
                    value={inviteData.managerId} 
                    onValueChange={(value) => setInviteData({...inviteData, managerId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {manager.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="department">Department (Optional)</Label>
                <Input
                  id="department"
                  value={inviteData.department}
                  onChange={(e) => setInviteData({...inviteData, department: e.target.value})}
                  placeholder="Engineering, Sales, Marketing..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground flex-1"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleInviteEmployee}
                  disabled={!inviteData.firstName || !inviteData.lastName || !inviteData.email}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Managers</p>
                <p className="text-xl font-bold">{employees.filter(emp => emp.role === 'manager').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Employees</p>
                <p className="text-xl font-bold">{employees.filter(emp => emp.role === 'employee').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-xl font-bold">{employees.filter(emp => emp.isActive).length}</p>
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
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-gray-600">Start by inviting your first team member</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div key={employee._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{employee.fullName}</h3>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                      {employee.department && (
                        <p className="text-xs text-gray-500">{employee.department}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadge(employee.role)}`}>
                      {getRoleIcon(employee.role)}
                      <span className="ml-1 capitalize">{employee.role}</span>
                    </div>
                    
                    {employee.manager && (
                      <div className="text-sm text-gray-600">
                        Reports to: {employee.manager.firstName} {employee.manager.lastName}
                      </div>
                    )}
                    
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      employee.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {employee.role !== 'admin' && (
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteEmployee(employee._id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee role and settings
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <p className="text-sm font-medium">{selectedEmployee.fullName}</p>
                <p className="text-xs text-gray-500">{selectedEmployee.email}</p>
              </div>
              
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select 
                  value={selectedEmployee.role} 
                  onValueChange={(value) => setSelectedEmployee({...selectedEmployee, role: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    {user?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedEmployee.role === 'employee' && (
                <div>
                  <Label htmlFor="editManager">Manager</Label>
                  <Select 
                    value={selectedEmployee.manager?._id || ''} 
                    onValueChange={(value) => {
                      const manager = managers.find(m => m._id === value);
                      setSelectedEmployee({...selectedEmployee, manager});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {manager.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={selectedEmployee.isActive}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, isActive: e.target.checked})}
                />
                <Label htmlFor="isActive">Active Employee</Label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground flex-1"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleUpdateEmployee}
                >
                  Update Employee
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesManagement;