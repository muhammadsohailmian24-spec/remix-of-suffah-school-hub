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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string[];
  is_published: boolean;
  created_at: string;
}

const AnnouncementManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    target_audience: ["all"] as string[],
    is_published: true,
  });

  const audienceOptions = [
    { value: "all", label: "Everyone" },
    { value: "students", label: "Students" },
    { value: "teachers", label: "Teachers" },
    { value: "parents", label: "Parents" },
  ];

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

    fetchAnnouncements();
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const payload = {
      title: formData.title,
      content: formData.content,
      priority: formData.priority,
      target_audience: formData.target_audience,
      is_published: formData.is_published,
      author_id: session?.user.id,
    };

    if (editingAnnouncement) {
      const { error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingAnnouncement.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Announcement updated" });
      }
    } else {
      const { error } = await supabase
        .from("announcements")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Announcement created" });
      }
    }

    setIsDialogOpen(false);
    setEditingAnnouncement(null);
    resetForm();
    fetchAnnouncements();
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_published: !announcement.is_published })
      .eq("id", announcement.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Success", description: announcement.is_published ? "Unpublished" : "Published" });
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Announcement deleted" });
      fetchAnnouncements();
    }
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority || "normal",
      target_audience: announcement.target_audience || ["all"],
      is_published: announcement.is_published,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      priority: "normal",
      target_audience: ["all"],
      is_published: true,
    });
  };

  const toggleAudience = (value: string) => {
    setFormData(prev => {
      const current = prev.target_audience;
      if (value === "all") {
        return { ...prev, target_audience: ["all"] };
      }
      const filtered = current.filter(a => a !== "all");
      if (filtered.includes(value)) {
        const updated = filtered.filter(a => a !== value);
        return { ...prev, target_audience: updated.length ? updated : ["all"] };
      }
      return { ...prev, target_audience: [...filtered, value] };
    });
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: "bg-destructive/10 text-destructive",
      normal: "bg-primary/10 text-primary",
      low: "bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={styles[priority] || ""}>{priority}</Badge>;
  };

  return (
    <AdminLayout title="Announcements" description="Create and manage announcements">
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={(o) => {
          setIsDialogOpen(o);
          if (!o) { setEditingAnnouncement(null); resetForm(); }
        }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? "Edit" : "Create"} Announcement</DialogTitle>
              <DialogDescription>Enter announcement details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Publish</Label>
                  <Select value={formData.is_published ? "yes" : "no"} onValueChange={(v) => setFormData(p => ({ ...p, is_published: v === "yes" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Published</SelectItem>
                      <SelectItem value="no">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <div className="flex flex-wrap gap-4">
                  {audienceOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.target_audience.includes(opt.value)}
                        onCheckedChange={() => toggleAudience(opt.value)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="hero-gradient text-primary-foreground">
                  {editingAnnouncement ? "Update" : "Create"}
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
              placeholder="Search announcements..."
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
          ) : filteredAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No announcements found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-xs truncate">{a.title}</TableCell>
                    <TableCell>{getPriorityBadge(a.priority)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {a.target_audience?.map(t => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_published ? "default" : "secondary"}>
                        {a.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleTogglePublish(a)}>
                          {a.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(a)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(a.id)}>
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

export default AnnouncementManagement;
