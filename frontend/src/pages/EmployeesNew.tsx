import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Edit2, Trash2, Mail, Shield, Crown, Briefcase, Users } from 'lucide-react';

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface InviteData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'employee' | 'manager';
  managerId: string;
}

export default function EmployeesNew() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [inviteData, setInviteData] = useState<InviteData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee',
    managerId: ''
  });
  const { toast } = useToast();

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        // Filter managers for the dropdown
        setManagers(data.filter((emp: Employee) => emp.role === 'manager' || emp.role === 'admin'));
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch employees"
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch employees"
      });
    } finally {
      setLoading(false);
    }
  };

  // Invite new employee
  const handleInvite = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/invite-employee', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee invited successfully!"
        });
        setInviteOpen(false);
        setInviteData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'employee',
          managerId: ''
        });
        fetchEmployees();
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.message || "Failed to invite employee"
        });
      }
    } catch (error) {
      console.error('Error inviting employee:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to invite employee"
      });
    }
  };

  // Update employee
  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/employees/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: selectedEmployee.role,
          managerId: selectedEmployee.managerId,
          isActive: selectedEmployee.isActive
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee updated successfully!"
        });
        setEditOpen(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.message || "Failed to update employee"
        });
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update employee"
      });
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee deleted successfully!"
        });
        fetchEmployees();
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.message || "Failed to delete employee"
        });
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete employee"
      });
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-red-500" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'employee':
        return <Briefcase className="h-4 w-4 text-green-500" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'employee':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage your organization's employees and their roles</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Employee</DialogTitle>
              <DialogDescription>
                Send an invitation to a new employee to join your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@company.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value as 'employee' | 'manager' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
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
                  <Select value={inviteData.managerId} onValueChange={(value) => setInviteData(prev => ({ ...prev, managerId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(manager => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {manager.firstName} {manager.lastName} ({manager.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setInviteOpen(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleInvite}>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter(emp => emp.role === 'manager').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter(emp => emp.role === 'employee').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter(emp => emp.isActive).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            Manage employee roles, assignments, and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(employee.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(employee.role)}
                        <span className="capitalize">{employee.role}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.managerName || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={employee.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        className="border h-8 px-2"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setEditOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {employee.role !== 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="border h-8 px-2">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the employee account. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEmployee(employee._id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee role, manager assignment, and status.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                  disabled
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={selectedEmployee.email} disabled />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={selectedEmployee.role}
                  onValueChange={(value) => 
                    setSelectedEmployee(prev => prev ? { ...prev, role: value as 'employee' | 'manager' | 'admin' } : null)
                  }
                  disabled={selectedEmployee.role === 'admin'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    {selectedEmployee.role === 'admin' && (
                      <SelectItem value="admin">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmployee.role === 'employee' && (
                <div>
                  <Label>Manager</Label>
                  <Select
                    value={selectedEmployee.managerId || ''}
                    onValueChange={(value) => 
                      setSelectedEmployee(prev => prev ? { ...prev, managerId: value } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.filter(m => m._id !== selectedEmployee._id).map(manager => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {manager.firstName} {manager.lastName} ({manager.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={selectedEmployee.isActive}
                  onCheckedChange={(checked) =>
                    setSelectedEmployee(prev => prev ? { ...prev, isActive: checked } : null)
                  }
                />
                <Label htmlFor="active">Active Employee</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditOpen(false)} className="border">
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee}>
              Update Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}