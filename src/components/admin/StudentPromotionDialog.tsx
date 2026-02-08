import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClassOption {
  id: string;
  name: string;
  section: string | null;
  grade_level?: number;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface StudentItem {
  id: string;
  student_id: string;
  user_id: string;
  class_id: string | null;
  status: string;
  profile?: {
    full_name: string;
  };
  class?: {
    name: string;
    section: string | null;
  };
}

type PromotionStatus = "promoted" | "demoted" | "constant" | "modification";

interface StudentPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentItem[];
  classes: ClassOption[];
  onSuccess: () => void;
}

const PROMOTION_STATUSES: { value: PromotionStatus; label: string }[] = [
  { value: "promoted", label: "Promoted" },
  { value: "demoted", label: "Demoted" },
  { value: "constant", label: "Constant (Same Class)" },
  { value: "modification", label: "Modification by MIS" },
];

const StudentPromotionDialog = ({
  open,
  onOpenChange,
  students,
  classes,
  onSuccess,
}: StudentPromotionDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessions, setSessions] = useState<AcademicYear[]>([]);
  
  // Left Panel - Single Student State
  const [leftSearchId, setLeftSearchId] = useState("");
  const [leftFilterClass, setLeftFilterClass] = useState<string>("");
  const [leftFilterSession, setLeftFilterSession] = useState<string>("");
  const [leftFilterSection, setLeftFilterSection] = useState<string>("");
  const [leftStudentList, setLeftStudentList] = useState<StudentItem[]>([]);
  const [leftSelectedIds, setLeftSelectedIds] = useState<Set<string>>(new Set());
  const [leftTargetClass, setLeftTargetClass] = useState<string>("");
  const [leftTargetSection, setLeftTargetSection] = useState<string>("");
  const [leftTargetSession, setLeftTargetSession] = useState<string>("");
  const [leftPromotionStatus, setLeftPromotionStatus] = useState<PromotionStatus>("promoted");
  const [leftLoading, setLeftLoading] = useState(false);

  // Right Panel - Bulk State
  const [rightMode, setRightMode] = useState<"byId" | "byClass">("byClass");
  
  // By ID Range
  const [rightIdFrom, setRightIdFrom] = useState("");
  const [rightIdTo, setRightIdTo] = useState("");
  const [rightIdTargetClass, setRightIdTargetClass] = useState<string>("");
  const [rightIdTargetSection, setRightIdTargetSection] = useState<string>("");
  const [rightIdTargetYear, setRightIdTargetYear] = useState<string>("");
  
  // By Class
  const [rightFromClass, setRightFromClass] = useState<string>("");
  const [rightToClass, setRightToClass] = useState<string>("");
  const [rightFromYear, setRightFromYear] = useState<string>("");
  const [rightToYear, setRightToYear] = useState<string>("");
  const [rightFromSection, setRightFromSection] = useState<string>("");
  const [rightToSection, setRightToSection] = useState<string>("");
  const [rightPromotionStatus, setRightPromotionStatus] = useState<PromotionStatus>("promoted");
  
  const [rightStudentList, setRightStudentList] = useState<StudentItem[]>([]);
  const [rightLoading, setRightLoading] = useState(false);

  // Get unique sections
  const sections = useMemo(() => {
    const sectionSet = new Set<string>();
    classes.forEach(c => {
      if (c.section) sectionSet.add(c.section);
    });
    return Array.from(sectionSet);
  }, [classes]);

  useEffect(() => {
    if (open) {
      fetchSessions();
      resetForm();
    }
  }, [open]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("academic_years")
      .select("id, name, is_current")
      .order("start_date", { ascending: false });
    
    setSessions(data || []);
    
    const currentSession = data?.find(s => s.is_current);
    if (currentSession) {
      setLeftTargetSession(currentSession.id);
      setRightIdTargetYear(currentSession.id);
      setRightToYear(currentSession.id);
    }
  };

  const resetForm = () => {
    // Reset left panel
    setLeftSearchId("");
    setLeftFilterClass("");
    setLeftFilterSession("");
    setLeftFilterSection("");
    setLeftStudentList([]);
    setLeftSelectedIds(new Set());
    setLeftTargetClass("");
    setLeftTargetSection("");
    setLeftPromotionStatus("promoted");
    
    // Reset right panel
    setRightMode("byClass");
    setRightIdFrom("");
    setRightIdTo("");
    setRightIdTargetClass("");
    setRightIdTargetSection("");
    setRightFromClass("");
    setRightToClass("");
    setRightFromYear("");
    setRightFromSection("");
    setRightToSection("");
    setRightPromotionStatus("promoted");
    setRightStudentList([]);
  };

  // Left Panel - Search Students
  const handleLeftSearch = async () => {
    setLeftLoading(true);
    try {
      let query = supabase
        .from("students")
        .select("id, student_id, user_id, class_id, status")
        .eq("status", "active");

      if (leftFilterClass) {
        query = query.eq("class_id", leftFilterClass);
      }
      if (leftSearchId) {
        query = query.ilike("student_id", `%${leftSearchId}%`);
      }

      const { data: studentsData, error } = await query.order("student_id");
      if (error) throw error;

      const userIds = studentsData?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const enrichedStudents: StudentItem[] = (studentsData || []).map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id),
      }));

      setLeftStudentList(enrichedStudents);
      setLeftSelectedIds(new Set());
    } catch (error) {
      console.error("Error searching students:", error);
      toast({ title: "Error", description: "Failed to search students", variant: "destructive" });
    } finally {
      setLeftLoading(false);
    }
  };

  // Right Panel - Load Students by ID Range
  const handleRightIdSearch = async () => {
    if (!rightIdFrom || !rightIdTo) {
      toast({ title: "Error", description: "Please enter both From and To Student IDs", variant: "destructive" });
      return;
    }
    
    setRightLoading(true);
    try {
      const { data: studentsData, error } = await supabase
        .from("students")
        .select("id, student_id, user_id, class_id, status")
        .eq("status", "active")
        .gte("student_id", rightIdFrom)
        .lte("student_id", rightIdTo)
        .order("student_id");

      if (error) throw error;

      const userIds = studentsData?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const enrichedStudents: StudentItem[] = (studentsData || []).map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id),
      }));

      setRightStudentList(enrichedStudents);
    } catch (error) {
      console.error("Error fetching students by ID range:", error);
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
    } finally {
      setRightLoading(false);
    }
  };

  // Right Panel - Load Students by Class
  const handleRightClassSearch = async () => {
    if (!rightFromClass) {
      toast({ title: "Error", description: "Please select From Class", variant: "destructive" });
      return;
    }
    
    setRightLoading(true);
    try {
      const { data: studentsData, error } = await supabase
        .from("students")
        .select("id, student_id, user_id, class_id, status")
        .eq("class_id", rightFromClass)
        .eq("status", "active")
        .order("student_id");

      if (error) throw error;

      const userIds = studentsData?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const enrichedStudents: StudentItem[] = (studentsData || []).map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id),
      }));

      setRightStudentList(enrichedStudents);
    } catch (error) {
      console.error("Error fetching class students:", error);
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
    } finally {
      setRightLoading(false);
    }
  };

  // Left Panel - Promote Selected
  const handleLeftPromote = async () => {
    const selectedIds = Array.from(leftSelectedIds);
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one student", variant: "destructive" });
      return;
    }
    if (!leftTargetClass) {
      toast({ title: "Error", description: "Please select target class", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: leftTargetClass })
        .in("id", selectedIds);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `${selectedIds.length} student(s) ${leftPromotionStatus} successfully` 
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Promotion error:", error);
      toast({ title: "Error", description: error.message || "Failed to promote students", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Right Panel - Promote All
  const handleRightPromote = async () => {
    if (rightStudentList.length === 0) {
      toast({ title: "Error", description: "No students to promote", variant: "destructive" });
      return;
    }

    const targetClass = rightMode === "byId" ? rightIdTargetClass : rightToClass;
    if (!targetClass) {
      toast({ title: "Error", description: "Please select target class", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const studentIds = rightStudentList.map(s => s.id);
      
      const { error } = await supabase
        .from("students")
        .update({ class_id: targetClass })
        .in("id", studentIds);

      if (error) throw error;

      const status = rightMode === "byId" ? "promoted" : rightPromotionStatus;
      toast({ 
        title: "Success", 
        description: `${studentIds.length} student(s) ${status} successfully` 
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Bulk promotion error:", error);
      toast({ title: "Error", description: error.message || "Failed to promote students", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLeftStudent = (id: string) => {
    setLeftSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllLeft = () => {
    setLeftSelectedIds(new Set(leftStudentList.map(s => s.id)));
  };

  const deselectAllLeft = () => {
    setLeftSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-primary">
          <DialogTitle className="text-primary-foreground flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" />
            Student Promotion / Demotion
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
            {/* LEFT PANEL - Single/Multiple Student Selection */}
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Promote/Demote Selected Students</h3>
              
              {/* Search by Student ID */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Student-ID</Label>
                  <Input
                    placeholder="Search by ID..."
                    value={leftSearchId}
                    onChange={(e) => setLeftSearchId(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={selectAllLeft} className="h-8 text-xs">
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAllLeft} className="h-8 text-xs">
                  Deselect All
                </Button>
              </div>

              {/* Student List Table */}
              <div className="border rounded-md">
                <ScrollArea className="h-40">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10 h-8 text-xs"></TableHead>
                        <TableHead className="h-8 text-xs">Student ID</TableHead>
                        <TableHead className="h-8 text-xs">Student Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leftStudentList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-4">
                            Use filters below and click Search
                          </TableCell>
                        </TableRow>
                      ) : (
                        leftStudentList.map(student => (
                          <TableRow 
                            key={student.id} 
                            className={leftSelectedIds.has(student.id) ? "bg-primary/10" : ""}
                          >
                            <TableCell className="py-1">
                              <Checkbox
                                checked={leftSelectedIds.has(student.id)}
                                onCheckedChange={() => toggleLeftStudent(student.id)}
                              />
                            </TableCell>
                            <TableCell className="py-1 text-xs font-mono">{student.student_id}</TableCell>
                            <TableCell className="py-1 text-xs">{student.profile?.full_name || "Unknown"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Student Class</Label>
                  <Select value={leftFilterClass} onValueChange={setLeftFilterClass}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.section ? ` - ${c.section}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Session</Label>
                  <Select value={leftFilterSession} onValueChange={setLeftFilterSession}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      {sessions.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Section</Label>
                  <Select value={leftFilterSection} onValueChange={setLeftFilterSection}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleLeftSearch} 
                disabled={leftLoading}
                className="w-full h-8"
                variant="secondary"
              >
                {leftLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Search
              </Button>

              {/* Target Settings */}
              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label className="text-xs">Class to which student is promoted/demoted</Label>
                  <Select value={leftTargetClass} onValueChange={setLeftTargetClass}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Target Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.section ? ` - ${c.section}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">To-Section</Label>
                  <Select value={leftTargetSection} onValueChange={setLeftTargetSection}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">To Session</Label>
                  <Select value={leftTargetSession} onValueChange={setLeftTargetSession}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Promotion Status</Label>
                  <Select value={leftPromotionStatus} onValueChange={(v) => setLeftPromotionStatus(v as PromotionStatus)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleLeftPromote}
                disabled={isSubmitting || leftSelectedIds.size === 0 || !leftTargetClass}
                className="w-full bg-primary"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Promote/Demote ({leftSelectedIds.size} selected)
              </Button>
            </div>

            {/* RIGHT PANEL - Bulk Promotion */}
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Promote/Demote more than one student simultaneously</h3>
              <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Decision about many students simultaneously
              </p>

              {/* Mode Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={rightMode === "byId"} 
                    onChange={() => { setRightMode("byId"); setRightStudentList([]); }}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium underline">By ID</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={rightMode === "byClass"} 
                    onChange={() => { setRightMode("byClass"); setRightStudentList([]); }}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium underline">By class</span>
                </label>
              </div>

              {/* By ID Section */}
              {rightMode === "byId" && (
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Student-ID From</Label>
                      <div className="flex gap-1">
                        <Input 
                          value={rightIdFrom} 
                          onChange={(e) => setRightIdFrom(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="e.g., 001"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <div className="flex gap-1">
                        <Input 
                          value={rightIdTo} 
                          onChange={(e) => setRightIdTo(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="e.g., 050"
                        />
                        <Button size="sm" variant="secondary" onClick={handleRightIdSearch} className="h-8 px-2">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">To Class</Label>
                      <Select value={rightIdTargetClass} onValueChange={setRightIdTargetClass}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}{c.section ? ` - ${c.section}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">To-Section</Label>
                      <Select value={rightIdTargetSection} onValueChange={setRightIdTargetSection}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">To Year</Label>
                    <Select value={rightIdTargetYear} onValueChange={setRightIdTargetYear}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* By Class Section */}
              {rightMode === "byClass" && (
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">From-Class</Label>
                      <Select value={rightFromClass} onValueChange={setRightFromClass}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}{c.section ? ` - ${c.section}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">To-Class</Label>
                      <Select value={rightToClass} onValueChange={setRightToClass}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}{c.section ? ` - ${c.section}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">From-Year</Label>
                      <Select value={rightFromYear} onValueChange={setRightFromYear}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">To-Year</Label>
                      <Select value={rightToYear} onValueChange={setRightToYear}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Promotion Status</Label>
                      <Select value={rightPromotionStatus} onValueChange={(v) => setRightPromotionStatus(v as PromotionStatus)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROMOTION_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">From Section</Label>
                      <Select value={rightFromSection} onValueChange={setRightFromSection}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {sections.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">To-Section</Label>
                      <Select value={rightToSection} onValueChange={setRightToSection}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleRightClassSearch}
                    disabled={rightLoading || !rightFromClass}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    {rightLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Load Students
                  </Button>
                </div>
              )}

              {/* Student Preview Table */}
              <div className="border rounded-md">
                <ScrollArea className="h-32">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="h-8 text-xs">Student ID</TableHead>
                        <TableHead className="h-8 text-xs">Student Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rightStudentList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-4">
                            No record found
                          </TableCell>
                        </TableRow>
                      ) : (
                        rightStudentList.map(student => (
                          <TableRow key={student.id}>
                            <TableCell className="py-1 text-xs font-mono">{student.student_id}</TableCell>
                            <TableCell className="py-1 text-xs">{student.profile?.full_name || "Unknown"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <Button 
                onClick={handleRightPromote}
                disabled={isSubmitting || rightStudentList.length === 0 || (rightMode === "byId" ? !rightIdTargetClass : !rightToClass)}
                className="w-full bg-primary"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Promote/Demote ({rightStudentList.length} students)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPromotionDialog;
