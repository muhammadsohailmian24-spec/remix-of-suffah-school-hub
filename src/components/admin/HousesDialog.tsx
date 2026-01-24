import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface House {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface HousesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHousesChange?: () => void;
}

const HousesDialog = ({ open, onOpenChange, onHousesChange }: HousesDialogProps) => {
  const { toast } = useToast();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (open) {
      fetchHouses();
    }
  }, [open]);

  const fetchHouses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .order("name");

    if (!error && data) {
      setHouses(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "House name is required", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    };

    if (editingHouse) {
      const { error } = await supabase
        .from("houses")
        .update(payload)
        .eq("id", editingHouse.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update house", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "House updated" });
      }
    } else {
      const { error } = await supabase
        .from("houses")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: error.message.includes("duplicate") ? "House already exists" : "Failed to create house", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "House created" });
      }
    }

    setEditingHouse(null);
    setFormData({ name: "", description: "" });
    fetchHouses();
    onHousesChange?.();
  };

  const handleEdit = (house: House) => {
    setEditingHouse(house);
    setFormData({
      name: house.name,
      description: house.description || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this house?")) return;

    const { error } = await supabase
      .from("houses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Cannot delete house. It may be in use.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "House deleted" });
      fetchHouses();
      onHousesChange?.();
    }
  };

  const cancelEdit = () => {
    setEditingHouse(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Houses</DialogTitle>
          <DialogDescription>
            Add or edit student houses (e.g., IQBAL, QADEER)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="House Name"
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
            {editingHouse ? "Update" : "Add"}
          </Button>
          {editingHouse && (
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </form>

        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : houses.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No houses found</div>
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
                {houses.map((house) => (
                  <TableRow key={house.id}>
                    <TableCell className="font-medium">{house.name}</TableCell>
                    <TableCell className="text-muted-foreground">{house.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(house)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(house.id)}
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

export default HousesDialog;
