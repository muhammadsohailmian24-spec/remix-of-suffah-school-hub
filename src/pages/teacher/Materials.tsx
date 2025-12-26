import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, Bell, LogOut, Plus, FileText, ClipboardList, Award, BookMarked, Upload, Trash2, Download, File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  created_at: string;
  class_id: string;
  subject_id: string;
}

interface ClassData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
}

const TeacherMaterials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || roleData.role !== "teacher") { navigate("/dashboard"); return; }

    const { data: teacherData } = await supabase.from("teachers").select("id").eq("user_id", session.user.id).maybeSingle();
    if (teacherData) setTeacherId(teacherData.id);

    const [classesRes, subjectsRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
    ]);

    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);

    fetchMaterials();
  };

  const fetchMaterials = async () => {
    const { data, error } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
    if (!error && data) setMaterials(data as Material[]);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 50MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      if (!formData.title) {
        setFormData(p => ({ ...p, title: file.name.split('.')[0] }));
      }
    }
  };

  const getFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: 'pdf', doc: 'document', docx: 'document', ppt: 'presentation', pptx: 'presentation',
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', mp4: 'video', mp3: 'audio'
    };
    return typeMap[ext || ''] || 'file';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !teacherId || !formData.class_id || !formData.subject_id) {
      toast({ title: "Error", description: "Please fill all required fields and select a file", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${teacherId}/${Date.now()}_${selectedFile.name}`;
      
      setUploadProgress(30);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      
      setUploadProgress(70);

      // Get signed URL (secure - requires authentication)
      const { data: urlData } = await supabase.storage
        .from('study-materials')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      // Save to database
      const { error: dbError } = await supabase.from("study_materials").insert({
        title: formData.title,
        description: formData.description || null,
        file_url: urlData?.signedUrl || fileName,
        file_type: getFileType(selectedFile.name),
        teacher_id: teacherId,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast({ title: "Success", description: "Material uploaded successfully" });
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", class_id: "", subject_id: "" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchMaterials();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload material", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (material: Material) => {
    if (!confirm("Delete this material?")) return;

    try {
      // Extract file path from URL
      const url = new URL(material.file_url);
      const pathParts = url.pathname.split('/study-materials/');
      if (pathParts[1]) {
        await supabase.storage.from('study-materials').remove([pathParts[1]]);
      }

      await supabase.from("study_materials").delete().eq("id", material.id);
      toast({ title: "Deleted", description: "Material removed" });
      fetchMaterials();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete material", variant: "destructive" });
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getFileIcon = (fileType: string | null) => {
    switch (fileType) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'document': return <FileText className="w-6 h-6 text-blue-500" />;
      case 'presentation': return <FileText className="w-6 h-6 text-orange-500" />;
      case 'image': return <FileText className="w-6 h-6 text-green-500" />;
      case 'video': return <FileText className="w-6 h-6 text-purple-500" />;
      default: return <File className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div><h1 className="font-heading text-lg font-bold">The Suffah</h1><p className="text-xs text-muted-foreground">Teacher Portal</p></div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2"><LogOut className="w-4 h-4" />Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><GraduationCap className="w-5 h-5" />Dashboard</Link>
            <Link to="/teacher/attendance" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><ClipboardList className="w-5 h-5" />Attendance</Link>
            <Link to="/teacher/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/teacher/results" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/teacher/materials" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><BookMarked className="w-5 h-5" />Materials</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Study Materials</h1>
              <p className="text-muted-foreground">Upload and manage learning resources</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="hero-gradient text-primary-foreground gap-2"><Upload className="w-4 h-4" />Upload Material</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload Study Material</DialogTitle>
                  <DialogDescription>Add a new learning resource for students</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>File *</Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mp3"
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Click to select a file</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, Word, PowerPoint, Images, Video (max 50MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input placeholder="e.g., Chapter 1 Notes" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Class *</Label>
                      <Select value={formData.class_id} onValueChange={(v) => setFormData(p => ({ ...p, class_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select value={formData.subject_id} onValueChange={(v) => setFormData(p => ({ ...p, subject_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={uploading || !selectedFile} className="hero-gradient text-primary-foreground">
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : materials.length === 0 ? (
              <div className="col-span-full p-8 text-center">
                <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No materials uploaded yet</p>
              </div>
            ) : (
              materials.map((material) => (
                <Card key={material.id} className="card-hover group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {getFileIcon(material.file_type)}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(material)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg mt-2">{material.title}</CardTitle>
                    <CardDescription>{material.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(material.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-1" />View
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherMaterials;
