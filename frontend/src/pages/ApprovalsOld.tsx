import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import { toast } from "sonner";

const pendingApprovals = [
  {
    id: "EXP-201",
    employee: "John Doe",
    date: "2024-10-03",
    category: "Travel",
    amount: "$234.50",
    convertedAmount: "$234.50",
    currency: "USD",
    description: "Flight to client meeting in NYC",
    submittedOn: "2024-10-03",
    priority: "High",
    receiptAttached: true,
  },
  {
    id: "EXP-198",
    employee: "Bob Johnson",
    date: "2024-10-02",
    category: "Client Dinner",
    amount: "$450.00",
    convertedAmount: "$450.00",
    currency: "USD",
    description: "Dinner with prospective client",
    submittedOn: "2024-10-02",
    priority: "Medium",
    receiptAttached: true,
  },
  {
    id: "EXP-195",
    employee: "Alice Brown",
    date: "2024-10-01",
    category: "Office Supplies",
    amount: "€125.75",
    convertedAmount: "$136.18",
    currency: "EUR",
    description: "New monitor for home office",
    submittedOn: "2024-10-01",
    priority: "Low",
    receiptAttached: false,
  },
];

const Approvals = () => {
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [comments, setComments] = useState("");

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      toast.success("Expense approved successfully!");
      setSelectedExpense(null);
      setIsApproving(false);
      setComments("");
    }, 1000);
  };

  const handleReject = () => {
    if (!comments.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsApproving(true);
    setTimeout(() => {
      toast.success("Expense rejected");
      setSelectedExpense(null);
      setIsApproving(false);
      setComments("");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pending Approvals</h2>
        <p className="text-muted-foreground">Review and approve expense claims from your team</p>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.map((expense) => (
          <Card key={expense.id} className="shadow-card hover:shadow-elevated transition-all">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{expense.id}</h3>
                        <Badge
                          variant={
                            expense.priority === "High"
                              ? "destructive"
                              : expense.priority === "Medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {expense.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Submitted by <span className="font-medium text-foreground">{expense.employee}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-primary">{expense.convertedAmount}</p>
                      {expense.amount !== expense.convertedAmount && (
                        <p className="text-xs text-muted-foreground">Original: {expense.amount}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{expense.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium">{expense.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-medium">{expense.submittedOn}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Receipt</p>
                      <p className="font-medium">{expense.receiptAttached ? "Attached" : "Not attached"}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{expense.description}</p>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                  <Button
                    variant="outline"
                    className="flex-1 lg:w-full gap-2"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <Eye className="h-4 w-4" />
                    Details
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 lg:w-full gap-2 bg-success hover:bg-success/90"
                    onClick={() => {
                      setSelectedExpense(expense);
                      setTimeout(() => handleApprove(), 100);
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 lg:w-full gap-2"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingApprovals.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold text-lg mb-2">No Pending Approvals</h3>
            <p className="text-muted-foreground">All caught up! No expense claims waiting for your review.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Expense - {selectedExpense?.id}</DialogTitle>
            <DialogDescription>
              Review the expense details and provide your decision
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-semibold">{selectedExpense.employee}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount (Converted)</p>
                  <p className="font-semibold text-lg text-primary">{selectedExpense.convertedAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedExpense.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedExpense.category}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p className="p-3 bg-muted/50 rounded-lg">{selectedExpense.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional for approval, Required for rejection)</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add your comments here..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 bg-success hover:bg-success/90 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isApproving ? "Processing..." : "Approve"}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isApproving}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {isApproving ? "Processing..." : "Reject"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedExpense(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
