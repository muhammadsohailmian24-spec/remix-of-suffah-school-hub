import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, Bell, LogOut, BookOpen, FileText, Award, Calendar, Clock
} from "lucide-react";

const StudentTimetable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || (roleData as any).role !== "student") { navigate("/dashboard"); return; }

    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const mockTimetable = {
    'Monday': [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Mr. Ahmed', room: '101' },
      { time: '08:45 - 09:30', subject: 'Physics', teacher: 'Dr. Khan', room: '102' },
      { time: '09:45 - 10:30', subject: 'Chemistry', teacher: 'Mrs. Fatima', room: '103' },
      { time: '10:30 - 11:15', subject: 'English', teacher: 'Ms. Sarah', room: '104' },
      { time: '11:30 - 12:15', subject: 'Urdu', teacher: 'Mr. Ali', room: '105' },
      { time: '12:15 - 13:00', subject: 'Islamiat', teacher: 'Maulana Tariq', room: '106' },
    ],
    'Tuesday': [
      { time: '08:00 - 08:45', subject: 'English', teacher: 'Ms. Sarah', room: '104' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Mr. Ahmed', room: '101' },
      { time: '09:45 - 10:30', subject: 'Biology', teacher: 'Dr. Aisha', room: '107' },
      { time: '10:30 - 11:15', subject: 'Physics', teacher: 'Dr. Khan', room: '102' },
      { time: '11:30 - 12:15', subject: 'Computer', teacher: 'Mr. Usman', room: 'Lab 1' },
      { time: '12:15 - 13:00', subject: 'Chemistry', teacher: 'Mrs. Fatima', room: '103' },
    ],
    'Wednesday': [
      { time: '08:00 - 08:45', subject: 'Chemistry', teacher: 'Mrs. Fatima', room: '103' },
      { time: '08:45 - 09:30', subject: 'Urdu', teacher: 'Mr. Ali', room: '105' },
      { time: '09:45 - 10:30', subject: 'Mathematics', teacher: 'Mr. Ahmed', room: '101' },
      { time: '10:30 - 11:15', subject: 'Biology', teacher: 'Dr. Aisha', room: '107' },
      { time: '11:30 - 12:15', subject: 'English', teacher: 'Ms. Sarah', room: '104' },
      { time: '12:15 - 13:00', subject: 'Physics', teacher: 'Dr. Khan', room: '102' },
    ],
    'Thursday': [
      { time: '08:00 - 08:45', subject: 'Physics Lab', teacher: 'Dr. Khan', room: 'Lab 2' },
      { time: '08:45 - 09:30', subject: 'Physics Lab', teacher: 'Dr. Khan', room: 'Lab 2' },
      { time: '09:45 - 10:30', subject: 'English', teacher: 'Ms. Sarah', room: '104' },
      { time: '10:30 - 11:15', subject: 'Mathematics', teacher: 'Mr. Ahmed', room: '101' },
      { time: '11:30 - 12:15', subject: 'Islamiat', teacher: 'Maulana Tariq', room: '106' },
      { time: '12:15 - 13:00', subject: 'Computer', teacher: 'Mr. Usman', room: 'Lab 1' },
    ],
    'Friday': [
      { time: '08:00 - 08:45', subject: 'Juma Prayer', teacher: '-', room: 'Mosque' },
      { time: '14:00 - 14:45', subject: 'Chemistry Lab', teacher: 'Mrs. Fatima', room: 'Lab 3' },
      { time: '14:45 - 15:30', subject: 'Chemistry Lab', teacher: 'Mrs. Fatima', room: 'Lab 3' },
      { time: '15:45 - 16:30', subject: 'Biology', teacher: 'Dr. Aisha', room: '107' },
    ],
    'Saturday': [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Mr. Ahmed', room: '101' },
      { time: '08:45 - 09:30', subject: 'Physics', teacher: 'Dr. Khan', room: '102' },
      { time: '09:45 - 10:30', subject: 'Computer Lab', teacher: 'Mr. Usman', room: 'Lab 1' },
      { time: '10:30 - 11:15', subject: 'Computer Lab', teacher: 'Mr. Usman', room: 'Lab 1' },
    ],
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Mathematics': 'bg-primary/10 border-l-primary',
      'Physics': 'bg-info/10 border-l-info',
      'Chemistry': 'bg-warning/10 border-l-warning',
      'Biology': 'bg-success/10 border-l-success',
      'English': 'bg-purple-100 border-l-purple-500',
      'Urdu': 'bg-orange-100 border-l-orange-500',
      'Computer': 'bg-cyan-100 border-l-cyan-500',
      'Islamiat': 'bg-emerald-100 border-l-emerald-500',
    };
    return colors[subject.split(' ')[0]] || 'bg-muted border-l-muted-foreground';
  };

  const todayIndex = new Date().getDay();
  const todayName = days[todayIndex === 0 ? 5 : todayIndex - 1];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div><h1 className="font-heading text-lg font-bold">The Suffah</h1><p className="text-xs text-muted-foreground">Student Portal</p></div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2"><LogOut className="w-4 h-4" />Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><GraduationCap className="w-5 h-5" />Dashboard</Link>
            <Link to="/student/courses" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><BookOpen className="w-5 h-5" />My Courses</Link>
            <Link to="/student/assignments" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><FileText className="w-5 h-5" />Assignments</Link>
            <Link to="/student/results" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground"><Award className="w-5 h-5" />Results</Link>
            <Link to="/student/timetable" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground"><Calendar className="w-5 h-5" />Timetable</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Class Timetable</h1>
            <p className="text-muted-foreground">Your weekly class schedule</p>
          </div>

          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {days.map((day) => (
                <Card key={day} className={day === todayName ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{day}</CardTitle>
                      {day === todayName && <Badge className="bg-primary text-primary-foreground">Today</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(mockTimetable as any)[day]?.map((slot: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg border-l-4 ${getSubjectColor(slot.subject)}`}>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          {slot.time}
                        </div>
                        <p className="font-medium text-sm">{slot.subject}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{slot.teacher}</span>
                          <Badge variant="outline" className="text-xs">{slot.room}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentTimetable;
