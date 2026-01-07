import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, School, BookOpen, 
  ClipboardList, Bell, LogOut, Settings, UserCheck, UserPlus,
  Shield, Megaphone, BarChart3, CreditCard, TrendingUp, Image, Clock, FileText,
  Menu, X, ChevronLeft
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
  { icon: FileText, label: "Exams", link: "/admin/exams" },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex sidebar-toggle-btn"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden sidebar-toggle-btn"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <img 
                src="/images/school-logo.jpg" 
                alt="The Suffah Public School & College" 
                className="w-10 h-10 rounded-full object-cover shadow-md"
              />
              <div className="hidden sm:block">
                <h1 className="font-heading text-lg font-bold">The Suffah</h1>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative nav-btn-hover">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 nav-btn-hover">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-[73px] left-0 z-50 h-[calc(100vh-73px)] border-r border-border bg-card
          transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'lg:w-16'}
        `}>
          <nav className="p-2 space-y-1 overflow-y-auto h-full">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.link;
              return (
                <Link
                  key={item.link}
                  to={item.link}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  } ${!sidebarOpen && 'lg:justify-center lg:px-2'}`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className={`font-medium whitespace-nowrap ${!sidebarOpen && 'lg:hidden'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-6 lg:p-8 transition-all duration-300`}>
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
