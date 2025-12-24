import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, GraduationCap, BookOpen, Calendar } from "lucide-react";

interface Child {
  id: string;
  student_id: string;
  status: string;
  class_id: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  classes: {
    name: string;
    section: string | null;
    grade_level: number;
  } | null;
}

const ParentChildren = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get parent record
      const { data: parentData } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!parentData) {
        setLoading(false);
        return;
      }

      // Get linked students
      const { data: studentParents } = await supabase
        .from("student_parents")
        .select("student_id")
        .eq("parent_id", parentData.id);

      if (!studentParents || studentParents.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = studentParents.map(sp => sp.student_id);

      const { data: studentsData } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          status,
          class_id,
          user_id
        `)
        .in("id", studentIds);

      if (studentsData) {
        // Fetch profiles and classes separately
        const enrichedChildren = await Promise.all(
          studentsData.map(async (student) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email, avatar_url")
              .eq("user_id", student.user_id)
              .single();

            let classData = null;
            if (student.class_id) {
              const { data: cls } = await supabase
                .from("classes")
                .select("name, section, grade_level")
                .eq("id", student.class_id)
                .single();
              classData = cls;
            }

            return {
              ...student,
              profiles: profile,
              classes: classData,
            };
          })
        );
        setChildren(enrichedChildren as Child[]);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Children</h1>
            <p className="text-muted-foreground">View and manage your children's information</p>
          </div>
        </div>
      </header>

      <main className="p-6">
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Children Linked</h3>
              <p className="text-muted-foreground">
                Contact the school administration to link your children to your account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card key={child.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {child.profiles?.full_name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{child.profiles?.full_name || "Unknown"}</CardTitle>
                      <p className="text-sm text-muted-foreground">ID: {child.student_id}</p>
                      <Badge variant={child.status === "active" ? "default" : "secondary"} className="mt-1">
                        {child.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {child.classes ? `${child.classes.name} ${child.classes.section || ""}` : "Not assigned"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>Grade {child.classes?.grade_level || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/parent/attendance/${child.id}`)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Attendance
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/parent/results/${child.id}`)}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ParentChildren;
