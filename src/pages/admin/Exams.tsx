import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ExamsDashboard from "@/components/admin/exams/ExamsDashboard";
import CreateExamsSection from "@/components/admin/exams/CreateExamsSection";
import ExamSlipsSection from "@/components/admin/exams/ExamSlipsSection";
import EnterMarksSection from "@/components/admin/exams/EnterMarksSection";
import GradingConfigSection from "@/components/admin/exams/GradingConfigSection";

type ExamSection = "dashboard" | "create" | "slips" | "marks" | "grading";

const AdminExams = () => {
  const [currentSection, setCurrentSection] = useState<ExamSection>("dashboard");

  const handleNavigate = (section: "create" | "slips" | "marks" | "grading") => {
    setCurrentSection(section);
  };

  const handleBack = () => {
    setCurrentSection("dashboard");
  };

  const getSectionTitle = () => {
    switch (currentSection) {
      case "create": return "Create Exams";
      case "slips": return "Exam Slips";
      case "marks": return "Enter Marks";
      case "grading": return "Dynamic Grading";
      default: return "Exam Management";
    }
  };

  const getSectionDescription = () => {
    switch (currentSection) {
      case "create": return "Schedule exams with subjects, dates and times";
      case "slips": return "Download roll number slips";
      case "marks": return "Enter student results";
      case "grading": return "Configure grade percentages";
      default: return "Schedule exams, download slips, enter marks, and configure grading";
    }
  };

  return (
    <AdminLayout 
      title={getSectionTitle()} 
      description={getSectionDescription()}
    >
      {currentSection === "dashboard" && (
        <ExamsDashboard onNavigate={handleNavigate} />
      )}
      {currentSection === "create" && (
        <CreateExamsSection onBack={handleBack} />
      )}
      {currentSection === "slips" && (
        <ExamSlipsSection onBack={handleBack} />
      )}
      {currentSection === "marks" && (
        <EnterMarksSection onBack={handleBack} />
      )}
      {currentSection === "grading" && (
        <GradingConfigSection onBack={handleBack} />
      )}
    </AdminLayout>
  );
};

export default AdminExams;
