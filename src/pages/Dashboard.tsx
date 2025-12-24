import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, Users, BookOpen, Calendar, Bell, 
  LogOut, LayoutDashboard, FileText, ClipboardList,
  TrendingUp, Clock, Award, MessageSquare, Settings,
  UserPlus, School, BookMarked
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>("student");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Get profile using type assertion
      const { data: profileData } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      if (profileData) setProfile(profileData as unknown as Profile);

      // Get role using type assertion
      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      if (roleData) setUserRole((roleData as any).role);
      
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const getRoleBadgeClass = () => {
    switch (userRole) {
      case "admin": return "badge-admin";
      case "teacher": return "badge-teacher";
      case "student": return "badge-student";
      case "parent": return "badge-parent";
      default: return "badge-student";
    }
  };

  const getQuickActions = () => {
    switch (userRole) {
      case "admin":
        return [
          { icon: LayoutDashboard, label: "Admin Dashboard", desc: "Full admin panel", color: "bg-primary/10 text-primary", link: "/admin/dashboard" },
          { icon: Users, label: "Students", desc: "Manage students", color: "bg-info/10 text-info", link: "/admin/students" },
          { icon: ClipboardList, label: "Admissions", desc: "Review applications", color: "bg-warning/10 text-warning", link: "/admin/admissions" },
          { icon: FileText, label: "Reports", desc: "View reports", color: "bg-success/10 text-success", link: "/admin/reports" },
        ];
      case "teacher":
        return [
          { icon: ClipboardList, label: "Attendance", desc: "Mark attendance", color: "bg-primary/10 text-primary", link: "/teacher/attendance" },
          { icon: FileText, label: "Assignments", desc: "Create & grade", color: "bg-info/10 text-info", link: "/teacher/assignments" },
          { icon: Award, label: "Results", desc: "Enter marks", color: "bg-warning/10 text-warning", link: "/teacher/results" },
          { icon: BookMarked, label: "Materials", desc: "Upload resources", color: "bg-success/10 text-success", link: "/teacher/materials" },
        ];
      case "student":
        return [
          { icon: BookOpen, label: "My Courses", desc: "View enrolled courses", color: "bg-primary/10 text-primary", link: "/student/courses" },
          { icon: FileText, label: "Assignments", desc: "View & submit", color: "bg-info/10 text-info", link: "/student/assignments" },
          { icon: Award, label: "Results", desc: "Check grades", color: "bg-warning/10 text-warning", link: "/student/results" },
          { icon: Calendar, label: "Timetable", desc: "View schedule", color: "bg-success/10 text-success", link: "/student/timetable" },
        ];
      case "parent":
        return [
          { icon: Users, label: "Children", desc: "View children", color: "bg-primary/10 text-primary", link: "/parent/children" },
          { icon: Bell, label: "Announcements", desc: "Latest news", color: "bg-info/10 text-info", link: "/parent/announcements" },
          { icon: Award, label: "Results", desc: "Check grades", color: "bg-warning/10 text-warning", link: "/parent/children" },
          { icon: Settings, label: "Notifications", desc: "Preferences", color: "bg-success/10 text-success", link: "/parent/notifications" },
        ];
      default:
        return [];
    }
  };

  const getStats = () => {
    switch (userRole) {
      case "admin":
        return [
          { icon: Users, value: "485", label: "Total Students", trend: "+12 this month" },
          { icon: GraduationCap, value: "52", label: "Teachers", trend: "Active faculty" },
          { icon: School, value: "24", label: "Classes", trend: "All grades" },
          { icon: UserPlus, value: "18", label: "Pending", trend: "Admission requests" },
        ];
      case "teacher":
        return [
          { icon: Users, value: "156", label: "Students", trend: "Across all classes" },
          { icon: BookOpen, value: "4", label: "Subjects", trend: "Teaching this term" },
          { icon: FileText, value: "8", label: "Pending", trend: "Submissions to grade" },
          { icon: Clock, value: "24", label: "Classes", trend: "This week" },
        ];
      case "student":
        return [
          { icon: BookOpen, value: "6", label: "Subjects", trend: "+2 this semester" },
          { icon: Clock, value: "92%", label: "Attendance", trend: "Last 30 days" },
          { icon: FileText, value: "4", label: "Pending", trend: "Assignments due" },
          { icon: Award, value: "A", label: "Grade", trend: "Current average" },
        ];
      case "parent":
        return [
          { icon: Users, value: "2", label: "Children", trend: "Enrolled students" },
          { icon: Clock, value: "94%", label: "Attendance", trend: "Average" },
          { icon: Award, value: "B+", label: "Grade", trend: "Average grade" },
          { icon: Bell, value: "3", label: "Alerts", trend: "Unread" },
        ];
      default:
        return [];
    }
  };

  const getSidebarLinks = () => {
    const baseLinks = [
      { icon: LayoutDashboard, label: "Dashboard", link: "/dashboard", active: true },
      { icon: Bell, label: "Notifications", link: "/notifications" },
    ];
    
    if (userRole === "parent") {
      baseLinks.push({ icon: Settings, label: "Notification Preferences", link: "/parent/notifications", active: false });
    }
    
    baseLinks.push({ icon: Settings, label: "Settings", link: "/settings", active: false });
    
    return baseLinks;
  };

  const sidebarLinks = getSidebarLinks();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold">The Suffah</h1>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="text-sm">
                <p className="font-medium">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </div>
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
          <nav className="p-4 space-y-2">
            {sidebarLinks.map((item, i) => (
              <Link
                key={i}
                to={item.link}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-border">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {userRole} Portal
              </p>
              {getQuickActions().map((action, i) => (
                <Link
                  key={i}
                  to={action.link}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <h1 className="font-heading text-3xl font-bold">
                Welcome back, {profile?.full_name?.split(" ")[0] || "User"}!
              </h1>
              <span className={getRoleBadgeClass()}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
            </div>
            <p className="text-muted-foreground">
              Here's what's happening in your academic world today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {getStats().map((stat, i) => (
              <Card key={i} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="font-heading text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="text-xs text-primary mt-2">{stat.trend}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions - Mobile */}
          <div className="lg:hidden mb-8">
            <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {getQuickActions().map((action, i) => (
                <Link key={i} to={action.link}>
                  <Card className="card-hover cursor-pointer group h-full">
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{action.label}</h3>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity & Announcements */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest actions and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: "Math Assignment Submitted", time: "2 hours ago", type: "success" },
                  { title: "New announcement posted", time: "5 hours ago", type: "info" },
                  { title: "Physics test scheduled", time: "1 day ago", type: "warning" },
                  { title: "Attendance marked", time: "2 days ago", type: "success" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === "success" ? "bg-success" : 
                      activity.type === "warning" ? "bg-warning" : "bg-info"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Announcements
                </CardTitle>
                <CardDescription>Latest news and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: "Winter Break Schedule", priority: "high", date: "Dec 20" },
                  { title: "Sports Day Registration Open", priority: "normal", date: "Dec 18" },
                  { title: "Parent-Teacher Meeting", priority: "high", date: "Dec 15" },
                  { title: "Library Hours Extended", priority: "low", date: "Dec 12" },
                ].map((announcement, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer">
                    <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                      announcement.priority === "high" ? "bg-destructive/10 text-destructive" : 
                      announcement.priority === "low" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {announcement.priority.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{announcement.title}</p>
                      <p className="text-xs text-muted-foreground">{announcement.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
