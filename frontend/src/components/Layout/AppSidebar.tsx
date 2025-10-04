import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  Settings,
  Receipt,
  UserCog,
  Shield,
  Crown,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

// Admin has access to everything
const adminItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Expenses", url: "/my-expenses", icon: Receipt },
  { title: "Submit Expense", url: "/submit-expense", icon: FileText },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Team Expenses", url: "/team-expenses", icon: Users },
  { title: "Employees", url: "/employees", icon: UserCog },
  { title: "All Expenses", url: "/all-expenses", icon: TrendingUp },
  { title: "Approval Rules", url: "/approval-rules", icon: Settings },
];

// Manager can approve and see team expenses
const managerItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Expenses", url: "/my-expenses", icon: Receipt },
  { title: "Submit Expense", url: "/submit-expense", icon: FileText },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Team Expenses", url: "/team-expenses", icon: Users },
];

// Employee can only manage their own expenses
const employeeItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Expenses", url: "/my-expenses", icon: Receipt },
  { title: "Submit Expense", url: "/submit-expense", icon: FileText },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { role, user } = useAuth();
  const currentPath = location.pathname;

  const getNavCls = (path: string) =>
    currentPath === path
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50";

  const getRoleIcon = (userRole: string | null) => {
    switch (userRole) {
      case 'admin':
        return <Crown className="h-3 w-3 text-red-500" />;
      case 'manager':
        return <Shield className="h-3 w-3 text-blue-500" />;
      case 'employee':
        return <Briefcase className="h-3 w-3 text-green-500" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getRoleColor = (userRole: string | null) => {
    switch (userRole) {
      case 'admin':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'manager':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'employee':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get items based on role
  const getNavigationItems = () => {
    switch (role) {
      case 'admin':
        return adminItems;
      case 'manager':
        return managerItems;
      case 'employee':
        return employeeItems;
      default:
        return employeeItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <h2 className={`font-bold ${open ? "text-lg" : "text-xs"}`}>
            {open ? "ExpenseFlow" : "EF"}
          </h2>
          {open && user && (
            <div className="mt-2">
              <div className="text-xs text-sidebar-foreground/70 mb-1">
                {user.firstName} {user.lastName}
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
                {getRoleIcon(role)}
                <span className="capitalize">{role}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            {role === 'admin' ? 'Administration' : 
             role === 'manager' ? 'Management' : 'Employee'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="h-5 w-5" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}