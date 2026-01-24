import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Award, FileText, Printer, Search, GraduationCap, Medal, ScrollText } from "lucide-react";

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
  { id: "character", label: "Character Certificate", icon: Award, description: "Good character and conduct certificate" },
  { id: "bonafide", label: "Bonafide Certificate", icon: ScrollText, description: "Student enrollment verification" },
  { id: "slc", label: "School Leaving Certificate", icon: GraduationCap, description: "Transfer/leaving certificate" },
  { id: "achievement", label: "Achievement Certificate", icon: Medal, description: "Academic achievement award" },
];

const Certificates = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCertType, setSelectedCertType] = useState("character");
  const [loading, setLoading] = useState(true);

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
    
    // First get students
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select(`
        id,
        student_id,
        class_id,
        user_id,
        father_name,
        classes(name, section)
      `)
      .eq("class_id", selectedClass)
      .eq("status", "active")
      .order("student_id");

    if (studentsError) {
      toast.error("Failed to load students");
      setLoading(false);
      return;
    }

    // Then get profiles for those students
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

    // Merge the data
    const mergedStudents = studentsData.map(student => ({
      ...student,
      profiles: profilesData?.find(p => p.user_id === student.user_id) || null
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

    // For now, show a toast - actual PDF generation would be implemented here
    toast.success(`Generating ${certificateTypes.find(c => c.id === selectedCertType)?.label} for ${selectedStudent.profiles?.full_name}`);
    
    // TODO: Implement actual certificate PDF generation using the existing PDF utilities
  };

  return (
    <AdminLayout 
      title="Certificates" 
      description="Generate and print student certificates"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Student Selection Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Student</CardTitle>
              <CardDescription>Choose class and student</CardDescription>
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

        {/* Certificate Selection Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Certificate Type</CardTitle>
              <CardDescription>Select certificate type and print</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedCertType} onValueChange={setSelectedCertType}>
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 mb-6">
                  {certificateTypes.map((cert) => (
                    <TabsTrigger key={cert.id} value={cert.id} className="gap-2">
                      <cert.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{cert.label.split(" ")[0]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {certificateTypes.map((cert) => (
                  <TabsContent key={cert.id} value={cert.id}>
                    <Card className="border-dashed">
                      <CardContent className="pt-6">
                        <div className="text-center mb-6">
                          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <cert.icon className="w-10 h-10 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">{cert.label}</h3>
                          <p className="text-muted-foreground">{cert.description}</p>
                        </div>

                        {selectedStudent ? (
                          <div className="bg-accent/50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-center">
                              Certificate will be generated for:{" "}
                              <span className="font-bold">{selectedStudent.profiles?.full_name}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
                            <p className="text-sm text-center text-warning">
                              Please select a student from the left panel
                            </p>
                          </div>
                        )}

                        <div className="flex gap-3 justify-center">
                          <Button
                            size="lg"
                            onClick={handlePrintCertificate}
                            disabled={!selectedStudent}
                            className="gap-2"
                          >
                            <Printer className="w-5 h-5" />
                            Print Certificate
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={handlePrintCertificate}
                            disabled={!selectedStudent}
                            className="gap-2"
                          >
                            <FileText className="w-5 h-5" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Certificates;
