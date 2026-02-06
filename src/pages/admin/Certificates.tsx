import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, FileText, Printer, Search, GraduationCap, Medal, ScrollText, Trophy, Heart, Calendar, Star, Briefcase, Eye, Download } from "lucide-react";
import {
  generateParticipationCertificate,
  generateAppreciationCertificate,
  generateDOBCertificate,
  generateHonorCertificate,
  generateSportsCertificate,
  generateExperienceCertificate,
  generateMonthlyProgressReport,
  generateAnnualProgressReport,
  generateSLCCertificate,
  ParticipationCertData,
  AppreciationCertData,
  DOBCertData,
  HonorCertData,
  SportsCertData,
  ExperienceCertData,
  MonthlyProgressData,
  AnnualProgressData,
  SLCData,
} from "@/utils/generateCertificatesPdf";
import { downloadMarksCertificate, MarksCertificateData } from "@/utils/generateMarksCertificatePdf";

interface Student {
  id: string;
  student_id: string;
  class_id: string | null;
  user_id: string;
  father_name: string | null;
  admission_date: string;
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

interface Teacher {
  id: string;
  employee_id: string;
  user_id: string;
  profiles: { full_name: string } | null;
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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Certificates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Form fields for different certificates
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [position, setPosition] = useState("");
  const [appreciationType, setAppreciationType] = useState("Good Character & Conduct");
  const [remarks, setRemarks] = useState("");
  const [achievement, setAchievement] = useState("");
  const [examName, setExamName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [sportName, setSportName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [leavingDate, setLeavingDate] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [session, setSession] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [reasonForLeaving, setReasonForLeaving] = useState("");
  const [certificateNumber, setCertificateNumber] = useState(`SLC-${Date.now()}`);
  const [lastClassAttended, setLastClassAttended] = useState("");
  const [conduct, setConduct] = useState("Good");

  const certType = searchParams.get("type") || certificateTypes[0].id;
  const currentCert = certificateTypes.find(c => c.id === certType) || certificateTypes[0];
  const isStaffCert = certType === "experience";

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
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

  const fetchTeachers = async () => {
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, employee_id, user_id")
      .order("employee_id");

    if (teachersData) {
      const userIds = teachersData.map(t => t.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const merged = teachersData.map(t => ({
        ...t,
        profiles: profilesData?.find(p => p.user_id === t.user_id) || null,
      }));
      setTeachers(merged);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select(`id, student_id, class_id, user_id, father_name, admission_date`)
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

  const filteredTeachers = teachers.filter((teacher) => {
    const name = teacher.profiles?.full_name?.toLowerCase() || "";
    const id = teacher.employee_id.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  const handleGenerateCertificate = async (preview = false) => {
    if (isStaffCert) {
      if (!selectedTeacher) {
        toast.error("Please select a staff member first");
        return;
      }
    } else {
      if (!selectedStudent) {
        toast.error("Please select a student first");
        return;
      }
    }

    setGenerating(true);

    try {
      let doc;
      const studentName = selectedStudent?.profiles?.full_name || "";
      const fatherName = selectedStudent?.father_name || "";
      const className = selectedStudent?.classes?.name || "";
      const section = selectedStudent?.classes?.section || "";
      const studentId = selectedStudent?.student_id || "";
      const dateOfBirth = selectedStudent?.profiles?.date_of_birth || "";

      switch (certType) {
        case "participation":
          if (!eventName) {
            toast.error("Please enter event name");
            setGenerating(false);
            return;
          }
          doc = await generateParticipationCertificate({
            studentName, fatherName, className, section, studentId,
            eventName, eventDate, position: position || undefined,
          });
          break;

        case "appreciation":
          doc = await generateAppreciationCertificate({
            studentName, fatherName, className, section, studentId,
            appreciationType, remarks: remarks || undefined,
          });
          break;

        case "dob":
          doc = await generateDOBCertificate({
            studentName, fatherName, className, section, studentId, dateOfBirth,
          });
          break;

        case "honor":
          if (!achievement) {
            toast.error("Please enter achievement");
            setGenerating(false);
            return;
          }
          doc = await generateHonorCertificate({
            studentName, fatherName, className, section, studentId,
            achievement, examName: examName || undefined, percentage: percentage || undefined,
          });
          break;

        case "sports":
          if (!sportName || !eventName || !position) {
            toast.error("Please fill in sport, event and position");
            setGenerating(false);
            return;
          }
          doc = await generateSportsCertificate({
            studentName, fatherName, className, section, studentId,
            sportName, eventName, position, eventDate,
          });
          break;

        case "experience":
          if (!designation || !joiningDate) {
            toast.error("Please fill in designation and joining date");
            setGenerating(false);
            return;
          }
          doc = await generateExperienceCertificate({
            employeeName: selectedTeacher?.profiles?.full_name || "",
            designation,
            department: department || undefined,
            joiningDate,
            leavingDate: leavingDate || undefined,
            remarks: remarks || undefined,
          });
          break;

        case "marks":
          toast.info("Marks Certificate requires exam results. Use Results module for detailed marks.");
          setGenerating(false);
          return;

        case "monthly-progress":
          doc = await generateMonthlyProgressReport({
            studentName, fatherName, className, section, studentId, dateOfBirth,
            month, year,
            teacherRemarks: remarks || undefined,
          });
          break;

        case "annual-progress":
          doc = await generateAnnualProgressReport({
            studentName, fatherName, className, section, studentId, dateOfBirth,
            session,
            teacherRemarks: remarks || undefined,
          });
          break;

        case "slc":
          if (!reasonForLeaving || !leavingDate) {
            toast.error("Please fill in reason for leaving and leaving date");
            setGenerating(false);
            return;
          }
          doc = await generateSLCCertificate({
            studentName, fatherName, className, section, studentId, dateOfBirth,
            admissionDate: selectedStudent?.admission_date || "",
            leavingDate,
            lastClassAttended: lastClassAttended || className,
            reasonForLeaving,
            conduct,
            certificateNumber,
          });
          break;

        default:
          toast.error("Certificate type not implemented");
          setGenerating(false);
          return;
      }

      if (doc) {
        if (preview) {
          const blob = doc.output("blob");
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } else {
          const fileName = isStaffCert
            ? `${certType}-${selectedTeacher?.employee_id}.pdf`
            : `${certType}-${studentId}.pdf`;
          doc.save(fileName);
        }
        toast.success(`${currentCert.label} ${preview ? "opened" : "downloaded"} successfully`);
      }
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate");
    }

    setGenerating(false);
  };

  const renderCertificateFields = () => {
    switch (certType) {
      case "participation":
        return (
          <div className="space-y-3">
            <div>
              <Label>Event Name *</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Annual Sports Day" />
            </div>
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div>
              <Label>Position (Optional)</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="1st, 2nd, 3rd..." />
            </div>
          </div>
        );

      case "appreciation":
        return (
          <div className="space-y-3">
            <div>
              <Label>Appreciation Type</Label>
              <Select value={appreciationType} onValueChange={setAppreciationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good Character & Conduct">Good Character & Conduct</SelectItem>
                  <SelectItem value="Outstanding Performance">Outstanding Performance</SelectItem>
                  <SelectItem value="Excellent Discipline">Excellent Discipline</SelectItem>
                  <SelectItem value="Community Service">Community Service</SelectItem>
                  <SelectItem value="Leadership Qualities">Leadership Qualities</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks (Optional)</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional remarks..." />
            </div>
          </div>
        );

      case "honor":
        return (
          <div className="space-y-3">
            <div>
              <Label>Achievement *</Label>
              <Input value={achievement} onChange={(e) => setAchievement(e.target.value)} placeholder="Top Position in Class" />
            </div>
            <div>
              <Label>Exam Name</Label>
              <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Annual Examination 2024" />
            </div>
            <div>
              <Label>Percentage</Label>
              <Input value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="95.5" />
            </div>
          </div>
        );

      case "sports":
        return (
          <div className="space-y-3">
            <div>
              <Label>Sport Name *</Label>
              <Input value={sportName} onChange={(e) => setSportName(e.target.value)} placeholder="Cricket, Football..." />
            </div>
            <div>
              <Label>Event Name *</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Inter-School Championship" />
            </div>
            <div>
              <Label>Position *</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="1st, 2nd, 3rd..." />
            </div>
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
        );

      case "experience":
        return (
          <div className="space-y-3">
            <div>
              <Label>Select Staff Member</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {filteredTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacher(teacher)}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      selectedTeacher?.id === teacher.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium text-sm">{teacher.profiles?.full_name}</div>
                    <div className="text-xs opacity-70">{teacher.employee_id}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Designation *</Label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Senior Teacher" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Science" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Joining Date *</Label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div>
                <Label>Leaving Date</Label>
                <Input type="date" value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional remarks..." />
            </div>
          </div>
        );

      case "monthly-progress":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Teacher's Remarks</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Student performance remarks..." />
            </div>
          </div>
        );

      case "annual-progress":
        return (
          <div className="space-y-3">
            <div>
              <Label>Session</Label>
              <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="2024-2025" />
            </div>
            <div>
              <Label>Teacher's Remarks</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Annual performance remarks..." />
            </div>
          </div>
        );

      case "slc":
        return (
          <div className="space-y-3">
            <div>
              <Label>Certificate Number</Label>
              <Input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} />
            </div>
            <div>
              <Label>Leaving Date *</Label>
              <Input type="date" value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} />
            </div>
            <div>
              <Label>Last Class Attended</Label>
              <Input value={lastClassAttended} onChange={(e) => setLastClassAttended(e.target.value)} placeholder="Will use current class if empty" />
            </div>
            <div>
              <Label>Reason for Leaving *</Label>
              <Select value={reasonForLeaving} onValueChange={setReasonForLeaving}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transfer to another school">Transfer to another school</SelectItem>
                  <SelectItem value="Family relocation">Family relocation</SelectItem>
                  <SelectItem value="Completed studies">Completed studies</SelectItem>
                  <SelectItem value="Personal reasons">Personal reasons</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conduct</Label>
              <Select value={conduct} onValueChange={setConduct}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Very Good">Very Good</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "dob":
      case "marks":
      default:
        return null;
    }
  };

  return (
    <AdminLayout 
      title={currentCert.label}
      description={currentCert.description}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Selection & Type */}
        <div className="lg:col-span-1 space-y-4">
          {/* Certificate Type Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Certificate Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {certificateTypes.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => setSearchParams({ type: cert.id })}
                    className={`p-2 rounded-lg text-left transition-colors ${
                      certType === cert.id ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-accent"
                    }`}
                  >
                    <cert.icon className="w-4 h-4 mb-1" />
                    <div className="text-xs font-medium leading-tight">{cert.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Student/Staff Selection */}
          {!isStaffCert && (
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
                  <>
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

                    <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
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
                              selectedStudent?.id === student.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                            }`}
                          >
                            <div className="font-medium text-sm">{student.profiles?.full_name}</div>
                            <div className="text-xs opacity-70">{student.student_id}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected Info */}
          {(selectedStudent && !isStaffCert) && (
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
                    <span className="text-muted-foreground">Father:</span>
                    <span className="font-medium">{selectedStudent.father_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class:</span>
                    <span className="font-medium">
                      {selectedStudent.classes?.name} {selectedStudent.classes?.section || ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Certificate Form & Actions */}
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
            <CardContent className="space-y-6">
              {/* Certificate-specific fields */}
              {renderCertificateFields()}

              {/* Action buttons */}
              {(selectedStudent || (isStaffCert && selectedTeacher)) ? (
                <div className="space-y-4">
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm text-center">
                      Certificate will be generated for:{" "}
                      <span className="font-bold">
                        {isStaffCert ? selectedTeacher?.profiles?.full_name : selectedStudent?.profiles?.full_name}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      size="lg"
                      onClick={() => handleGenerateCertificate(false)}
                      disabled={generating}
                      className="gap-2"
                    >
                      <Download className="w-5 h-5" />
                      {generating ? "Generating..." : "Download"}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handleGenerateCertificate(true)}
                      disabled={generating}
                      className="gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {isStaffCert ? "Select a Staff Member" : "Select a Student"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {isStaffCert 
                      ? "Choose a staff member from the list above to generate the certificate"
                      : "Choose a class and select a student to generate the certificate"
                    }
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
