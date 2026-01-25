import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, User, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

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

const PROMOTION_STATUSES: { value: PromotionStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "promoted", label: "Promoted", icon: <ArrowUpRight className="w-4 h-4" />, color: "text-success" },
  { value: "demoted", label: "Demoted", icon: <ArrowDownRight className="w-4 h-4" />, color: "text-destructive" },
  { value: "constant", label: "Constant (Same Class)", icon: <Minus className="w-4 h-4" />, color: "text-warning" },
  { value: "modification", label: "Modification by MIS Feeding", icon: <AlertTriangle className="w-4 h-4" />, color: "text-muted-foreground" },
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
  
  // Selection mode: "class" or "individual"
  const [selectionMode, setSelectionMode] = useState<"class" | "individual">("class");
  
  // For class selection mode
  const [sourceClassId, setSourceClassId] = useState<string>("");
  const [classStudents, setClassStudents] = useState<StudentItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  
  // For individual selection mode
  const [individualStudentId, setIndividualStudentId] = useState<string>("");
  
  // Target settings
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [promotionStatus, setPromotionStatus] = useState<PromotionStatus>("promoted");
  
  // UI state
  const [showStudentList, setShowStudentList] = useState(true);

  useEffect(() => {
    if (open) {
      fetchSessions();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (sourceClassId && selectionMode === "class") {
      fetchClassStudents(sourceClassId);
    } else {
      setClassStudents([]);
      setSelectedStudentIds(new Set());
    }
  }, [sourceClassId, selectionMode]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("academic_years")
      .select("id, name, is_current")
      .order("start_date", { ascending: false });
    
    setSessions(data || []);
    
    // Auto-select current session
    const currentSession = data?.find(s => s.is_current);
    if (currentSession) {
      setTargetSessionId(currentSession.id);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    setLoadingClassStudents(true);
    try {
      const { data: studentsData, error } = await supabase
        .from("students")
        .select("id, student_id, user_id, class_id, status")
        .eq("class_id", classId)
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

      setClassStudents(enrichedStudents);
      // Select all by default
      setSelectedStudentIds(new Set(enrichedStudents.map(s => s.id)));
    } catch (error) {
      console.error("Error fetching class students:", error);
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const resetForm = () => {
    setSelectionMode("class");
    setSourceClassId("");
    setClassStudents([]);
    setSelectedStudentIds(new Set());
    setIndividualStudentId("");
    setTargetClassId("");
    setPromotionStatus("promoted");
    setShowStudentList(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.size === classStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(classStudents.map(s => s.id)));
    }
  };

  const getStudentsToPromote = (): string[] => {
    if (selectionMode === "class") {
      return Array.from(selectedStudentIds);
    } else {
      return individualStudentId ? [individualStudentId] : [];
    }
  };

  const canSubmit = useMemo(() => {
    const hasStudents = getStudentsToPromote().length > 0;
    const hasTarget = targetClassId && targetClassId !== "none";
    const hasSession = !!targetSessionId;
    return hasStudents && hasTarget && hasSession;
  }, [selectionMode, selectedStudentIds, individualStudentId, targetClassId, targetSessionId]);

  const handlePromote = async () => {
    const studentIds = getStudentsToPromote();
    if (studentIds.length === 0) {
      toast({ title: "No Students Selected", description: "Please select at least one student", variant: "destructive" });
      return;
    }

    if (!targetClassId || targetClassId === "none") {
      toast({ title: "No Target Class", description: "Please select a target class", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update all selected students
      const { error } = await supabase
        .from("students")
        .update({ 
          class_id: targetClassId,
        })
        .in("id", studentIds);

      if (error) throw error;

      const statusLabel = PROMOTION_STATUSES.find(s => s.value === promotionStatus)?.label || promotionStatus;
      toast({ 
        title: "Success", 
        description: `${studentIds.length} student(s) ${statusLabel.toLowerCase()} successfully` 
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Promotion error:", error);
      toast({ title: "Error", description: error.message || "Failed to update students", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetClass = classes.find(c => c.id === targetClassId);
  const sourceClass = classes.find(c => c.id === sourceClassId);

  // Get unique sections from classes
  const sections = useMemo(() => {
    const sectionSet = new Set<string>();
    classes.forEach(c => {
      if (c.section) sectionSet.add(c.section);
    });
    return Array.from(sectionSet);
  }, [classes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-primary" />
            Student Promotion / Demotion
          </DialogTitle>
          <DialogDescription>
            Promote, demote, or transfer students to different classes and sessions
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Selection Mode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selection Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={selectionMode === "class" ? "default" : "outline"}
                className={selectionMode === "class" ? "hero-gradient text-primary-foreground" : ""}
                onClick={() => {
                  setSelectionMode("class");
                  setIndividualStudentId("");
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                Whole Class
              </Button>
              <Button
                type="button"
                variant={selectionMode === "individual" ? "default" : "outline"}
                className={selectionMode === "individual" ? "hero-gradient text-primary-foreground" : ""}
                onClick={() => {
                  setSelectionMode("individual");
                  setSourceClassId("");
                  setClassStudents([]);
                  setSelectedStudentIds(new Set());
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Individual Student
              </Button>
            </div>
          </div>

          {/* Source Selection */}
          {selectionMode === "class" ? (
            <div className="space-y-3">
              <Label>Select Source Class</Label>
              <Select value={sourceClassId} onValueChange={setSourceClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class to promote from..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.section ? ` - ${c.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Student List with Checkboxes */}
              {sourceClassId && (
                <div className="border rounded-lg overflow-hidden">
                  <div 
                    className="bg-muted px-4 py-2 flex items-center justify-between cursor-pointer"
                    onClick={() => setShowStudentList(!showStudentList)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={classStudents.length > 0 && selectedStudentIds.size === classStudents.length}
                        onCheckedChange={toggleAllStudents}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-medium text-sm">
                        Students ({selectedStudentIds.size}/{classStudents.length} selected)
                      </span>
                    </div>
                    {showStudentList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  
                  {showStudentList && (
                    <ScrollArea className="max-h-48">
                      {loadingClassStudents ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                        </div>
                      ) : classStudents.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No active students in this class
                        </div>
                      ) : (
                        <div className="divide-y">
                          {classStudents.map(student => (
                            <label
                              key={student.id}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedStudentIds.has(student.id)}
                                onCheckedChange={() => toggleStudentSelection(student.id)}
                              />
                              <span className="font-mono text-xs text-muted-foreground w-16">
                                {student.student_id}
                              </span>
                              <span className="flex-1 text-sm">
                                {student.profile?.full_name || "Unknown"}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Select Student</Label>
              <Select value={individualStudentId} onValueChange={setIndividualStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-mono text-xs mr-2">{s.student_id}</span>
                      {s.profile?.full_name || "Unknown"}
                      {s.class && (
                        <span className="text-muted-foreground ml-2">
                          ({s.class.name}{s.class.section ? ` - ${s.class.section}` : ""})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Settings */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">Promotion Target</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Class *</Label>
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target class" />
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

              <div className="space-y-2">
                <Label>Target Session *</Label>
                <Select value={targetSessionId} onValueChange={setTargetSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.is_current && <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Promotion Status *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PROMOTION_STATUSES.map(status => (
                  <Button
                    key={status.value}
                    type="button"
                    variant={promotionStatus === status.value ? "default" : "outline"}
                    className={`justify-start h-auto py-2 ${promotionStatus === status.value ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setPromotionStatus(status.value)}
                  >
                    <span className={status.color}>{status.icon}</span>
                    <span className="ml-2 text-sm">{status.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          {canSubmit && (
            <div className="bg-accent/50 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-sm">Summary</p>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Students:</span>{" "}
                  <strong>{getStudentsToPromote().length}</strong> student(s)
                </p>
                {selectionMode === "class" && sourceClass && (
                  <p>
                    <span className="text-muted-foreground">From:</span>{" "}
                    <strong>{sourceClass.name}{sourceClass.section ? ` - ${sourceClass.section}` : ""}</strong>
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">To:</span>{" "}
                  <strong>{targetClass?.name}{targetClass?.section ? ` - ${targetClass.section}` : ""}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Session:</span>{" "}
                  <strong>{sessions.find(s => s.id === targetSessionId)?.name}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="outline" className={PROMOTION_STATUSES.find(s => s.value === promotionStatus)?.color}>
                    {PROMOTION_STATUSES.find(s => s.value === promotionStatus)?.label}
                  </Badge>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handlePromote} 
            disabled={!canSubmit || isSubmitting}
            className="hero-gradient text-primary-foreground"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <>
                {PROMOTION_STATUSES.find(s => s.value === promotionStatus)?.icon}
                <span className="ml-2">
                  {promotionStatus === "promoted" ? "Promote" : 
                   promotionStatus === "demoted" ? "Demote" : 
                   promotionStatus === "constant" ? "Keep Constant" : "Update"} Students
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPromotionDialog;
