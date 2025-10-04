import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const approvalRules = [
  {
    id: 1,
    name: "Standard Approval Flow",
    type: "Sequential",
    approvers: ["Manager", "Finance", "Director"],
    threshold: "$1,000",
    status: "Active",
  },
  {
    id: 2,
    name: "Percentage Based (60%)",
    type: "Percentage",
    description: "60% of approvers must approve",
    threshold: "$5,000",
    status: "Active",
  },
  {
    id: 3,
    name: "CFO Auto-Approve",
    type: "Specific Approver",
    description: "CFO approval auto-approves",
    threshold: "Any",
    status: "Active",
  },
  {
    id: 4,
    name: "Hybrid Rule (60% OR CFO)",
    type: "Hybrid",
    description: "60% consensus OR CFO approval",
    threshold: "$10,000",
    status: "Inactive",
  },
];

const ApprovalRules = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ruleType, setRuleType] = useState("sequential");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Rules</h2>
          <p className="text-muted-foreground">Configure conditional and multi-level approval workflows</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Approval Rule</DialogTitle>
              <DialogDescription>
                Define a new approval rule with conditions and approver sequence
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input id="rule-name" placeholder="Standard Approval Flow" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger id="rule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential (Multi-level)</SelectItem>
                    <SelectItem value="percentage">Percentage Based</SelectItem>
                    <SelectItem value="specific">Specific Approver</SelectItem>
                    <SelectItem value="hybrid">Hybrid (Combination)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ruleType === "sequential" && (
                <div className="space-y-3">
                  <Label>Approver Sequence</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Step 1: Manager" />
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Step 2: Finance" />
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch id="manager-first" />
                    <Label htmlFor="manager-first" className="text-sm">
                      Require direct manager approval first
                    </Label>
                  </div>
                </div>
              )}

              {ruleType === "percentage" && (
                <div className="space-y-2">
                  <Label htmlFor="percentage">Approval Percentage</Label>
                  <Input id="percentage" type="number" placeholder="60" min="1" max="100" />
                  <p className="text-xs text-muted-foreground">
                    Percentage of selected approvers that must approve
                  </p>
                </div>
              )}

              {ruleType === "specific" && (
                <div className="space-y-2">
                  <Label htmlFor="specific-approver">Specific Approver</Label>
                  <Select>
                    <SelectTrigger id="specific-approver">
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cfo">CFO</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="finance-director">Finance Director</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This approver's approval will auto-approve the expense
                  </p>
                </div>
              )}

              {ruleType === "hybrid" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="hybrid-percentage">Approval Percentage</Label>
                    <Input id="hybrid-percentage" type="number" placeholder="60" />
                  </div>
                  <div className="text-center font-semibold text-muted-foreground">OR</div>
                  <div className="space-y-2">
                    <Label htmlFor="hybrid-approver">Specific Approver</Label>
                    <Select>
                      <SelectTrigger id="hybrid-approver">
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cfo">CFO</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="threshold">Amount Threshold</Label>
                <Input id="threshold" type="number" placeholder="1000" />
                <p className="text-xs text-muted-foreground">
                  This rule applies to expenses above this amount
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">Create Rule</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {approvalRules.map((rule) => (
          <Card key={rule.id} className="shadow-card hover:shadow-elevated transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {rule.description || `Threshold: ${rule.threshold}`}
                  </CardDescription>
                </div>
                <Badge variant={rule.status === "Active" ? "default" : "secondary"}>
                  {rule.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{rule.type}</Badge>
                </div>
                {rule.approvers && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Approver Sequence:</span>
                    <div className="flex flex-wrap gap-2">
                      {rule.approvers.map((approver, index) => (
                        <Badge key={index} variant="secondary">
                          {index + 1}. {approver}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-3">
                  <Button size="sm" variant="outline" className="flex-1 gap-2">
                    <Settings2 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ApprovalRules;
