import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard, Users, School, BookOpen, 
  ClipboardList, Bell, LogOut, Settings, UserCheck, UserPlus,
  Shield, Megaphone, BarChart3, CreditCard, TrendingUp, Image, Clock, FileText,
  Menu, X, ChevronLeft, AlertCircle, UserX, FileCheck, CalendarCheck, Calendar,
  Award, ChevronDown, GraduationCap, Library, FileBarChart
} from "lucide-react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import SessionSelector from "./SessionSelector";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

interface SidebarItem {
  icon: typeof LayoutDashboard;
  label: string;
  link?: string;
  children?: { label: string; link: string }[];
}

// Sidebar navigation items - Legacy VB6-style modules
const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", link: "/admin/dashboard" },
  { icon: Users, label: "Students", link: "/admin/students" },
  { icon: School, label: "Classes", link: "/admin/classes" },
  { icon: Library, label: "Subjects", link: "/admin/subjects" },
  { icon: CalendarCheck, label: "Attendance", link: "/admin/attendance" },
  { icon: GraduationCap, label: "Exams", link: "/admin/exams" },
  { 
    icon: Award, 
    label: "Certificates", 
    children: [
      { label: "Certificate of Participation", link: "/admin/certificates?type=participation" },
      { label: "Appreciation & Character", link: "/admin/certificates?type=appreciation" },
      { label: "Date of Birth Certificate", link: "/admin/certificates?type=dob" },
      { label: "Honor Certificate", link: "/admin/certificates?type=honor" },
      { label: "Sports Certificate", link: "/admin/certificates?type=sports" },
      { label: "Staff Experience Certificate", link: "/admin/certificates?type=experience" },
      { label: "Detailed Marks Certificate", link: "/admin/certificates?type=marks" },
      { label: "Monthly Progress Report", link: "/admin/certificates?type=monthly-progress" },
      { label: "Annual Progress Report", link: "/admin/certificates?type=annual-progress" },
      { label: "School Leaving Certificate", link: "/admin/certificates?type=slc" },
    ]
  },
  { 
    icon: FileBarChart, 
    label: "Reports", 
    children: [
      { label: "Gazette", link: "/admin/reports-module?type=gazette" },
      { label: "DMC", link: "/admin/reports-module?type=dmc" },
      { label: "Position List", link: "/admin/reports-module?type=position" },
      { label: "Exam Timetable", link: "/admin/reports-module?type=timetable" },
      { label: "Award Lists", link: "/admin/reports-module?type=awards" },
      { label: "Student Contacts", link: "/admin/reports-module?type=contacts" },
    ]
  },
  { icon: CreditCard, label: "Fees", link: "/admin/fees" },
  { icon: Calendar, label: "Sessions", link: "/admin/sessions" },
  { icon: Image, label: "Gallery", link: "/admin/gallery" },
  { icon: Clock, label: "Timetable", link: "/admin/timetable" },
  { icon: Shield, label: "Administrator", link: "/admin/settings" },
];

interface Notification {
  id: string;
  title: string;
  icon: typeof AlertCircle;
  color: string;
  link: string;
}

const AdminLayout = ({ children, title, description }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Session timeout - only active if not using "remember me"
  const isSessionOnly = !localStorage.getItem('rememberMe');
  useSessionTimeout({ enabled: isSessionOnly });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [admissionsRes, attendanceRes] = await Promise.all([
      supabase.from("admissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("attendance").select("status").eq("date", today).eq("status", "absent"),
    ]);

    const newNotifications: Notification[] = [];
    
    if (admissionsRes.count && admissionsRes.count > 0) {
      newNotifications.push({
        id: "pending-admissions",
        title: `${admissionsRes.count} pending admission(s)`,
        icon: FileCheck,
        color: "text-warning",
        link: "/admin/admissions"
      });
    }

    const absentCount = attendanceRes.data?.length || 0;
    if (absentCount > 0) {
      newNotifications.push({
        id: "absent-students",
        title: `${absentCount} student(s) absent today`,
        icon: UserX,
        color: "text-destructive",
        link: "/admin/attendance"
      });
    }

    setNotifications(newNotifications);
  };

  const handleSignOut = async () => {
    // Sign out with global scope to clear all sessions
    await supabase.auth.signOut({ scope: 'global' });
    // Navigate to staff login with logout flag to prevent auto-login
    navigate("/staff-login?logout=true", { replace: true });
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
                src="/images/school-logo.png" 
                alt="The Suffah Public School & College" 
                className="w-10 h-10 rounded-full object-cover shadow-md"
              />
              <div className="hidden sm:block">
                <h1 className="font-heading text-lg font-bold">The Suffah</h1>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <SessionSelector />
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative nav-btn-hover">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border">
                  <h4 className="font-semibold">Notifications</h4>
                  <p className="text-xs text-muted-foreground">
                    {notifications.length > 0 ? `${notifications.length} item(s) need attention` : "No new notifications"}
                  </p>
                </div>
                <ScrollArea className="max-h-64">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      All caught up! No pending notifications.
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            setNotificationOpen(false);
                            navigate(notification.link);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                        >
                          <notification.icon className={`w-5 h-5 flex-shrink-0 ${notification.color}`} />
                          <span className="text-sm">{notification.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
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
              const isActive = item.link ? location.pathname === item.link : 
                item.children?.some(child => location.pathname + location.search === child.link);
              const isCertificatesOpen = item.children && location.pathname.includes('/admin/certificates');
              
              // Items with children (collapsible)
              if (item.children) {
                return (
                  <Collapsible key={item.label} defaultOpen={isCertificatesOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={`sidebar-item w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        } ${!sidebarOpen && 'lg:justify-center lg:px-2'}`}
                        title={!sidebarOpen ? item.label : undefined}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className={`font-medium whitespace-nowrap flex-1 text-left ${!sidebarOpen && 'lg:hidden'}`}>
                          {item.label}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${!sidebarOpen && 'lg:hidden'}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className={`${!sidebarOpen && 'lg:hidden'}`}>
                      <div className="ml-4 pl-4 border-l border-border space-y-1 mt-1">
                        {item.children.map((child) => {
                          const isChildActive = location.pathname + location.search === child.link;
                          return (
                            <Link
                              key={child.link}
                              to={child.link}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                                isChildActive 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              // Regular items
              return (
                <Link
                  key={item.link}
                  to={item.link!}
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
