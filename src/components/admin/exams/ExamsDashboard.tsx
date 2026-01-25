import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, FileText, Edit3, Settings2 } from "lucide-react";

interface ExamsDashboardProps {
  onNavigate: (section: "create" | "slips" | "marks" | "grading") => void;
}

const ExamsDashboard = ({ onNavigate }: ExamsDashboardProps) => {
  const actions = [
    {
      id: "create" as const,
      icon: ClipboardList,
      title: "Create Exams",
      description: "Schedule midterm, final, or term exams with subjects, dates, and times",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      id: "slips" as const,
      icon: FileText,
      title: "Exam Slips",
      description: "Download individual or class roll number slips for exams",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    {
      id: "marks" as const,
      icon: Edit3,
      title: "Enter Marks",
      description: "Select paper and enter student results/marks",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      id: "grading" as const,
      icon: Settings2,
      title: "Dynamic Grading",
      description: "Configure grade ranges and pass/fail criteria for DMC",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {actions.map((action) => (
        <Card
          key={action.id}
          className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
          onClick={() => onNavigate(action.id)}
        >
          <CardHeader className="flex flex-row items-center gap-4">
            <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
              <action.icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{action.title}</CardTitle>
              <CardDescription className="mt-1">{action.description}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default ExamsDashboard;
