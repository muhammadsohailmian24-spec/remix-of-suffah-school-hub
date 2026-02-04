import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { format } from "date-fns";

interface Career {
  id: string;
  title: string;
  department: string | null;
  description: string;
  requirements: string | null;
  location: string | null;
  employment_type: string | null;
  is_active: boolean;
  created_at: string;
}

const CareersManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    description: "",
    requirements: "",
    location: "On-site",
    employment_type: "Full-time",
    is_active: true,
  });

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

    fetchCareers();
  };

  const fetchCareers = async () => {
    const { data, error } = await supabase
      .from("careers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setCareers(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const payload = {
      title: formData.title,
      department: formData.department || null,
      description: formData.description,
      requirements: formData.requirements || null,
      location: formData.location,
      employment_type: formData.employment_type,
      is_active: formData.is_active,
      created_by: session?.user.id,
    };

    if (editingCareer) {
      const { error } = await supabase
        .from("careers")
        .update(payload)
        .eq("id", editingCareer.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update position", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Position updated" });
      }
    } else {
      const { error } = await supabase
        .from("careers")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: "Failed to create position", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Position created" });
      }
    }

    setIsDialogOpen(false);
    setEditingCareer(null);
    resetForm();
    fetchCareers();
  };

  const handleToggleActive = async (career: Career) => {
    const { error } = await supabase
      .from("careers")
      .update({ is_active: !career.is_active })
      .eq("id", career.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Success", description: career.is_active ? "Position deactivated" : "Position activated" });
      fetchCareers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this position?")) return;

    const { error } = await supabase.from("careers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Position deleted" });
      fetchCareers();
    }
  };

  const openEditDialog = (career: Career) => {
    setEditingCareer(career);
    setFormData({
      title: career.title,
      department: career.department || "",
      description: career.description,
      requirements: career.requirements || "",
      location: career.location || "On-site",
      employment_type: career.employment_type || "Full-time",
      is_active: career.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      department: "",
      description: "",
      requirements: "",
      location: "On-site",
      employment_type: "Full-time",
      is_active: true,
    });
  };

  const filteredCareers = careers.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Careers" description="Manage career opportunities and job postings">
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={(o) => {
          setIsDialogOpen(o);
          if (!o) { setEditingCareer(null); resetForm(); }
        }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCareer ? "Edit" : "Add"} Position</DialogTitle>
              <DialogDescription>Enter position details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Science Teacher"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. On-site"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={formData.employment_type} onValueChange={(v) => setFormData(p => ({ ...p, employment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.is_active ? "active" : "inactive"} onValueChange={(v) => setFormData(p => ({ ...p, is_active: v === "active" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the role and responsibilities..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Requirements</Label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData(p => ({ ...p, requirements: e.target.value }))}
                  rows={3}
                  placeholder="List qualifications and requirements..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="hero-gradient text-primary-foreground">
                  {editingCareer ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filteredCareers.length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No positions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCareers.map((career) => (
                  <TableRow key={career.id}>
                    <TableCell className="font-medium">{career.title}</TableCell>
                    <TableCell>{career.department || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{career.employment_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={career.is_active ? "default" : "secondary"}>
                        {career.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(career.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleToggleActive(career)}>
                          {career.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(career)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(career.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default CareersManagement;
