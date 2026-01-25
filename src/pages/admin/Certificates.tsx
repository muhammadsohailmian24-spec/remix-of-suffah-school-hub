import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Award, FileText, Printer, Search, GraduationCap, Medal, ScrollText, Trophy, Heart, Calendar, Star, Briefcase } from "lucide-react";

interface Student {
  id: string;
  student_id: string;
  class_id: string | null;
  user_id: string;
  father_name: string | null;
  profiles: {
    full_name: string;
    date_of_birth: string | null;
    gender: string | null;
  } | null;
  classes: {
    name: string;
    section: string | null;
  } | null;
}

interface Class {
  id: string;
  name: string;
  section: string | null;
}

const certificateTypes = [
  { id: "participation", label: "Certificate of Participation", icon: Trophy, description: "Event or activity participation" },
  { id: "appreciation", label: "Appreciation & Character", icon: Heart, description: "Good character and conduct certificate" },
  { id: "dob", label: "Date of Birth Certificate", icon: Calendar, description: "Official date of birth verification" },
  { id: "honor", label: "Honor Certificate", icon: Star, description: "Academic excellence award" },
  { id: "sports", label: "Sports Certificate", icon: Medal, description: "Sports achievement certificate" },
  { id: "experience", label: "Staff Experience Certificate", icon: Briefcase, description: "Teacher/Staff work experience" },
  { id: "marks", label: "Detailed Marks Certificate", icon: FileText, description: "Complete marks breakdown" },
  { id: "monthly-progress", label: "Monthly Progress Report", icon: ScrollText, description: "Monthly academic progress" },
  { id: "annual-progress", label: "Annual Progress Report", icon: GraduationCap, description: "Yearly academic performance" },
  { id: "slc", label: "School Leaving Certificate", icon: Award, description: "Transfer/leaving certificate" },
];

const Certificates = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Get certificate type from URL or default to first one
  const certType = searchParams.get("type") || certificateTypes[0].id;
  const currentCert = certificateTypes.find(c => c.id === certType) || certificateTypes[0];

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, section")
      .order("grade_level");

    if (error) {
      toast.error("Failed to load classes");
      return;
    }

    setClasses(data || []);
    setLoading(false);
  };

  const fetchStudents = async () => {
    setLoading(true);
    
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select(`
        id,
        student_id,
        class_id,
        user_id,
        father_name
      `)
      .eq("class_id", selectedClass)
      .eq("status", "active")
      .order("student_id");

    if (studentsError) {
      toast.error("Failed to load students");
      setLoading(false);
      return;
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, section")
      .eq("id", selectedClass)
      .single();

    const userIds = studentsData?.map(s => s.user_id) || [];
    if (userIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, date_of_birth, gender")
      .in("user_id", userIds);

    const mergedStudents = studentsData.map(student => ({
      ...student,
      profiles: profilesData?.find(p => p.user_id === student.user_id) || null,
      classes: classData || null
    })) as Student[];

    setStudents(mergedStudents);
    setLoading(false);
  };

  const filteredStudents = students.filter((student) => {
    const name = student.profiles?.full_name?.toLowerCase() || "";
    const id = student.student_id.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  const handlePrintCertificate = () => {
    if (!selectedStudent) {
      toast.error("Please select a student first");
      return;
    }

    toast.success(`Generating ${currentCert.label} for ${selectedStudent.profiles?.full_name}`);
    // TODO: Implement actual certificate PDF generation
  };

  return (
    <AdminLayout 
      title={currentCert.label}
      description={currentCert.description}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Student Selection Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Student</CardTitle>
              <CardDescription>Search by name or ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `- ${cls.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <div>
                  <Label>Search Student</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              {selectedClass && (
                <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No students found</div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          selectedStudent?.id === student.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="font-medium text-sm">{student.profiles?.full_name}</div>
                        <div className="text-xs opacity-70">{student.student_id}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Student Info */}
          {selectedStudent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Selected Student</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedStudent.profiles?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-medium">{selectedStudent.student_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Father:</span>
                    <span className="font-medium">{selectedStudent.father_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class:</span>
                    <span className="font-medium">
                      {selectedStudent.classes?.name} {selectedStudent.classes?.section ? `- ${selectedStudent.classes.section}` : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Certificate Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <currentCert.icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle>{currentCert.label}</CardTitle>
                  <CardDescription>{currentCert.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedStudent ? (
                <div className="space-y-6">
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm text-center">
                      Certificate will be generated for:{" "}
                      <span className="font-bold">{selectedStudent.profiles?.full_name}</span>
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      size="lg"
                      onClick={handlePrintCertificate}
                      className="gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      Print Certificate
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handlePrintCertificate}
                      className="gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
                  <p className="text-muted-foreground">
                    Choose a class and select a student to generate the certificate
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Certificates;
