import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
  teachers: { employee_id: string } | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminTimetable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; employee_id: string; user_id: string }[]>([]);
  const [teacherProfiles, setTeacherProfiles] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: "1",
    start_time: "08:00",
    end_time: "09:00",
    room_number: "",
    subject_id: "",
    teacher_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable();
    }
  }, [selectedClass]);

  const fetchData = async () => {
    const [classesRes, subjectsRes, teachersRes] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("teachers").select("id, employee_id, user_id"),
    ]);

    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTeachers(teachersRes.data || []);

    // Fetch teacher names
    if (teachersRes.data) {
      const profiles: Record<string, string> = {};
      for (const teacher of teachersRes.data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", teacher.user_id)
          .single();
        if (profile) profiles[teacher.id] = profile.full_name;
      }
      setTeacherProfiles(profiles);
    }

    if (classesRes.data && classesRes.data.length > 0) {
      setSelectedClass(classesRes.data[0].id);
    }
    setLoading(false);
  };

  const fetchTimetable = async () => {
    const { data } = await supabase
      .from("timetable")
      .select(`*, classes(name), subjects(name), teachers(employee_id)`)
      .eq("class_id", selectedClass)
      .order("day_of_week")
      .order("start_time");

    setEntries((data as TimetableEntry[]) || []);
  };

  const resetForm = () => {
    setFormData({
      day_of_week: "1",
      start_time: "08:00",
      end_time: "09:00",
      room_number: "",
      subject_id: "",
      teacher_id: "",
    });
    setEditingEntry(null);
  };

  const openEditDialog = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      day_of_week: String(entry.day_of_week),
      start_time: entry.start_time,
      end_time: entry.end_time,
      room_number: entry.room_number || "",
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryData = {
      class_id: selectedClass,
      day_of_week: parseInt(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      room_number: formData.room_number || null,
      subject_id: formData.subject_id,
      teacher_id: formData.teacher_id,
    };

    if (editingEntry) {
      const { error } = await supabase.from("timetable").update(entryData).eq("id", editingEntry.id);
      if (error) {
        toast({ title: "Error", description: "Failed to update entry", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Timetable updated" });
    } else {
      const { error } = await supabase.from("timetable").insert(entryData);
      if (error) {
        toast({ title: "Error", description: "Failed to add entry", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Entry added to timetable" });
    }

    setDialogOpen(false);
    resetForm();
    fetchTimetable();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable entry?")) return;
    await supabase.from("timetable").delete().eq("id", id);
    toast({ title: "Deleted", description: "Entry removed from timetable" });
    fetchTimetable();
  };

  // Get unique time slots from actual entries, sorted
  const timeSlots = [...new Set(entries.map(e => e.start_time))].sort();

  const getEntriesForSlot = (day: number, time: string) => {
    return entries.filter(e => e.day_of_week === day && e.start_time === time);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="Timetable Management" description="Create and manage class schedules">
      <div className="flex items-center justify-end gap-4 mb-6">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Slot</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEntry ? "Edit Slot" : "Add Timetable Slot"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Day</Label>
                      <Select value={formData.day_of_week} onValueChange={(v) => setFormData({ ...formData, day_of_week: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day, i) => <SelectItem key={i} value={String(i)}>{day}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Room</Label>
                      <Input value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} placeholder="e.g., A101" />
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Teacher</Label>
                      <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => <SelectItem key={t.id} value={t.id}>{teacherProfiles[t.id] || t.employee_id}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">{editingEntry ? "Update" : "Add"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Schedule - {classes.find(c => c.id === selectedClass)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-border p-2 bg-muted text-left w-20">Time</th>
                    {DAYS.slice(1, 6).map(day => (
                      <th key={day} className="border border-border p-2 bg-muted text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-border p-8 text-center text-muted-foreground">
                        No slots created yet. Click "Add Slot" to create your first timetable entry.
                      </td>
                    </tr>
                  ) : (
                    timeSlots.map(time => (
                      <tr key={time}>
                        <td className="border border-border p-2 text-sm font-medium bg-muted/50 whitespace-nowrap">
                          {formatTime(time)} to {formatTime(entries.find(e => e.start_time === time)?.end_time || time)}
                        </td>
                        {[1, 2, 3, 4, 5].map(day => {
                          const slotEntries = getEntriesForSlot(day, time);
                          return (
                            <td key={day} className="border border-border p-1 min-w-[140px] h-20 align-top">
                              {slotEntries.map(entry => (
                                <div 
                                  key={entry.id} 
                                  className="bg-primary/10 border border-primary/20 rounded p-1 mb-1 text-xs group relative"
                                >
                                  <div className="font-medium text-primary">{entry.subjects?.name}</div>
                                  <div className="text-muted-foreground">{teacherProfiles[entry.teacher_id]}</div>
                                  <div className="text-muted-foreground text-[10px]">
                                    {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                                  </div>
                                  {entry.room_number && <div className="text-muted-foreground">Room: {entry.room_number}</div>}
                                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex gap-1 bg-background rounded p-1 shadow">
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditDialog(entry)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(entry.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminTimetable;
