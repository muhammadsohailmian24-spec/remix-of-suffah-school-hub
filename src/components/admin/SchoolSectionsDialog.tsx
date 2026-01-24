import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SchoolSection {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface SchoolSectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSectionsChange?: () => void;
}

const SchoolSectionsDialog = ({ open, onOpenChange, onSectionsChange }: SchoolSectionsDialogProps) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<SchoolSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSection, setEditingSection] = useState<SchoolSection | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (open) {
      fetchSections();
    }
  }, [open]);

  const fetchSections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("school_sections")
      .select("*")
      .order("name");

    if (!error && data) {
      setSections(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Section name is required", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    };

    if (editingSection) {
      const { error } = await supabase
        .from("school_sections")
        .update(payload)
        .eq("id", editingSection.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update section", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Section updated" });
      }
    } else {
      const { error } = await supabase
        .from("school_sections")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: error.message.includes("duplicate") ? "Section already exists" : "Failed to create section", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Section created" });
      }
    }

    setEditingSection(null);
    setFormData({ name: "", description: "" });
    fetchSections();
    onSectionsChange?.();
  };

  const handleEdit = (section: SchoolSection) => {
    setEditingSection(section);
    setFormData({
      name: section.name,
      description: section.description || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    const { error } = await supabase
      .from("school_sections")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Cannot delete section. It may be in use.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Section deleted" });
      fetchSections();
      onSectionsChange?.();
    }
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage School Sections</DialogTitle>
          <DialogDescription>
            Add or edit school sections (e.g., Main, J&G, Akhundabad)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Section Name"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <Button type="submit" className="gap-1">
            <Plus className="w-4 h-4" />
            {editingSection ? "Update" : "Add"}
          </Button>
          {editingSection && (
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </form>

        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : sections.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No sections found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell className="text-muted-foreground">{section.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(section)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(section.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolSectionsDialog;
