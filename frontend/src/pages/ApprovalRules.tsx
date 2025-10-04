import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2,
  DollarSign,
  Users,
  Shield,
  Loader2
} from "lucide-react";

interface ApprovalRule {
  _id: string;
  name: string;
  description: string;
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    categories?: string[];
    departments?: string[];
  };
  approvers: Array<{
    level: number;
    approverType: 'role' | 'specific' | 'department';
    approverValue: string;
    isRequired: boolean;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ApprovalRules = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    minAmount: '',
    maxAmount: '',
    approverType: 'role' as 'role' | 'specific' | 'department',
    approverValue: '',
    isActive: true
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/approval-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data.data?.rules || []);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch approval rules"
        });
      }
    } catch (error) {
      console.error('Error fetching approval rules:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch approval rules"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const ruleData = {
        name: formData.name,
        description: formData.description,
        conditions: {
          minAmount: formData.minAmount ? parseFloat(formData.minAmount) : undefined,
          maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : undefined
        },
        approvers: [{
          level: 1,
          approverType: formData.approverType,
          approverValue: formData.approverValue,
          isRequired: true
        }],
        isActive: formData.isActive
      };

      const url = editingRule 
        ? `http://localhost:5000/api/approval-rules/${editingRule._id}`
        : 'http://localhost:5000/api/approval-rules';
      
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Approval rule ${editingRule ? 'updated' : 'created'} successfully`
        });
        setDialogOpen(false);
        resetForm();
        fetchRules();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || `Failed to ${editingRule ? 'update' : 'create'} approval rule`
        });
      }
    } catch (error) {
      console.error('Error saving approval rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingRule ? 'update' : 'create'} approval rule`
      });
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this approval rule?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/approval-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Approval rule deleted successfully"
        });
        fetchRules();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete approval rule"
        });
      }
    } catch (error) {
      console.error('Error deleting approval rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete approval rule"
      });
    }
  };

  const handleEdit = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      minAmount: rule.conditions.minAmount?.toString() || '',
      maxAmount: rule.conditions.maxAmount?.toString() || '',
      approverType: rule.approvers[0]?.approverType || 'role',
      approverValue: rule.approvers[0]?.approverValue || '',
      isActive: rule.isActive
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      minAmount: '',
      maxAmount: '',
      approverType: 'role',
      approverValue: '',
      isActive: true
    });
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`http://localhost:5000/api/approval-rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Approval rule ${!isActive ? 'activated' : 'deactivated'}`
        });
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule status:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Approval Rules</h1>
          <p className="text-muted-foreground">Configure expense approval workflows and thresholds</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground">Active approval rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.max(...rules.map(r => r.conditions.maxAmount || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Highest approval threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter(r => r.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Approval Rules</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit' : 'Create'} Approval Rule</DialogTitle>
                  <DialogDescription>
                    Configure when and who needs to approve expenses based on amount and other conditions.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. High Value Expenses"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="isActive">Status</Label>
                      <Select value={formData.isActive.toString()} onValueChange={(value) => setFormData({...formData, isActive: value === 'true'})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe when this rule applies..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minAmount">Minimum Amount ($)</Label>
                      <Input
                        id="minAmount"
                        type="number"
                        value={formData.minAmount}
                        onChange={(e) => setFormData({...formData, minAmount: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxAmount">Maximum Amount ($)</Label>
                      <Input
                        id="maxAmount"
                        type="number"
                        value={formData.maxAmount}
                        onChange={(e) => setFormData({...formData, maxAmount: e.target.value})}
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="approverType">Approver Type</Label>
                      <Select value={formData.approverType} onValueChange={(value: 'role' | 'specific' | 'department') => setFormData({...formData, approverType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="role">By Role</SelectItem>
                          <SelectItem value="specific">Specific Person</SelectItem>
                          <SelectItem value="department">Department Head</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="approverValue">Approver</Label>
                      <Input
                        id="approverValue"
                        value={formData.approverValue}
                        onChange={(e) => setFormData({...formData, approverValue: e.target.value})}
                        placeholder={formData.approverType === 'role' ? 'manager' : formData.approverType === 'specific' ? 'user@company.com' : 'Engineering'}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={() => setDialogOpen(false)} className="border bg-background hover:bg-accent hover:text-accent-foreground">
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRule ? 'Update' : 'Create'} Rule
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading approval rules...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No approval rules configured</h3>
              <p className="text-muted-foreground mb-4">Create your first approval rule to start managing expense approvals.</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge 
                          className={rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
                          onClick={() => toggleRuleStatus(rule._id, rule.isActive)}
                          style={{ cursor: 'pointer' }}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Amount Range:</span>
                          <p>
                            ${rule.conditions.minAmount || 0} - ${rule.conditions.maxAmount || '∞'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Approver:</span>
                          <p className="capitalize">
                            {rule.approvers[0]?.approverType}: {rule.approvers[0]?.approverValue}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>
                          <p>{new Date(rule.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => handleEdit(rule)}
                        className="h-8 px-3 border bg-background hover:bg-accent hover:text-accent-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(rule._id)}
                        className="h-8 px-3 bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Note */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Admin Configuration</h4>
              <p className="text-sm text-blue-700">
                Approval rules determine who needs to approve expenses based on amount thresholds. 
                Configure rules to match your organization's approval workflow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalRules;