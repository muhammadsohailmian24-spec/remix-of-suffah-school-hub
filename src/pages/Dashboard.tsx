import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, Users, BookOpen, Calendar, Bell, 
  LogOut, LayoutDashboard, FileText, ClipboardList,
  TrendingUp, Clock, Award, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      if (profileData) setProfile(profileData);

      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      if (roleData) setUserRole(roleData.role);
      
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
          { icon: Users, label: "Manage Users", desc: "Add or edit users", color: "bg-primary/10 text-primary" },
          { icon: BookOpen, label: "Classes", desc: "Manage classes", color: "bg-info/10 text-info" },
          { icon: ClipboardList, label: "Admissions", desc: "Review applications", color: "bg-warning/10 text-warning" },
          { icon: FileText, label: "Reports", desc: "View reports", color: "bg-success/10 text-success" },
        ];
      case "teacher":
        return [
          { icon: ClipboardList, label: "Attendance", desc: "Mark attendance", color: "bg-primary/10 text-primary" },
          { icon: FileText, label: "Assignments", desc: "Create & grade", color: "bg-info/10 text-info" },
          { icon: Award, label: "Results", desc: "Enter marks", color: "bg-warning/10 text-warning" },
          { icon: BookOpen, label: "Materials", desc: "Upload resources", color: "bg-success/10 text-success" },
        ];
      case "student":
        return [
          { icon: BookOpen, label: "My Courses", desc: "View enrolled courses", color: "bg-primary/10 text-primary" },
          { icon: FileText, label: "Assignments", desc: "View & submit", color: "bg-info/10 text-info" },
          { icon: Award, label: "Results", desc: "Check grades", color: "bg-warning/10 text-warning" },
          { icon: Calendar, label: "Timetable", desc: "View schedule", color: "bg-success/10 text-success" },
        ];
      case "parent":
        return [
          { icon: TrendingUp, label: "Progress", desc: "Academic progress", color: "bg-primary/10 text-primary" },
          { icon: ClipboardList, label: "Attendance", desc: "View attendance", color: "bg-info/10 text-info" },
          { icon: Award, label: "Results", desc: "Check grades", color: "bg-warning/10 text-warning" },
          { icon: MessageSquare, label: "Messages", desc: "Contact teachers", color: "bg-success/10 text-success" },
        ];
      default:
        return [];
    }
  };

  const stats = [
    { icon: BookOpen, value: "6", label: "Subjects", trend: "+2 this semester" },
    { icon: Clock, value: "92%", label: "Attendance", trend: "Last 30 days" },
    { icon: FileText, value: "4", label: "Pending", trend: "Assignments due" },
    { icon: Award, value: "A", label: "Grade", trend: "Current average" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">The Suffah</h1>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-heading text-3xl font-bold">
              Welcome back, {profile?.full_name || "User"}!
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getQuickActions().map((action, i) => (
              <Card key={i} className="card-hover cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className={`w-14 h-14 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">{action.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity & Announcements */}
        <div className="grid md:grid-cols-2 gap-6">
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
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
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
                { title: "Winter Break Schedule", priority: "high" },
                { title: "Sports Day Registration Open", priority: "normal" },
                { title: "Parent-Teacher Meeting", priority: "high" },
              ].map((announcement, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-accent/50">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    announcement.priority === "high" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  }`}>
                    {announcement.priority.toUpperCase()}
                  </div>
                  <p className="text-sm font-medium flex-1">{announcement.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
