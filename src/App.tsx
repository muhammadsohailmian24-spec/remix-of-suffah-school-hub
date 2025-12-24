import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentManagement from "./pages/admin/StudentManagement";
import TeacherManagement from "./pages/admin/TeacherManagement";
import ParentManagement from "./pages/admin/ParentManagement";
import AdminClasses from "./pages/admin/Classes";
import AdminSubjects from "./pages/admin/Subjects";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminExams from "./pages/admin/Exams";
import AdminTimetable from "./pages/admin/Timetable";
import AdminDepartments from "./pages/admin/Departments";
import AdmissionManagement from "./pages/admin/AdmissionManagement";
import AnnouncementManagement from "./pages/admin/AnnouncementManagement";
import Reports from "./pages/admin/Reports";
import SystemSettings from "./pages/admin/SystemSettings";
import RolesManagement from "./pages/admin/RolesManagement";
import FeeManagement from "./pages/admin/FeeManagement";
import FeeAnalytics from "./pages/admin/FeeAnalytics";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherAssignments from "./pages/teacher/Assignments";
import TeacherMaterials from "./pages/teacher/Materials";
import TeacherResults from "./pages/teacher/Results";
import TeacherExams from "./pages/teacher/Exams";
import TeacherTimetable from "./pages/teacher/Timetable";
import TeacherAnnouncements from "./pages/teacher/Announcements";
import StudentCourses from "./pages/student/Courses";
import StudentAssignments from "./pages/student/Assignments";
import StudentResults from "./pages/student/Results";
import StudentTimetable from "./pages/student/Timetable";
import StudentFees from "./pages/student/Fees";
import ParentChildren from "./pages/parent/Children";
import ParentAttendance from "./pages/parent/Attendance";
import ParentResults from "./pages/parent/Results";
import ParentAnnouncements from "./pages/parent/Announcements";
import ParentNotificationPreferences from "./pages/parent/NotificationPreferences";
import ParentFees from "./pages/parent/Fees";
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
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<StudentManagement />} />
          <Route path="/admin/teachers" element={<TeacherManagement />} />
          <Route path="/admin/parents" element={<ParentManagement />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/subjects" element={<AdminSubjects />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/exams" element={<AdminExams />} />
          <Route path="/admin/timetable" element={<AdminTimetable />} />
          <Route path="/admin/departments" element={<AdminDepartments />} />
          <Route path="/admin/admissions" element={<AdmissionManagement />} />
          <Route path="/admin/announcements" element={<AnnouncementManagement />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
          <Route path="/admin/roles" element={<RolesManagement />} />
          <Route path="/admin/fees" element={<FeeManagement />} />
          <Route path="/admin/fee-analytics" element={<FeeAnalytics />} />
          {/* Teacher Routes */}
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/materials" element={<TeacherMaterials />} />
          <Route path="/teacher/results" element={<TeacherResults />} />
          <Route path="/teacher/exams" element={<TeacherExams />} />
          <Route path="/teacher/timetable" element={<TeacherTimetable />} />
          <Route path="/teacher/announcements" element={<TeacherAnnouncements />} />
          {/* Student Routes */}
          <Route path="/student/courses" element={<StudentCourses />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/results" element={<StudentResults />} />
          <Route path="/student/timetable" element={<StudentTimetable />} />
          <Route path="/student/fees" element={<StudentFees />} />
          {/* Parent Routes */}
          <Route path="/parent/children" element={<ParentChildren />} />
          <Route path="/parent/attendance/:studentId" element={<ParentAttendance />} />
          <Route path="/parent/results/:studentId" element={<ParentResults />} />
          <Route path="/parent/announcements" element={<ParentAnnouncements />} />
          <Route path="/parent/notifications" element={<ParentNotificationPreferences />} />
          <Route path="/parent/fees/:studentId" element={<ParentFees />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
