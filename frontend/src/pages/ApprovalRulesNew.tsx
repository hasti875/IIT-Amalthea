import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Users, 
  DollarSign, 
  ArrowRight, 
  Shield, 
  Crown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  X
} from 'lucide-react';

interface Approver {
  _id?: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  role: 'specific-user' | 'manager' | 'department-head' | 'cfo' | 'ceo';
  isRequired: boolean;
}

interface ApprovalLevel {
  level: number;
  approvers: Approver[];
  approvalThreshold: {
    type: 'all' | 'majority' | 'percentage' | 'count' | 'any';
    value?: number;
  };
}

interface ApprovalRule {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: {
    amountRange: {
      min: number;
      max: number | null;
    };
    categories: string[];
    departments: string[];
    employeeRoles: string[];
    specificEmployees: string[];
  };
  approvalWorkflow: {
    type: 'sequential' | 'parallel' | 'conditional';
    levels: ApprovalLevel[];
  };
  autoApprovalConditions?: {
    enabled: boolean;
    conditions: string[];
  };
  escalationRules?: {
    enabled: boolean;
    timeoutHours: number;
    escalateTo: string;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
}

export default function ApprovalRulesNew() {
  const { toast } = useToast();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<ApprovalRule>>({
    name: '',
    description: '',
    isActive: true,
    priority: 1,
    conditions: {
      amountRange: { min: 0, max: null },
      categories: [],
      departments: [],
      employeeRoles: [],
      specificEmployees: []
    },
    approvalWorkflow: {
      type: 'sequential',
      levels: [{
        level: 1,
        approvers: [{
          role: 'manager',
          isRequired: true
        }],
        approvalThreshold: {
          type: 'all'
        }
      }]
    }
  });

  const expenseCategories = [
    'travel', 'meals', 'accommodation', 'transportation', 
    'office-supplies', 'software', 'training', 'marketing', 
    'entertainment', 'healthcare', 'other'
  ];

  const departments = [
    'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 
    'Operations', 'Support', 'Legal', 'Executive'
  ];

  const employeeRoles = ['employee', 'manager', 'admin'];

  const approverRoles = [
    { value: 'manager', label: 'Direct Manager' },
    { value: 'department-head', label: 'Department Head' },
    { value: 'cfo', label: 'CFO' },
    { value: 'ceo', label: 'CEO' },
    { value: 'specific-user', label: 'Specific User' }
  ];

  const workflowTypes = [
    { value: 'sequential', label: 'Sequential (One after another)' },
    { value: 'parallel', label: 'Parallel (All at once)' },
    { value: 'conditional', label: 'Conditional (Based on rules)' }
  ];

  const thresholdTypes = [
    { value: 'all', label: 'All must approve' },
    { value: 'majority', label: 'Majority must approve' },
    { value: 'percentage', label: 'Percentage must approve' },
    { value: 'count', label: 'Minimum number must approve' },
    { value: 'any', label: 'Any one can approve' }
  ];

  useEffect(() => {
    fetchRules();
    fetchUsers();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/approval-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch approval rules"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSaveRule = async () => {
    try {
      const url = editingRule 
        ? `http://localhost:5000/api/approval-rules/${editingRule._id}`
        : 'http://localhost:5000/api/approval-rules';
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRule),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Approval rule ${editingRule ? 'updated' : 'created'} successfully`
        });
        
        setRuleDialog(false);
        setEditingRule(null);
        resetForm();
        fetchRules();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to save approval rule"
        });
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save approval rule"
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
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
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to delete approval rule"
        });
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete approval rule"
      });
    }
  };

  const resetForm = () => {
    setNewRule({
      name: '',
      description: '',
      isActive: true,
      priority: 1,
      conditions: {
        amountRange: { min: 0, max: null },
        categories: [],
        departments: [],
        employeeRoles: [],
        specificEmployees: []
      },
      approvalWorkflow: {
        type: 'sequential',
        levels: [{
          level: 1,
          approvers: [{
            role: 'manager',
            isRequired: true
          }],
          approvalThreshold: {
            type: 'all'
          }
        }]
      }
    });
  };

  const openEditDialog = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setRuleDialog(true);
  };

  const addApprovalLevel = () => {
    if (!newRule.approvalWorkflow) return;
    
    const newLevel = {
      level: newRule.approvalWorkflow.levels.length + 1,
      approvers: [{
        role: 'manager' as const,
        isRequired: true
      }],
      approvalThreshold: {
        type: 'all' as const
      }
    };

    setNewRule({
      ...newRule,
      approvalWorkflow: {
        ...newRule.approvalWorkflow,
        levels: [...newRule.approvalWorkflow.levels, newLevel]
      }
    });
  };

  const removeApprovalLevel = (levelIndex: number) => {
    if (!newRule.approvalWorkflow || newRule.approvalWorkflow.levels.length <= 1) return;

    const updatedLevels = newRule.approvalWorkflow.levels.filter((_, index) => index !== levelIndex);
    // Renumber levels
    updatedLevels.forEach((level, index) => {
      level.level = index + 1;
    });

    setNewRule({
      ...newRule,
      approvalWorkflow: {
        ...newRule.approvalWorkflow,
        levels: updatedLevels
      }
    });
  };

  const updateApprovalLevel = (levelIndex: number, updatedLevel: ApprovalLevel) => {
    if (!newRule.approvalWorkflow) return;

    const updatedLevels = [...newRule.approvalWorkflow.levels];
    updatedLevels[levelIndex] = updatedLevel;

    setNewRule({
      ...newRule,
      approvalWorkflow: {
        ...newRule.approvalWorkflow,
        levels: updatedLevels
      }
    });
  };

  const getRuleBadgeColor = (rule: ApprovalRule) => {
    if (!rule.isActive) return 'bg-gray-100 text-gray-700';
    if (rule.priority === 1) return 'bg-red-100 text-red-700';
    if (rule.priority <= 3) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading approval rules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Approval Rules</h1>
          <p className="text-muted-foreground">Configure expense approval workflows and conditions</p>
        </div>
        <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRule(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Approval Rule' : 'Create New Approval Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure conditions and approval workflow for expense processing
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="workflow">Approval Workflow</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Rule Name</Label>
                    <Input
                      id="name"
                      value={newRule.name || ''}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g., High Value Expenses"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      value={newRule.priority || 1}
                      onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRule.description || ''}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Describe when this rule applies..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newRule.isActive || false}
                    onCheckedChange={(checked) => setNewRule({ ...newRule, isActive: checked })}
                  />
                  <Label htmlFor="active">Rule is active</Label>
                </div>
              </TabsContent>

              <TabsContent value="conditions" className="space-y-4">
                {/* Amount Range */}
                <div>
                  <Label className="text-sm font-medium">Amount Range</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label htmlFor="minAmount" className="text-xs">Minimum ($)</Label>
                      <Input
                        id="minAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newRule.conditions?.amountRange?.min || 0}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions!,
                            amountRange: {
                              ...newRule.conditions!.amountRange,
                              min: parseFloat(e.target.value) || 0
                            }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxAmount" className="text-xs">Maximum ($) - Optional</Label>
                      <Input
                        id="maxAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newRule.conditions?.amountRange?.max || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: {
                            ...newRule.conditions!,
                            amountRange: {
                              ...newRule.conditions!.amountRange,
                              max: e.target.value ? parseFloat(e.target.value) : null
                            }
                          }
                        })}
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <Label className="text-sm font-medium">Expense Categories (Leave empty for all)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {expenseCategories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category}`}
                          checked={newRule.conditions?.categories?.includes(category) || false}
                          onChange={(e) => {
                            const categories = newRule.conditions?.categories || [];
                            const updatedCategories = e.target.checked
                              ? [...categories, category]
                              : categories.filter(c => c !== category);
                            
                            setNewRule({
                              ...newRule,
                              conditions: {
                                ...newRule.conditions!,
                                categories: updatedCategories
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`category-${category}`} className="text-xs capitalize">
                          {category.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-4">
                <div>
                  <Label htmlFor="workflowType">Workflow Type</Label>
                  <Select
                    value={newRule.approvalWorkflow?.type || 'sequential'}
                    onValueChange={(value) => setNewRule({
                      ...newRule,
                      approvalWorkflow: {
                        ...newRule.approvalWorkflow!,
                        type: value as 'sequential' | 'parallel' | 'conditional'
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select workflow type" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Approval Levels */}
                <div>
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Approval Levels</Label>
                    <Button onClick={addApprovalLevel} className="h-8 px-3">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Level
                    </Button>
                  </div>

                  {newRule.approvalWorkflow?.levels?.map((level, levelIndex) => (
                    <Card key={levelIndex} className="mt-3">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Level {level.level}</CardTitle>
                          {newRule.approvalWorkflow!.levels.length > 1 && (
                            <Button
                              onClick={() => removeApprovalLevel(levelIndex)}
                              className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Approvers for this level */}
                        {level.approvers.map((approver, approverIndex) => (
                          <div key={approverIndex} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs">Approver Role</Label>
                              <Select
                                value={approver.role}
                                onValueChange={(value) => {
                                  const updatedLevel = { ...level };
                                  updatedLevel.approvers[approverIndex].role = value as any;
                                  updateApprovalLevel(levelIndex, updatedLevel);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {approverRoles.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {approver.role === 'specific-user' && (
                              <div className="flex-1">
                                <Label className="text-xs">Select User</Label>
                                <Select
                                  value={approver.user?._id || ''}
                                  onValueChange={(value) => {
                                    const selectedUser = users.find(u => u._id === value);
                                    const updatedLevel = { ...level };
                                    updatedLevel.approvers[approverIndex].user = selectedUser;
                                    updateApprovalLevel(levelIndex, updatedLevel);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map(user => (
                                      <SelectItem key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName} ({user.role})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={approver.isRequired}
                                onCheckedChange={(checked) => {
                                  const updatedLevel = { ...level };
                                  updatedLevel.approvers[approverIndex].isRequired = checked;
                                  updateApprovalLevel(levelIndex, updatedLevel);
                                }}
                              />
                              <Label className="text-xs">Required</Label>
                            </div>
                          </div>
                        ))}

                        {/* Approval Threshold */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Approval Threshold</Label>
                            <Select
                              value={level.approvalThreshold.type}
                              onValueChange={(value) => {
                                const updatedLevel = { ...level };
                                updatedLevel.approvalThreshold.type = value as any;
                                updateApprovalLevel(levelIndex, updatedLevel);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {thresholdTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {(level.approvalThreshold.type === 'percentage' || level.approvalThreshold.type === 'count') && (
                            <div>
                              <Label className="text-xs">
                                {level.approvalThreshold.type === 'percentage' ? 'Percentage (%)' : 'Count'}
                              </Label>
                              <Input
                                type="number"
                                min={level.approvalThreshold.type === 'percentage' ? 1 : 1}
                                max={level.approvalThreshold.type === 'percentage' ? 100 : level.approvers.length}
                                value={level.approvalThreshold.value || ''}
                                onChange={(e) => {
                                  const updatedLevel = { ...level };
                                  updatedLevel.approvalThreshold.value = parseInt(e.target.value) || undefined;
                                  updateApprovalLevel(levelIndex, updatedLevel);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={() => setRuleDialog(false)} className="border">
                Cancel
              </Button>
              <Button onClick={handleSaveRule}>
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No approval rules configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first approval rule to automate expense approval workflows
              </p>
              <Button onClick={() => { resetForm(); setRuleDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{rule.name}</h3>
                      <Badge className={getRuleBadgeColor(rule)}>
                        Priority {rule.priority}
                      </Badge>
                      <Badge className={rule.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                    )}

                    {/* Rule Conditions */}
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Amount Range: </span>
                        ${rule.conditions.amountRange.min.toLocaleString()} - {
                          rule.conditions.amountRange.max 
                            ? `$${rule.conditions.amountRange.max.toLocaleString()}`
                            : 'No limit'
                        }
                      </div>
                      
                      {rule.conditions.categories.length > 0 && (
                        <div>
                          <span className="font-medium">Categories: </span>
                          {rule.conditions.categories.map(cat => (
                            <Badge key={cat} className="mr-1 text-xs">
                              {cat.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Approval Workflow Preview */}
                      <div>
                        <span className="font-medium">Workflow: </span>
                        <span className="capitalize">{rule.approvalWorkflow.type}</span>
                        <span className="text-muted-foreground"> - {rule.approvalWorkflow.levels.length} level(s)</span>
                      </div>

                      {/* Show approval flow */}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {rule.approvalWorkflow.levels.map((level, index) => (
                          <div key={index} className="flex items-center">
                            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs">
                              <span className="font-medium">L{level.level}: </span>
                              {level.approvers.map(approver => (
                                <span key={approver.role} className="capitalize">
                                  {approver.role.replace('-', ' ')}
                                  {approver.user && ` (${approver.user.firstName})`}
                                </span>
                              )).join(', ')}
                            </div>
                            {index < rule.approvalWorkflow.levels.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => openEditDialog(rule)}
                      className="h-8 px-3 border"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="h-8 px-3 bg-red-600 hover:bg-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Approval Rule</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{rule.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRule(rule._id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}