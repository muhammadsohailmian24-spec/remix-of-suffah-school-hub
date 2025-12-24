import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import AdminUsers from "./pages/admin/Users";
import AdminClasses from "./pages/admin/Classes";
import AdminSubjects from "./pages/admin/Subjects";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherAssignments from "./pages/teacher/Assignments";
import TeacherMaterials from "./pages/teacher/Materials";
import StudentCourses from "./pages/student/Courses";
import StudentAssignments from "./pages/student/Assignments";
import StudentResults from "./pages/student/Results";
import StudentTimetable from "./pages/student/Timetable";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admissions" element={<Admissions />} />
          {/* Admin Routes */}
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/subjects" element={<AdminSubjects />} />
          <Route path="/admin/admissions" element={<AdminUsers />} />
          {/* Teacher Routes */}
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/materials" element={<TeacherMaterials />} />
          <Route path="/teacher/results" element={<TeacherAttendance />} />
          {/* Student Routes */}
          <Route path="/student/courses" element={<StudentCourses />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/results" element={<StudentResults />} />
          <Route path="/student/timetable" element={<StudentTimetable />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
