import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

const allExpenses = [
  { id: "EXP-201", employee: "John Doe", amount: "$234.50", category: "Travel", status: "Pending", date: "2024-10-03" },
  { id: "EXP-198", employee: "Bob Johnson", amount: "$450.00", category: "Client Dinner", status: "Pending", date: "2024-10-02" },
  { id: "EXP-195", employee: "Alice Brown", amount: "$136.18", category: "Office Supplies", status: "Pending", date: "2024-10-01" },
  { id: "EXP-190", employee: "Jane Smith", amount: "$89.99", category: "Software", status: "Approved", date: "2024-09-30" },
  { id: "EXP-187", employee: "Charlie Davis", amount: "$567.30", category: "Travel", status: "Approved", date: "2024-09-28" },
  { id: "EXP-184", employee: "John Doe", amount: "$45.50", category: "Meals", status: "Rejected", date: "2024-09-27" },
];

const AllExpenses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredExpenses = allExpenses.filter((exp) => {
    const matchesSearch =
      exp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.employee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || exp.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">All Expenses</h2>
        <p className="text-muted-foreground">View and manage all expense claims across the organization</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or employee..."
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
                  <th className="text-left py-3 px-4 font-medium">Employee</th>
                  <th className="text-left py-3 px-4 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{expense.id}</td>
                    <td className="py-3 px-4">{expense.employee}</td>
                    <td className="py-3 px-4 font-semibold">{expense.amount}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{expense.category}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{expense.date}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllExpenses;
