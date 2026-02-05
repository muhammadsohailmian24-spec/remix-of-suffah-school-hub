import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, FileText, Image, Trash2, Download, Eye, Loader2, Plus, X, File } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  notes: string | null;
  created_at: string;
}

interface StudentDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

const DOCUMENT_TYPES = [
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "father_cnic", label: "Father's CNIC Copy" },
  { value: "mother_cnic", label: "Mother's CNIC Copy" },
  { value: "form_b", label: "Form B (Child Registration)" },
  { value: "leaving_certificate", label: "Previous School Leaving Certificate" },
  { value: "medical_certificate", label: "Medical Certificate" },
  { value: "passport_photos", label: "Passport Size Photos" },
  { value: "character_certificate", label: "Character Certificate" },
  { value: "other", label: "Other" },
];

const StudentDocumentsDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentDocumentsDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<StudentDocument | null>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (open && studentId) {
      fetchDocuments();
    }
  }, [open, studentId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid file", description: "Only PDF, JPG, and PNG files are allowed", variant: "destructive" });
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast({ title: "Error", description: "Please select a file and document type", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${studentId}/${documentType}_${timestamp}.${fileExt}`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(filePath, selectedFile, { upsert: false });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Save to database
      const { error: dbError } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          document_type: documentType,
          document_name: selectedFile.name,
          file_path: filePath,
          notes: notes || null,
          uploaded_by: session.user.id,
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({ title: "Success", description: "Document uploaded successfully" });
      resetUploadForm();
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setDocumentType("");
    setNotes("");
    setShowUploadForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePreview = async (doc: StudentDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(doc.file_path, 3600); // 1 hour

      if (error) throw error;

      const fileExt = doc.file_path.split('.').pop()?.toLowerCase();
      if (fileExt === "pdf") {
        setPreviewType("pdf");
      } else {
        setPreviewType("image");
      }
      setPreviewUrl(data.signedUrl);
      setPreviewOpen(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDownload = async (doc: StudentDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;

      // Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = doc.document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("student-documents")
        .remove([documentToDelete.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("student_documents")
        .delete()
        .eq("id", documentToDelete.id);

      if (dbError) throw dbError;

      toast({ title: "Deleted", description: "Document deleted successfully" });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-8 h-8 text-destructive" />;
    if (["jpg", "jpeg", "png"].includes(ext || "")) return <Image className="w-8 h-8 text-primary" />;
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Student Documents</DialogTitle>
            <DialogDescription>
              Manage documents for {studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Upload Form */}
            {showUploadForm ? (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Upload New Document</h4>
                    <Button variant="ghost" size="icon" onClick={resetUploadForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Document Type *</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>File *</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes about this document..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}

                  {uploading && (
                    <Progress value={uploadProgress} className="w-full" />
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetUploadForm} disabled={uploading}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={uploading || !selectedFile || !documentType}>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setShowUploadForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Upload New Document
              </Button>
            )}

            {/* Documents List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                          {getFileIcon(doc.document_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{getDocumentTypeLabel(doc.document_type)}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {doc.notes && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">{doc.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => { setDocumentToDelete(doc); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewType === "pdf" && previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] border rounded"
                title="PDF Preview"
              />
            )}
            {previewType === "image" && previewUrl && (
              <img
                src={previewUrl}
                alt="Document Preview"
                className="max-w-full max-h-[70vh] mx-auto object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{documentToDelete?.document_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StudentDocumentsDialog;
