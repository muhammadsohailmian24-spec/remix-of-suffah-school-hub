import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Upload, Image, Eye, EyeOff, GripVertical } from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
}

const GalleryManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Add dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);

  // Edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState<GalleryImage | null>(null);

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

    fetchImages();
  };

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setImages(data);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isReplace = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Error", description: "Image size must be less than 10MB", variant: "destructive" });
        return;
      }
      if (isReplace) {
        setReplaceFile(file);
      } else {
        setSelectedFile(file);
      }
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    
    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("gallery")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAdd = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select an image", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const imageUrl = await uploadImage(selectedFile);
      setUploadProgress(60);

      if (!imageUrl) throw new Error("Failed to upload image");

      const { error } = await supabase.from("gallery").insert({
        image_url: imageUrl,
        description: description || null,
        display_order: displayOrder,
        is_visible: true,
      });

      if (error) throw error;

      setUploadProgress(100);
      toast({ title: "Success", description: "Image added to gallery" });
      setIsAddOpen(false);
      resetAddForm();
      fetchImages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add image", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = async () => {
    if (!editingImage) return;

    setUploading(true);
    setUploadProgress(20);

    try {
      let imageUrl = editingImage.image_url;

      if (replaceFile) {
        // Delete old image from storage
        const oldFileName = editingImage.image_url.split("/").pop();
        if (oldFileName) {
          await supabase.storage.from("gallery").remove([oldFileName]);
        }

        // Upload new image
        const newUrl = await uploadImage(replaceFile);
        if (newUrl) imageUrl = newUrl;
        setUploadProgress(60);
      }

      const { error } = await supabase
        .from("gallery")
        .update({
          image_url: imageUrl,
          description: editDescription || null,
          display_order: editDisplayOrder,
        })
        .eq("id", editingImage.id);

      if (error) throw error;

      setUploadProgress(100);
      toast({ title: "Success", description: "Image updated" });
      setIsEditOpen(false);
      setEditingImage(null);
      setReplaceFile(null);
      fetchImages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!deletingImage) return;

    try {
      // Delete from storage
      const fileName = deletingImage.image_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("gallery").remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from("gallery")
        .delete()
        .eq("id", deletingImage.id);

      if (error) throw error;

      toast({ title: "Success", description: "Image deleted" });
      setIsDeleteOpen(false);
      setDeletingImage(null);
      fetchImages();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const toggleVisibility = async (image: GalleryImage) => {
    const { error } = await supabase
      .from("gallery")
      .update({ is_visible: !image.is_visible })
      .eq("id", image.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update visibility", variant: "destructive" });
    } else {
      fetchImages();
    }
  };

  const resetAddForm = () => {
    setSelectedFile(null);
    setDescription("");
    setDisplayOrder(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditDialog = (image: GalleryImage) => {
    setEditingImage(image);
    setEditDescription(image.description || "");
    setEditDisplayOrder(image.display_order);
    setReplaceFile(null);
    setIsEditOpen(true);
  };

  return (
    <AdminLayout title="Gallery Management" description="Manage images displayed on the landing page">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 hero-gradient text-primary-foreground">
                <Plus className="w-4 h-4" /> Add Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Gallery Image</DialogTitle>
                <DialogDescription>Upload a new image to the gallery</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e)}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <Image className="w-8 h-8 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to select an image</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP (max 10MB)</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Describe this image..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={uploading || !selectedFile} className="hero-gradient text-primary-foreground">
                  {uploading ? "Uploading..." : "Add Image"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gallery Images ({images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : images.length === 0 ? (
              <div className="p-8 text-center">
                <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No images in gallery</p>
                <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                  Add Your First Image
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Order</TableHead>
                    <TableHead className="w-24">Preview</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Visibility</TableHead>
                    <TableHead className="w-32">Date Added</TableHead>
                    <TableHead className="text-right w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          {image.display_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={image.image_url}
                          alt={image.description || "Gallery"}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">
                          {image.description || <span className="text-muted-foreground italic">No description</span>}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisibility(image)}
                          className={image.is_visible ? "text-green-600" : "text-muted-foreground"}
                        >
                          {image.is_visible ? (
                            <><Eye className="w-4 h-4 mr-1" /> Visible</>
                          ) : (
                            <><EyeOff className="w-4 h-4 mr-1" /> Hidden</>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(image)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingImage(image);
                              setIsDeleteOpen(true);
                            }}
                          >
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gallery Image</DialogTitle>
            <DialogDescription>Update image details or replace the image</DialogDescription>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Image</Label>
                <div className="relative">
                  <img
                    src={replaceFile ? URL.createObjectURL(replaceFile) : editingImage.image_url}
                    alt="Current"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => replaceFileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Replace
                  </Button>
                  <input
                    ref={replaceFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, true)}
                    className="hidden"
                  />
                </div>
                {replaceFile && (
                  <p className="text-sm text-primary">New image: {replaceFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">Updating... {uploadProgress}%</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={uploading}>
              {uploading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingImage && (
            <div className="flex justify-center">
              <img
                src={deletingImage.image_url}
                alt="To delete"
                className="w-32 h-32 object-cover rounded-lg"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default GalleryManagement;
