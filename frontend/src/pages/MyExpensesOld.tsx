import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, Eye, Download, Edit, Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

const myExpenses = [
  {
    id: "EXP-101",
    date: "2024-10-03",
    category: "Travel",
    amount: "$234.50",
    currency: "USD",
    description: "Flight to client meeting",
    status: "Pending",
    approver: "Jane Smith",
    submittedOn: "2024-10-03",
  },
  {
    id: "EXP-098",
    date: "2024-10-01",
    category: "Meals",
    amount: "$89.50",
    currency: "USD",
    description: "Team lunch",
    status: "Approved",
    approver: "Jane Smith",
    submittedOn: "2024-10-01",
    approvedOn: "2024-10-02",
  },
  {
    id: "EXP-095",
    date: "2024-09-28",
    category: "Software",
    amount: "$49.99",
    currency: "USD",
    description: "Design tool subscription",
    status: "Rejected",
    approver: "Jane Smith",
    submittedOn: "2024-09-28",
    rejectedOn: "2024-09-29",
    comments: "Please use company license instead",
  },
  {
    id: "EXP-092",
    date: "2024-09-25",
    category: "Office Supplies",
    amount: "$156.30",
    currency: "USD",
    description: "Ergonomic keyboard and mouse",
    status: "Approved",
    approver: "Jane Smith",
    submittedOn: "2024-09-25",
    approvedOn: "2024-09-26",
  },
];

const MyExpenses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  const filteredExpenses = myExpenses.filter((exp) => {
    const matchesSearch =
      exp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || exp.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Expenses</h2>
        <p className="text-muted-foreground">View and track your expense submissions</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">ID</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-left py-3 px-4 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Description</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{expense.id}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{expense.date}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{expense.category}</Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold">{expense.amount}</td>
                    <td className="py-3 px-4 max-w-xs truncate">{expense.description}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.status === "Approved"
                            ? "bg-success/10 text-success"
                            : expense.status === "Pending"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {expense.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-2"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Expense Details - {selectedExpense?.id}</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">{selectedExpense.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    className="mt-1"
                    variant={
                      selectedExpense.status === "Approved"
                        ? "default"
                        : selectedExpense.status === "Pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {selectedExpense.status}
                  </Badge>
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
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{selectedExpense.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approver</p>
                <p className="font-medium">{selectedExpense.approver}</p>
              </div>
              {selectedExpense.comments && (
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <p className="text-sm text-destructive font-medium mb-1">Rejection Reason:</p>
                  <p className="text-sm">{selectedExpense.comments}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download Receipt
                </Button>
                <Button variant="outline" onClick={() => setSelectedExpense(null)}>
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

export default MyExpenses;
