import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, CheckCircle, XCircle, Clock, FileText, Mail, Phone, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { format } from "date-fns";

interface Admission {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  date_of_birth: string;
  gender: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  address: string;
  applying_for_class: number;
  previous_school: string | null;
  previous_class: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
}

const AdmissionManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingAdmission, setViewingAdmission] = useState<Admission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") { 
      navigate("/dashboard"); 
      return; 
    }

    await fetchAdmissions();
    setLoading(false);
  };

  const fetchAdmissions = async () => {
    const { data, error } = await supabase
      .from("admissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setAdmissions(data || []);
    }
  };

  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `STU${year}${random}`;
  };

  const handleApprove = async (admission: Admission) => {
    setIsProcessing(true);
    
    try {
      // Update admission status
      const { error: updateError } = await supabase
        .from("admissions")
        .update({ 
          status: "approved",
          review_notes: reviewNotes || null,
        })
        .eq("id", admission.id);

      if (updateError) throw updateError;

      toast({
        title: "Application Approved",
        description: `${admission.applicant_name}'s application has been approved. Student ID: ${generateStudentId()}`,
      });

      setViewingAdmission(null);
      setReviewNotes("");
      fetchAdmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (admission: Admission) => {
    if (!reviewNotes.trim()) {
      toast({
        title: "Review Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("admissions")
        .update({ 
          status: "rejected",
          review_notes: reviewNotes,
        })
        .eq("id", admission.id);

      if (error) throw error;

      toast({
        title: "Application Rejected",
        description: `${admission.applicant_name}'s application has been rejected.`,
      });

      setViewingAdmission(null);
      setReviewNotes("");
      fetchAdmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    }
  };

  const filteredAdmissions = admissions.filter(a => {
    const matchesSearch = a.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.applicant_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: "Total Applications", value: admissions.length, color: "text-primary", icon: FileText },
    { label: "Pending Review", value: admissions.filter(a => a.status === "pending").length, color: "text-warning", icon: Clock },
    { label: "Approved", value: admissions.filter(a => a.status === "approved").length, color: "text-success", icon: CheckCircle },
    { label: "Rejected", value: admissions.filter(a => a.status === "rejected").length, color: "text-destructive", icon: XCircle },
  ];

  return (
    <AdminLayout title="Admission Management" description="Review and manage student admission applications">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
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
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No applications found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Applying For</TableHead>
                  <TableHead>Applied On</TableHead>
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
                        <p className="text-xs text-muted-foreground capitalize">{admission.gender}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {admission.applicant_email}
                        </span>
                        <span className="text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {admission.applicant_phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>Class {admission.applying_for_class}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(admission.created_at), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(admission.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setViewingAdmission(admission);
                          setReviewNotes(admission.review_notes || "");
                        }}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View/Review Dialog */}
      <Dialog open={!!viewingAdmission} onOpenChange={(o) => !o && setViewingAdmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review admission application for {viewingAdmission?.applicant_name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingAdmission && (
            <div className="space-y-6">
              {/* Student Info */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Student Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{viewingAdmission.applicant_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">{format(new Date(viewingAdmission.date_of_birth), "MMMM d, yyyy")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gender</Label>
                    <p className="font-medium capitalize">{viewingAdmission.gender}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Applying For</Label>
                    <p className="font-medium">Class {viewingAdmission.applying_for_class}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewingAdmission.applicant_email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{viewingAdmission.applicant_phone}</p>
                  </div>
                </div>
              </div>

              {/* Parent Info */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Parent/Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{viewingAdmission.parent_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{viewingAdmission.parent_phone}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewingAdmission.parent_email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Address & Previous Education */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Address & Previous Education</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{viewingAdmission.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Previous School</Label>
                      <p className="font-medium">{viewingAdmission.previous_school || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Previous Class</Label>
                      <p className="font-medium">{viewingAdmission.previous_class || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Review Notes</h4>
                <Textarea
                  placeholder="Add notes for this application..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  disabled={viewingAdmission.status !== "pending"}
                />
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                {getStatusBadge(viewingAdmission.status)}
              </div>

              {/* Actions */}
              {viewingAdmission.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleReject(viewingAdmission)}
                    disabled={isProcessing}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                  <Button 
                    onClick={() => handleApprove(viewingAdmission)}
                    disabled={isProcessing}
                    className="gap-2 hero-gradient text-primary-foreground"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdmissionManagement;
