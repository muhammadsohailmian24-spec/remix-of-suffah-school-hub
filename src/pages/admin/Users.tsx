import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GraduationCap, Users, School, BookOpen, ClipboardList, 
  Bell, LogOut, Search, Plus, MoreHorizontal, Eye,
  CheckCircle, XCircle, Clock, UserPlus, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Admission {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applying_for_class: number;
  status: string;
  created_at: string;
  parent_name: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || (roleData as any).role !== "admin") {
      navigate("/dashboard");
      return;
    }

    fetchAdmissions();
  };

  const fetchAdmissions = async () => {
    const { data, error } = await supabase
      .from("admissions" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAdmissions(data as unknown as Admission[]);
    }
    setLoading(false);
  };

  const updateAdmissionStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("admissions" as any)
      .update({ status } as any)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Application ${status}`,
      });
      fetchAdmissions();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "under_review":
        return <Badge variant="outline" className="bg-info/10 text-info border-info/20"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAdmissions = admissions.filter(admission => {
    const matchesSearch = admission.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         admission.applicant_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || admission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold">The Suffah</h1>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <GraduationCap className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link to="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground">
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </Link>
            <Link to="/admin/classes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <School className="w-5 h-5" />
              <span className="font-medium">Classes</span>
            </Link>
            <Link to="/admin/subjects" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Subjects</span>
            </Link>
            <Link to="/admin/admissions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ClipboardList className="w-5 h-5" />
              <span className="font-medium">Admissions</span>
            </Link>
            <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Admission Applications</h1>
            <p className="text-muted-foreground">Review and manage admission applications</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Applications", value: admissions.length, icon: ClipboardList, color: "text-primary" },
              { label: "Pending", value: admissions.filter(a => a.status === "pending").length, icon: Clock, color: "text-warning" },
              { label: "Approved", value: admissions.filter(a => a.status === "approved").length, icon: CheckCircle, color: "text-success" },
              { label: "Rejected", value: admissions.filter(a => a.status === "rejected").length, icon: XCircle, color: "text-destructive" },
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading applications...</p>
                </div>
              ) : filteredAdmissions.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No applications found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmissions.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{admission.applicant_name}</p>
                            <p className="text-sm text-muted-foreground">{admission.applicant_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>Class {admission.applying_for_class}</TableCell>
                        <TableCell>{admission.parent_name}</TableCell>
                        <TableCell>{new Date(admission.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(admission.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {admission.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateAdmissionStatus(admission.id, "under_review")}
                                >
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90"
                                  onClick={() => updateAdmissionStatus(admission.id, "approved")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateAdmissionStatus(admission.id, "rejected")}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {admission.status === "under_review" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90"
                                  onClick={() => updateAdmissionStatus(admission.id, "approved")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateAdmissionStatus(admission.id, "rejected")}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default AdminUsers;
