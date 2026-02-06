import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TeacherTimetable = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEntries, setTodayEntries] = useState<TimetableEntry[]>([]);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!teacher) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("timetable")
      .select(`*, classes(name), subjects(name)`)
      .eq("teacher_id", teacher.id)
      .order("day_of_week")
      .order("start_time");

    const allEntries = (data as TimetableEntry[]) || [];
    setEntries(allEntries);

    const today = new Date().getDay();
    setTodayEntries(allEntries.filter(e => e.day_of_week === today));
    setLoading(false);
  };

  const groupedByDay = entries.reduce((acc, entry) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {} as Record<number, TimetableEntry[]>);

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
            <h1 className="text-2xl font-bold text-foreground">My Timetable</h1>
            <p className="text-muted-foreground">Your teaching schedule</p>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Today's Classes */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today's Classes - {DAYS[new Date().getDay()]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No classes scheduled for today</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {todayEntries.map(entry => (
                  <div key={entry.id} className="bg-background rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-primary">{entry.subjects?.name}</h4>
                        <p className="text-sm text-muted-foreground">{entry.classes?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{entry.start_time} - {entry.end_time}</p>
                        {entry.room_number && <p className="text-xs text-muted-foreground">Room {entry.room_number}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full Week Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No timetable entries found. Contact admin to set up your schedule.</p>
            ) : (
              <div className="space-y-6">
                {[1, 2, 3, 4, 5, 6].map(day => (
                  <div key={day}>
                    <h3 className="font-semibold text-lg mb-3 pb-2 border-b">{DAYS[day]}</h3>
                    {groupedByDay[day]?.length > 0 ? (
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                        {groupedByDay[day].map(entry => (
                          <div key={entry.id} className="bg-muted/50 rounded-lg p-3 border">
                            <div className="font-medium text-sm">{entry.subjects?.name}</div>
                            <div className="text-xs text-muted-foreground">{entry.classes?.name}</div>
                            <div className="text-xs mt-1">{entry.start_time} - {entry.end_time}</div>
                            {entry.room_number && <div className="text-xs text-muted-foreground">Room: {entry.room_number}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No classes</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherTimetable;
