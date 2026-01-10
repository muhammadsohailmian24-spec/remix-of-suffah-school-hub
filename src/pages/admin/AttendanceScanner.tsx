import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/admin/AdminLayout";
import { Html5Qrcode } from "html5-qrcode";
import { Scan, Camera, CameraOff, UserCheck, UserX, Clock, AlertCircle, CheckCircle2, History } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScanRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  status: "present" | "late" | "already_marked";
  timestamp: Date;
}

const AttendanceScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [lastScanned, setLastScanned] = useState<ScanRecord | null>(null);
  const [todayStats, setTodayStats] = useState({ present: 0, late: 0, total: 0 });
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTodayStats();
    }
  }, [loading, scanRecords]);

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
    if (!scannerContainerRef.current) return;

    try {
      const html5Qrcode = new Html5Qrcode("scanner-container");
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {}
      );

      setScanning(true);
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

  const handleScan = async (studentId: string) => {
    // Prevent duplicate scans within 2 seconds
    if (lastScanned && lastScanned.studentId === studentId && 
        (new Date().getTime() - lastScanned.timestamp.getTime()) < 2000) {
      return;
    }

    await markAttendance(studentId);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    
    await markAttendance(manualInput.trim());
    setManualInput("");
  };

  const markAttendance = async (studentId: string) => {
    try {
      // Find student by student_id
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          user_id,
          class_id
        `)
        .eq("student_id", studentId)
        .eq("status", "active")
        .maybeSingle();

      if (studentError || !student) {
        toast({
          title: "Student Not Found",
          description: `No active student found with ID: ${studentId}`,
          variant: "destructive",
        });
        
        const errorRecord: ScanRecord = {
          id: crypto.randomUUID(),
          studentId: studentId,
          studentName: "Unknown Student",
          className: "-",
          status: "already_marked",
          timestamp: new Date(),
        };
        setScanRecords(prev => [errorRecord, ...prev].slice(0, 50));
        return;
      }

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
        const record: ScanRecord = {
          id: crypto.randomUUID(),
          studentId: student.student_id,
          studentName,
          className,
          status: "already_marked",
          timestamp: now,
        };
        
        setScanRecords(prev => [record, ...prev].slice(0, 50));
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
          marked_at: now.toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      const record: ScanRecord = {
        id: crypto.randomUUID(),
        studentId: student.student_id,
        studentName,
        className,
        status,
        timestamp: now,
      };

      setScanRecords(prev => [record, ...prev].slice(0, 50));
      setLastScanned(record);

      // Play success sound (optional - uses Web Audio API)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = isLate ? 400 : 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);
      } catch (e) {}

      toast({
        title: isLate ? "Marked Late" : "Marked Present",
        description: `${studentName} (${student.student_id})`,
        className: isLate ? "border-warning" : "border-success",
      });
    } catch (error: any) {
      console.error("Attendance error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "late": return <Clock className="w-5 h-5 text-warning" />;
      default: return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present": return <Badge className="bg-success">Present</Badge>;
      case "late": return <Badge className="bg-warning text-warning-foreground">Late</Badge>;
      default: return <Badge variant="secondary">Already Marked</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Attendance Scanner" description="Scan student barcodes to mark attendance">
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Barcode Attendance Scanner" description="Scan student ID cards to mark attendance">
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
                  <Scan className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{todayStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Scanned</p>
              </CardContent>
            </Card>
          </div>

          {/* Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-primary" />
                Barcode Scanner
              </CardTitle>
              <CardDescription>
                Point camera at student ID card barcode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                id="scanner-container" 
                ref={scannerContainerRef}
                className={`w-full aspect-video bg-muted rounded-lg overflow-hidden mb-4 ${!scanning ? 'flex items-center justify-center' : ''}`}
              >
                {!scanning && (
                  <div className="text-center text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Click "Start Scanner" to begin</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!scanning ? (
                  <Button onClick={startScanner} className="flex-1 hero-gradient text-primary-foreground">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Scanner
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="destructive" className="flex-1">
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Scanner
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Manual Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="Enter Student ID..."
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
        <Card className="lg:h-[calc(100vh-200px)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Scan History
            </CardTitle>
            <CardDescription>
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {scanRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Scan className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No scans yet today</p>
                  <p className="text-sm">Start scanning to see records here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {scanRecords.map((record) => (
                    <div 
                      key={record.id} 
                      className={`p-4 flex items-center gap-4 ${
                        record === lastScanned ? 'bg-primary/5 animate-pulse' : ''
                      }`}
                    >
                      {getStatusIcon(record.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{record.studentName}</p>
                          {getStatusBadge(record.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.studentId} • {record.className}
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
