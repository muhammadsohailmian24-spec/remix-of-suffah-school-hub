import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const AVAILABLE_PERMISSIONS = [
  { id: "dashboard.view", label: "View Dashboard", module: "Dashboard" },
  { id: "students.view", label: "View Students", module: "Students" },
  { id: "students.create", label: "Create Students", module: "Students" },
  { id: "students.edit", label: "Edit Students", module: "Students" },
  { id: "students.delete", label: "Delete Students", module: "Students" },
  { id: "teachers.view", label: "View Teachers", module: "Teachers" },
  { id: "teachers.create", label: "Create Teachers", module: "Teachers" },
  { id: "teachers.edit", label: "Edit Teachers", module: "Teachers" },
  { id: "attendance.view", label: "View Attendance", module: "Attendance" },
  { id: "attendance.mark", label: "Mark Attendance", module: "Attendance" },
  { id: "results.view", label: "View Results", module: "Results" },
  { id: "results.publish", label: "Publish Results", module: "Results" },
  { id: "announcements.view", label: "View Announcements", module: "Announcements" },
  { id: "announcements.create", label: "Create Announcements", module: "Announcements" },
  { id: "settings.view", label: "View Settings", module: "Settings" },
  { id: "settings.edit", label: "Edit Settings", module: "Settings" },
];

const RolesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  // Default roles (these would typically come from database)
  const defaultRoles: Role[] = [
    {
      id: "admin",
      name: "Administrator",
      description: "Full system access",
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
      userCount: 2,
    },
    {
      id: "teacher",
      name: "Teacher",
      description: "Teaching and grading access",
      permissions: ["dashboard.view", "students.view", "attendance.view", "attendance.mark", "results.view", "results.publish", "announcements.view"],
      userCount: 15,
    },
    {
      id: "student",
      name: "Student",
      description: "Student portal access",
      permissions: ["dashboard.view", "attendance.view", "results.view", "announcements.view"],
      userCount: 150,
    },
    {
      id: "parent",
      name: "Parent",
      description: "Parent portal access",
      permissions: ["dashboard.view", "attendance.view", "results.view", "announcements.view"],
      userCount: 120,
    },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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

    // Fetch user counts for roles
    const [adminCount, teacherCount, studentCount, parentCount] = await Promise.all([
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "parent"),
    ]);

    const updatedRoles = defaultRoles.map(role => {
      if (role.id === "admin") return { ...role, userCount: adminCount.count || 0 };
      if (role.id === "teacher") return { ...role, userCount: teacherCount.count || 0 };
      if (role.id === "student") return { ...role, userCount: studentCount.count || 0 };
      if (role.id === "parent") return { ...role, userCount: parentCount.count || 0 };
      return role;
    });

    setRoles(updatedRoles);
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRole) {
      setRoles(prev => prev.map(r => 
        r.id === editingRole.id 
          ? { ...r, name: formData.name, description: formData.description, permissions: formData.permissions }
          : r
      ));
      toast({ title: "Success", description: "Role updated" });
    } else {
      const newRole: Role = {
        id: formData.name.toLowerCase().replace(/\s+/g, "-"),
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        userCount: 0,
      };
      setRoles(prev => [...prev, newRole]);
      toast({ title: "Success", description: "Role created" });
    }

    setIsDialogOpen(false);
    setEditingRole(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (["admin", "teacher", "student", "parent"].includes(id)) {
      toast({ title: "Error", description: "Cannot delete system roles", variant: "destructive" });
      return;
    }
    if (!confirm("Delete this role?")) return;
    setRoles(prev => prev.filter(r => r.id !== id));
    toast({ title: "Success", description: "Role deleted" });
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", permissions: [] });
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <AdminLayout title="Roles & Permissions" description="Manage user roles and access control">
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={(o) => {
          setIsDialogOpen(o);
          if (!o) { setEditingRole(null); resetForm(); }
        }}>
          <DialogTrigger asChild>
            <Button className="hero-gradient text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit" : "Create"} Role</DialogTitle>
              <DialogDescription>Define role permissions</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    required
                    disabled={editingRole && ["admin", "teacher", "student", "parent"].includes(editingRole.id)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Permissions
                </Label>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <Card key={module}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{module}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-2">
                        {perms.map(perm => (
                          <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={formData.permissions.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <span className="text-sm">{perm.label}</span>
                          </label>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" className="hero-gradient text-primary-foreground">
                  {editingRole ? "Update" : "Create"} Role
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="font-medium">{role.name}</span>
                        {["admin", "teacher", "student", "parent"].includes(role.id) && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{role.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{role.userCount} users</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {role.permissions.length} permissions
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(role)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!["admin", "teacher", "student", "parent"].includes(role.id) && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(role.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
    </AdminLayout>
  );
};

export default RolesManagement;
