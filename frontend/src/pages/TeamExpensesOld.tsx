import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const teamExpenses = [
  { id: "EXP-201", employee: "John Doe", amount: "$234.50", category: "Travel", status: "Pending", date: "2024-10-03" },
  { id: "EXP-195", employee: "Bob Johnson", amount: "$450.00", category: "Client Dinner", status: "Approved", date: "2024-10-01" },
  { id: "EXP-190", employee: "John Doe", amount: "$89.99", category: "Office Supplies", status: "Approved", date: "2024-09-30" },
];

const TeamExpenses = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Team Expenses</h2>
        <p className="text-muted-foreground">View all expense claims from your team members</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team Expenses</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$774.49</div>
            <p className="text-xs text-muted-foreground mt-1">3 expenses this month</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">$234.50</div>
            <p className="text-xs text-muted-foreground mt-1">1 expense awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">$539.99</div>
            <p className="text-xs text-muted-foreground mt-1">2 expenses approved</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Team Expense History</CardTitle>
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
                {teamExpenses.map((expense) => (
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
                            : "bg-warning/10 text-warning"
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

export default TeamExpenses;
