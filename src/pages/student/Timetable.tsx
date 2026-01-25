import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, LogOut, BookOpen, FileText, Award, Calendar, Clock, ClipboardList
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  subjects: { name: string } | null;
  teachers: { id: string } | null;
  teacherName?: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const StudentTimetable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [className, setClassName] = useState("");

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || roleData.role !== "student") { navigate("/dashboard"); return; }

    // Get student's class
    const { data: student } = await supabase
      .from("students")
      .select("class_id, classes(name)")
      .eq("user_id", session.user.id)
      .single();

    if (!student?.class_id) {
      setLoading(false);
      return;
    }

    setClassName((student.classes as any)?.name || "");

    // Fetch timetable for student's class
    const { data: timetableData, error: timetableError } = await supabase
      .from("timetable")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        room_number,
        subjects(name),
        teachers(id, user_id)
      `)
      .eq("class_id", student.class_id)
      .order("day_of_week")
      .order("start_time");

    console.log("Timetable query for class:", student.class_id, "Result:", timetableData, "Error:", timetableError);

    if (timetableData && timetableData.length > 0) {
      // Fetch teacher names
      const teacherUserIds = [...new Set(timetableData.map((t: any) => t.teachers?.user_id).filter(Boolean))];
      
      let profileMap = new Map<string, string>();
      if (teacherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherUserIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      }

      const entriesWithNames = timetableData.map((entry: any) => ({
        ...entry,
        teacherName: entry.teachers?.user_id ? profileMap.get(entry.teachers.user_id) || "Teacher" : "Teacher"
      }));

      console.log("Timetable entries with names:", entriesWithNames);
      setEntries(entriesWithNames);
    } else {
      console.log("No timetable data found for class:", student.class_id);
    }

    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const todayIndex = new Date().getDay();
  const todayEntries = entries.filter(e => e.day_of_week === todayIndex);

  const groupedByDay = entries.reduce((acc, entry) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {} as Record<number, TimetableEntry[]>);

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Mathematics': 'bg-primary/10 border-l-primary',
      'Physics': 'bg-blue-100 border-l-blue-500 dark:bg-blue-900/30',
      'Chemistry': 'bg-amber-100 border-l-amber-500 dark:bg-amber-900/30',
      'Biology': 'bg-green-100 border-l-green-500 dark:bg-green-900/30',
      'English': 'bg-purple-100 border-l-purple-500 dark:bg-purple-900/30',
      'Urdu': 'bg-orange-100 border-l-orange-500 dark:bg-orange-900/30',
      'Computer': 'bg-cyan-100 border-l-cyan-500 dark:bg-cyan-900/30',
      'Islamiat': 'bg-emerald-100 border-l-emerald-500 dark:bg-emerald-900/30',
    };
    return colors[subject?.split(' ')[0]] || 'bg-muted border-l-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader portalName="Student Portal" onSignOut={handleSignOut} />

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <PortalSidebarLink to="/dashboard" icon={BookOpen} label="Dashboard" isDashboard />
            <PortalSidebarLink to="/student/courses" icon={BookOpen} label="My Courses" />
            <PortalSidebarLink to="/student/assignments" icon={FileText} label="Assignments" />
            <PortalSidebarLink to="/student/exams" icon={ClipboardList} label="Exams" />
            <PortalSidebarLink to="/student/results" icon={Award} label="Results" />
            <PortalSidebarLink to="/student/timetable" icon={Calendar} label="Timetable" isActive />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Class Timetable</h1>
            <p className="text-muted-foreground">{className ? `${className} - Weekly Schedule` : "Your weekly class schedule"}</p>
          </div>

          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Timetable Found</h3>
                <p className="text-muted-foreground">Your class timetable hasn't been set up yet. Contact your administrator.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Today's Classes */}
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Today's Classes - {DAYS[todayIndex]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todayEntries.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No classes scheduled for today</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {todayEntries.map(entry => (
                        <div key={entry.id} className={`p-4 rounded-lg border-l-4 ${getSubjectColor(entry.subjects?.name || '')}`}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            {entry.start_time} - {entry.end_time}
                          </div>
                          <p className="font-medium">{entry.subjects?.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{entry.teacherName}</span>
                            {entry.room_number && <Badge variant="outline" className="text-xs">Room {entry.room_number}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Schedule */}
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((day) => (
                  <Card key={day} className={day === todayIndex ? 'ring-2 ring-primary' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{DAYS[day]}</CardTitle>
                        {day === todayIndex && <Badge className="bg-primary text-primary-foreground">Today</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {groupedByDay[day]?.length > 0 ? (
                        groupedByDay[day].map((entry) => (
                          <div key={entry.id} className={`p-3 rounded-lg border-l-4 ${getSubjectColor(entry.subjects?.name || '')}`}>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <Clock className="w-3 h-3" />
                              {entry.start_time} - {entry.end_time}
                            </div>
                            <p className="font-medium text-sm">{entry.subjects?.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">{entry.teacherName}</span>
                              {entry.room_number && <Badge variant="outline" className="text-xs">{entry.room_number}</Badge>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No classes</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentTimetable;
