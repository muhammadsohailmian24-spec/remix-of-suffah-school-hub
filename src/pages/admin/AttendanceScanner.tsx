import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/admin/AdminLayout";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, Camera, CameraOff, UserCheck, Clock, AlertCircle, CheckCircle2, History, Power, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ScanRecord {
  id: string;
  visibleId: string;
  studentName: string;
  className: string;
  status: "present" | "late" | "already_marked" | "error";
  timestamp: Date;
  userType: "student" | "teacher";
}

const AttendanceScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [lastScanned, setLastScanned] = useState<ScanRecord | null>(null);
  const [todayStats, setTodayStats] = useState({ present: 0, late: 0, total: 0 });
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected");
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    checkAuth();
    return () => {
      stopScanner();
    };
  }, []);

  // Auto-start scanner when page loads and autoScan is enabled
  useEffect(() => {
    if (!loading && autoScan && !scanning) {
      startScanner();
    }
  }, [loading, autoScan]);

  useEffect(() => {
    if (!loading) {
      fetchTodayStats();
    }
  }, [loading, scanRecords]);

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? "connected" : "disconnected");
    };
    
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);
    
    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "teacher")) {
      navigate("/dashboard");
      return;
    }

    setLoading(false);
  };

  const fetchTodayStats = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("status")
      .eq("date", today);

    if (attendanceData) {
      setTodayStats({
        present: attendanceData.filter(a => a.status === "present").length,
        late: attendanceData.filter(a => a.status === "late").length,
        total: attendanceData.length,
      });
    }
  };

  const startScanner = async () => {
    if (!scannerContainerRef.current || scanning) return;

    try {
      const html5Qrcode = new Html5Qrcode("scanner-container");
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {}
      );

      setScanning(true);
      
      toast({
        title: "Scanner Active",
        description: "Ready to scan ID cards",
      });
    } catch (error: any) {
      console.error("Scanner error:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions or use manual input.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current = null;
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setScanning(false);
  };

  const handleScan = useCallback(async (scannedId: string) => {
    const now = Date.now();
    const lastScanTime = lastScanTimeRef.current[scannedId] || 0;
    
    // Prevent duplicate scans within 3 seconds
    if (now - lastScanTime < 3000) {
      return;
    }
    
    lastScanTimeRef.current[scannedId] = now;
    await markAttendance(scannedId);
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    
    await markAttendance(manualInput.trim());
    setManualInput("");
  };

  const markAttendance = async (scannedId: string) => {
    try {
      // First try to find as student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          user_id,
          class_id
        `)
        .eq("student_id", scannedId)
        .eq("status", "active")
        .maybeSingle();

      if (student) {
        await markStudentAttendance(student, scannedId);
        return;
      }

      // Try to find as teacher by employee_id
      const { data: teacher } = await supabase
        .from("teachers")
        .select(`
          id,
          employee_id,
          user_id
        `)
        .eq("employee_id", scannedId)
        .eq("status", "active")
        .maybeSingle();

      if (teacher) {
        await markTeacherAttendance(teacher);
        return;
      }

      // Not found
      toast({
        title: "Not Found",
        description: `No active student or teacher found with ID: ${scannedId}`,
        variant: "destructive",
      });
      
      playSound(false);
      
      const errorRecord: ScanRecord = {
        id: crypto.randomUUID(),
        visibleId: scannedId,
        studentName: "Unknown",
        className: "-",
        status: "error",
        timestamp: new Date(),
        userType: "student",
      };
      setScanRecords(prev => [errorRecord, ...prev].slice(0, 100));
      
    } catch (error: any) {
      console.error("Attendance error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  const markStudentAttendance = async (student: any, scannedId: string) => {
    // Get student profile and class info
    const [profileRes, classRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", student.user_id).maybeSingle(),
      student.class_id 
        ? supabase.from("classes").select("name, section").eq("id", student.class_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const studentName = profileRes.data?.full_name || "Unknown";
    const className = classRes.data 
      ? `${classRes.data.name}${classRes.data.section ? ` - ${classRes.data.section}` : ""}`
      : "Unassigned";

    const today = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    
    // Check if already marked today
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id, status")
      .eq("student_id", student.id)
      .eq("date", today)
      .maybeSingle();

    if (existingAttendance) {
      playSound(false);
      
      const record: ScanRecord = {
        id: crypto.randomUUID(),
        visibleId: student.student_id,
        studentName,
        className,
        status: "already_marked",
        timestamp: now,
        userType: "student",
      };
      
      setScanRecords(prev => [record, ...prev].slice(0, 100));
      setLastScanned(record);
      
      toast({
        title: "Already Marked",
        description: `${studentName} was already marked ${existingAttendance.status} today`,
      });
      return;
    }

    // Determine if late (after 8:30 AM)
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
    const status = isLate ? "late" : "present";

    // Insert attendance record
    const { error: insertError } = await supabase
      .from("attendance")
      .insert({
        student_id: student.id,
        class_id: student.class_id,
        date: today,
        status,
      });

    if (insertError) {
      throw insertError;
    }

    playSound(true, isLate);

    const record: ScanRecord = {
      id: crypto.randomUUID(),
      visibleId: student.student_id,
      studentName,
      className,
      status,
      timestamp: now,
      userType: "student",
    };

    setScanRecords(prev => [record, ...prev].slice(0, 100));
    setLastScanned(record);

    toast({
      title: isLate ? "Marked Late" : "Marked Present",
      description: `${studentName} (${student.student_id})`,
      className: isLate ? "border-warning" : "border-success",
    });
  };

  const markTeacherAttendance = async (teacher: any) => {
    // Get teacher profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", teacher.user_id)
      .maybeSingle();

    const teacherName = profile?.full_name || "Unknown Teacher";
    const now = new Date();
    
    // For teachers, just log the scan (you can extend this to a teacher_attendance table)
    playSound(true, false);

    const record: ScanRecord = {
      id: crypto.randomUUID(),
      visibleId: teacher.employee_id,
      studentName: teacherName,
      className: "Teacher",
      status: "present",
      timestamp: now,
      userType: "teacher",
    };

    setScanRecords(prev => [record, ...prev].slice(0, 100));
    setLastScanned(record);

    toast({
      title: "Teacher Checked In",
      description: `${teacherName} (${teacher.employee_id})`,
      className: "border-primary",
    });
  };

  const playSound = (success: boolean, isLate: boolean = false) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (!success) {
        oscillator.frequency.value = 200;
        oscillator.type = "square";
      } else if (isLate) {
        oscillator.frequency.value = 400;
        oscillator.type = "sine";
      } else {
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
      }
      
      gainNode.gain.value = 0.15;
      oscillator.start();
      setTimeout(() => oscillator.stop(), success ? 150 : 300);
    } catch (e) {}
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "late": return <Clock className="w-5 h-5 text-warning" />;
      case "error": return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string, userType: string) => {
    if (userType === "teacher") {
      return <Badge className="bg-primary">Teacher</Badge>;
    }
    switch (status) {
      case "present": return <Badge className="bg-success">Present</Badge>;
      case "late": return <Badge className="bg-warning text-warning-foreground">Late</Badge>;
      case "error": return <Badge variant="destructive">Not Found</Badge>;
      default: return <Badge variant="secondary">Already Marked</Badge>;
    }
  };

  const toggleAutoScan = () => {
    if (autoScan) {
      stopScanner();
    }
    setAutoScan(!autoScan);
  };

  if (loading) {
    return (
      <AdminLayout title="Attendance Scanner" description="Scan ID cards to mark attendance">
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Live Attendance Scanner" description="Continuous scanning for student & teacher ID cards">
      {/* Connection Status Bar */}
      <div className={`mb-4 p-2 rounded-lg flex items-center justify-between ${
        connectionStatus === "connected" ? "bg-success/10" : "bg-destructive/10"
      }`}>
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-destructive" />
          )}
          <span className={`text-sm font-medium ${
            connectionStatus === "connected" ? "text-success" : "text-destructive"
          }`}>
            {connectionStatus === "connected" ? "System Online" : "Offline - Reconnecting..."}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              id="auto-scan" 
              checked={autoScan} 
              onCheckedChange={toggleAutoScan}
            />
            <Label htmlFor="auto-scan" className="text-sm cursor-pointer">
              Auto-Scan
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${scanning ? "bg-success animate-pulse" : "bg-muted"}`} />
            <span className="text-sm text-muted-foreground">
              {scanning ? "Scanner Active" : "Scanner Off"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="space-y-6">
          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-2">
                  <UserCheck className="w-5 h-5 text-success" />
                </div>
                <p className="text-2xl font-bold text-success">{todayStats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <p className="text-2xl font-bold text-warning">{todayStats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{todayStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Scanner */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    QR Code Scanner
                  </CardTitle>
                  <CardDescription>
                    Point camera at ID card QR code
                  </CardDescription>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  scanning ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {scanning ? "● LIVE" : "○ STANDBY"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                id="scanner-container" 
                ref={scannerContainerRef}
                className={`w-full aspect-square bg-black overflow-hidden ${!scanning ? 'flex items-center justify-center' : ''}`}
              >
                {!scanning && (
                  <div className="text-center text-white/70 p-8">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Scanner Ready</p>
                    <p className="text-sm opacity-70">
                      {autoScan ? "Starting automatically..." : "Enable Auto-Scan or click Start"}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 flex gap-2">
                {!scanning ? (
                  <Button onClick={startScanner} className="flex-1 hero-gradient text-primary-foreground">
                    <Power className="w-4 h-4 mr-2" />
                    Start Scanner
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="outline" className="flex-1">
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Scanner
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Manual Entry</CardTitle>
              <CardDescription className="text-xs">
                Enter student or teacher ID manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="Enter ID number..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!manualInput.trim()}>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Mark
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Scan History */}
        <Card className="lg:h-[calc(100vh-220px)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Live Scan Feed
            </CardTitle>
            <CardDescription>
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {scanRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for scans...</p>
                  <p className="text-sm">Scan an ID card to see records here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {scanRecords.map((record, index) => (
                    <div 
                      key={record.id} 
                      className={`p-4 flex items-center gap-4 transition-all duration-500 ${
                        index === 0 && lastScanned?.id === record.id 
                          ? 'bg-primary/10 border-l-4 border-primary' 
                          : ''
                      }`}
                    >
                      {getStatusIcon(record.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{record.studentName}</p>
                          {getStatusBadge(record.status, record.userType)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.visibleId} • {record.className}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(record.timestamp, "h:mm:ss a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AttendanceScanner;
