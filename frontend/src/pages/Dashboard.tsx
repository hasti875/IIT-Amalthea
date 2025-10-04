import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Clock, CheckCircle } from "lucide-react";

const stats = [
  {
    title: "Total Expenses",
    value: "$45,231.89",
    change: "+20.1% from last month",
    icon: DollarSign,
    color: "text-primary",
  },
  {
    title: "Pending Approvals",
    value: "12",
    change: "3 high priority",
    icon: Clock,
    color: "text-warning",
  },
  {
    title: "Approved This Month",
    value: "48",
    change: "+12% from last month",
    icon: CheckCircle,
    color: "text-success",
  },
  {
    title: "Active Employees",
    value: "34",
    change: "2 new this week",
    icon: Users,
    color: "text-secondary",
  },
];

const recentExpenses = [
  { id: "EXP-001", employee: "John Doe", amount: "$234.50", category: "Travel", status: "Pending", date: "2024-10-03" },
  { id: "EXP-002", employee: "Jane Smith", amount: "$89.99", category: "Office Supplies", status: "Approved", date: "2024-10-02" },
  { id: "EXP-003", employee: "Bob Johnson", amount: "$450.00", category: "Client Dinner", status: "Pending", date: "2024-10-02" },
  { id: "EXP-004", employee: "Alice Brown", amount: "$125.75", category: "Software", status: "Rejected", date: "2024-10-01" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your expense management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-card hover:shadow-elevated transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
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
                {recentExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{expense.id}</td>
                    <td className="py-3 px-4">{expense.employee}</td>
                    <td className="py-3 px-4 font-semibold">{expense.amount}</td>
                    <td className="py-3 px-4">{expense.category}</td>
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

export default Dashboard;
