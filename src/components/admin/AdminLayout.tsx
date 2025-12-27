import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, LayoutDashboard, Users, School, BookOpen, 
  ClipboardList, Bell, LogOut, Settings, UserCheck, UserPlus,
  CalendarDays, Shield, Megaphone, BarChart3, CreditCard, TrendingUp, Image, Clock
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", link: "/admin/dashboard" },
  { icon: Users, label: "Students", link: "/admin/students" },
  { icon: UserCheck, label: "Teachers", link: "/admin/teachers" },
  { icon: UserPlus, label: "Parents", link: "/admin/parents" },
  { icon: School, label: "Classes", link: "/admin/classes" },
  { icon: BookOpen, label: "Subjects", link: "/admin/subjects" },
  { icon: Clock, label: "Timetable", link: "/admin/timetable" },
  { icon: CreditCard, label: "Fee Management", link: "/admin/fees" },
  { icon: TrendingUp, label: "Fee Analytics", link: "/admin/fee-analytics" },
  { icon: ClipboardList, label: "Admissions", link: "/admin/admissions" },
  { icon: Megaphone, label: "Announcements", link: "/admin/announcements" },
  { icon: Image, label: "Gallery", link: "/admin/gallery" },
  { icon: BarChart3, label: "Reports", link: "/admin/reports" },
  { icon: Shield, label: "Roles", link: "/admin/roles" },
  { icon: Settings, label: "Settings", link: "/admin/settings" },
];

const AdminLayout = ({ children, title, description }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">The Suffah</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.link;
              return (
                <Link
                  key={item.link}
                  to={item.link}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
